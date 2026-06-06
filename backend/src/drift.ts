// Server-side drift detector — compact TS port of sdk/python/cassette/drift.py.
// Used by the GitHub PR merge-gate to decide pass/fail. Must stay behaviourally in sync with the
// Python version (both read the cassette format in SPEC.md).

export type Verdict = "identical" | "benign" | "regression";

export interface DriftResult {
  verdict: Verdict;
  reasons: string[];
  toolCallsChanged: boolean;
  structureChanged: boolean;
  stopReasonChanged: boolean;
  textChanged: boolean;
}

interface Behavior {
  text: string;
  toolCalls: Array<{ name: string; arguments: unknown }>;
  stopReason: string | null;
  structured: unknown | null;
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function normTool(name: string, args: unknown): { name: string; arguments: unknown } {
  if (typeof args === "string") {
    const parsed = tryParse(args);
    if (parsed !== undefined) args = parsed;
  }
  return { name, arguments: args };
}

export function extractBehavior(body: string): Behavior {
  const data = tryParse(body);
  if (data === undefined || typeof data !== "object" || data === null) {
    return { text: body ?? "", toolCalls: [], stopReason: null, structured: null };
  }
  const d = data as Record<string, any>;
  let text = "";
  const toolCalls: Array<{ name: string; arguments: unknown }> = [];
  let stop: string | null = null;

  if (Array.isArray(d.choices)) {
    const msg = d.choices[0]?.message ?? {};
    text = msg.content ?? "";
    for (const tc of msg.tool_calls ?? []) {
      toolCalls.push(normTool(tc.function?.name ?? "", tc.function?.arguments));
    }
    stop = d.choices[0]?.finish_reason ?? null;
  } else if (Array.isArray(d.content)) {
    const parts: string[] = [];
    for (const block of d.content) {
      if (block.type === "text") parts.push(block.text ?? "");
      else if (block.type === "tool_use") toolCalls.push(normTool(block.name ?? "", block.input));
    }
    text = parts.join("");
    stop = d.stop_reason ?? null;
  } else {
    return { text: body, toolCalls: [], stopReason: null, structured: d };
  }

  const structured = text ? tryParse(text) ?? null : null;
  return { text, toolCalls, stopReason: stop, structured };
}

function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.length ? [shape(v[0])] : ["<list>"];
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) out[k] = shape((v as any)[k]);
    return out;
  }
  return typeof v;
}

const j = (x: unknown) => JSON.stringify(x);

/** Optional semantic judge: returns true if the MEANING of the two texts diverged. */
export type SemanticJudge = (oldText: string, newText: string) => Promise<boolean>;

export async function compare(
  oldBody: string,
  newBody: string,
  judge?: SemanticJudge,
): Promise<DriftResult> {
  const res: DriftResult = {
    verdict: "benign",
    reasons: [],
    toolCallsChanged: false,
    structureChanged: false,
    stopReasonChanged: false,
    textChanged: false,
  };
  if (oldBody === newBody) return { ...res, verdict: "identical", reasons: ["byte-identical"] };

  const a = extractBehavior(oldBody);
  const b = extractBehavior(newBody);

  if (j(a.toolCalls) !== j(b.toolCalls)) {
    res.toolCallsChanged = true;
    res.verdict = "regression";
    res.reasons.push(`tool calls changed: ${j(a.toolCalls)} -> ${j(b.toolCalls)}`);
  }
  if (a.structured !== null || b.structured !== null) {
    if (j(shape(a.structured)) !== j(shape(b.structured))) {
      res.structureChanged = true;
      res.verdict = "regression";
      res.reasons.push("structured-output shape changed");
    }
  }
  if (a.stopReason !== b.stopReason) {
    res.stopReasonChanged = true;
    res.verdict = "regression";
    res.reasons.push(`stop reason changed: ${a.stopReason} -> ${b.stopReason}`);
  }
  if (a.text !== b.text) {
    res.textChanged = true;
    if (res.verdict !== "regression") {
      if (judge && (await judge(a.text, b.text))) {
        res.verdict = "regression";
        res.reasons.push("semantic judge: answer meaning changed materially");
      } else {
        res.reasons.push("free-text wording changed (treated as benign non-determinism)");
      }
    }
  }
  if (res.reasons.length === 0) res.reasons.push("non-behavioral difference only");
  return res;
}
