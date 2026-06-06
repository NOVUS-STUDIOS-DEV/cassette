"""Drift detection — the "did it REALLY break?" engine. This is the moat.

A byte-diff is useless for LLM output: the model rewording an answer is NOT a regression, but a
changed tool call, a changed JSON shape, or a truncated response IS. This module classifies the
difference between two recorded responses into:

    IDENTICAL    — same bytes
    BENIGN       — only free-text wording changed; structure & behavior identical (non-determinism)
    REGRESSION   — behavior changed: tool calls, structured output shape, or stop reason differ

It is provider-aware (OpenAI + Anthropic chat shapes) and falls back to a generic JSON/text diff.
An optional `semantic_judge` hook can UPGRADE a benign text change to a regression when the meaning
diverges (embedding distance or an LLM judge) — that hook, trained on the cross-org corpus, is the
part competitors can't cheaply copy. Default behavior is conservative and deterministic.

Design rule (fail safe): when unsure whether a text-only change matters, default to BENIGN so the
gate doesn't cry wolf — but ALWAYS surface the diff so a human can bless or reject it. The gate
informs; it never silently decides.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


class Verdict(str, Enum):
    IDENTICAL = "identical"
    BENIGN = "benign"        # wording-only drift; behavior unchanged
    REGRESSION = "regression"  # behavior changed — block the merge pending review


@dataclass
class DriftResult:
    verdict: Verdict
    reasons: list[str] = field(default_factory=list)
    # structured behavioral signals, useful for the PR-check diff UI
    tool_calls_changed: bool = False
    structure_changed: bool = False
    stop_reason_changed: bool = False
    text_changed: bool = False

    @property
    def is_regression(self) -> bool:
        return self.verdict == Verdict.REGRESSION


# A semantic judge takes (old_text, new_text) and returns True if the MEANING changed materially.
SemanticJudge = Callable[[str, str], bool]


# --- provider-aware extraction of the BEHAVIORAL signal from a response body ---

@dataclass
class Behavior:
    text: str
    tool_calls: list  # normalized [{name, arguments}]
    stop_reason: Optional[str]
    structured: Optional[object]  # parsed JSON if the text itself is JSON (structured output)


def _normalize_tool_call(name: str, arguments) -> dict:
    # arguments may be a JSON string (OpenAI) or a dict (Anthropic input) — canonicalize to a dict
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except (ValueError, TypeError):
            pass
    return {"name": name, "arguments": arguments}


def extract_behavior(body: str, provider: str = "") -> Behavior:
    try:
        data = json.loads(body)
    except (ValueError, TypeError):
        return Behavior(text=body or "", tool_calls=[], stop_reason=None, structured=None)

    text, tool_calls, stop = "", [], None

    # OpenAI chat completions
    if isinstance(data, dict) and "choices" in data:
        choice = (data.get("choices") or [{}])[0]
        msg = choice.get("message", {}) if isinstance(choice, dict) else {}
        text = msg.get("content") or ""
        for tc in msg.get("tool_calls") or []:
            fn = tc.get("function", {})
            tool_calls.append(_normalize_tool_call(fn.get("name", ""), fn.get("arguments")))
        stop = choice.get("finish_reason")

    # Anthropic messages
    elif isinstance(data, dict) and "content" in data and isinstance(data["content"], list):
        parts = []
        for block in data["content"]:
            if block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif block.get("type") == "tool_use":
                tool_calls.append(_normalize_tool_call(block.get("name", ""), block.get("input")))
        text = "".join(parts)
        stop = data.get("stop_reason")

    # generic fallback: treat the whole JSON as the structured payload
    else:
        return Behavior(text=body, tool_calls=[], stop_reason=None, structured=data)

    structured = None
    if text:
        try:
            structured = json.loads(text)  # the model was asked for JSON output
        except (ValueError, TypeError):
            pass
    return Behavior(text=text, tool_calls=tool_calls, stop_reason=stop, structured=structured)


def _shape(value: object) -> object:
    """Recursive type/key skeleton of a JSON value (ignores leaf values)."""
    if isinstance(value, dict):
        return {k: _shape(value[k]) for k in sorted(value)}
    if isinstance(value, list):
        return ["<list>"] if not value else [_shape(value[0])]
    return type(value).__name__


def compare(old_body: str, new_body: str, *, provider: str = "",
            semantic_judge: Optional[SemanticJudge] = None) -> DriftResult:
    """Classify the drift between two recorded response bodies."""
    if old_body == new_body:
        return DriftResult(Verdict.IDENTICAL, ["byte-identical"])

    a, b = extract_behavior(old_body, provider), extract_behavior(new_body, provider)
    res = DriftResult(Verdict.BENIGN)

    # 1) tool calls — the strongest behavioral signal
    if a.tool_calls != b.tool_calls:
        res.tool_calls_changed = True
        res.verdict = Verdict.REGRESSION
        res.reasons.append(f"tool calls changed: {a.tool_calls!r} -> {b.tool_calls!r}")

    # 2) structured-output shape (the model was asked for JSON)
    if a.structured is not None or b.structured is not None:
        if _shape(a.structured) != _shape(b.structured):
            res.structure_changed = True
            res.verdict = Verdict.REGRESSION
            res.reasons.append("structured-output shape changed")

    # 3) stop / finish reason (e.g. 'stop' -> 'length' means truncation)
    if a.stop_reason != b.stop_reason:
        res.stop_reason_changed = True
        res.verdict = Verdict.REGRESSION
        res.reasons.append(f"stop reason changed: {a.stop_reason} -> {b.stop_reason}")

    # 4) free text — benign by default (non-determinism), unless a semantic judge disagrees
    if a.text != b.text:
        res.text_changed = True
        if res.verdict != Verdict.REGRESSION:
            if semantic_judge is not None and semantic_judge(a.text, b.text):
                res.verdict = Verdict.REGRESSION
                res.reasons.append("semantic judge: answer meaning changed materially")
            else:
                res.reasons.append("free-text wording changed (treated as benign non-determinism)")

    if not res.reasons:
        res.reasons.append("non-behavioral difference only")
    return res


def compare_cassette_files(path_a: str, path_b: str,
                           semantic_judge: Optional[SemanticJudge] = None) -> DriftResult:
    """Compare two cassette JSON files (the blessed baseline vs a PR's recording)."""
    with open(path_a) as fa, open(path_b) as fb:
        ca, cb = json.load(fa), json.load(fb)
    provider = ca.get("request", {}).get("provider", "")
    return compare(ca["response"]["body"], cb["response"]["body"],
                   provider=provider, semantic_judge=semantic_judge)
