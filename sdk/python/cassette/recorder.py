"""In-process recorder — the recording surface Cassette OWNS (no gateway required).

This is the strategic core after the moat inversion: recording must NOT depend on routing traffic
through a gateway, because a gateway VCR is a commodity an incumbent can bundle and a customer can
self-host. Here we record at the HTTP-client layer inside the test process itself.

    from cassette.recorder import http_client
    from openai import OpenAI

    client = OpenAI(http_client=http_client(project="demo"))   # records/replays locally
    # ...calls now hit local cassettes; no gateway, no extra infra in CI

Modes (env CASSETTE_MODE): record | replay | auto (default auto).
Local cassette dir (env CASSETTE_DIR): default ./.cassettes

The local cassette files conform to SPEC.md (the portable ".har of agent test traffic"). The hosted
backend (shared registry, RBAC, GitHub Checks merge-gate, semantic-drift matcher) is a CLIENT-SERVER
layer ON TOP of this format — never a precondition for recording. That boundary is the whole moat.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Optional

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore

_VOLATILE = {"stream_options", "user", "metadata"}
_DROP_RESP_HEADERS = {"content-length", "content-encoding", "transfer-encoding", "connection"}


class CassetteMiss(RuntimeError):
    """Raised in replay mode when no cassette exists for a request (fails SAFE, never silently)."""


def _canonical(value: object) -> str:
    if value is None or not isinstance(value, (dict, list)):
        return json.dumps(value)
    if isinstance(value, list):
        return "[" + ",".join(_canonical(v) for v in value) + "]"
    keys = sorted(k for k in value if k not in _VOLATILE)
    return "{" + ",".join(json.dumps(k) + ":" + _canonical(value[k]) for k in keys) + "}"


def fingerprint(method: str, url: str, body: str) -> str:
    norm = body
    if body:
        try:
            norm = _canonical(json.loads(body))
        except (ValueError, TypeError):
            pass
    return hashlib.sha256("\n".join([method.upper(), url, norm]).encode()).hexdigest()


if httpx is not None:

    class CassetteTransport(httpx.BaseTransport):
        """An httpx transport that records to / replays from local cassette files."""

        def __init__(self, inner: httpx.BaseTransport, cassette_dir: Path, mode: str):
            self._inner = inner
            self._dir = cassette_dir
            self._mode = mode
            self._dir.mkdir(parents=True, exist_ok=True)

        def handle_request(self, request: "httpx.Request") -> "httpx.Response":
            body = request.content.decode("utf-8", "ignore")
            fp = fingerprint(request.method, str(request.url), body)
            path = self._dir / f"{fp}.json"

            if self._mode in ("replay", "auto") and path.exists():
                rec = json.loads(path.read_text())
                headers = {k: v for k, v in rec["response"]["headers"].items()
                           if k.lower() not in _DROP_RESP_HEADERS}
                headers["x-cassette"] = "replay"
                return httpx.Response(
                    rec["response"]["status"], headers=headers,
                    content=rec["response"]["body"].encode(), request=request,
                )
            if self._mode == "replay":
                raise CassetteMiss(f"no cassette for {request.method} {request.url} (fp={fp[:12]})")

            # record (or auto-miss → fails SAFE: just records)
            resp = self._inner.handle_request(request)
            content = resp.read()
            if resp.status_code < 400:
                path.write_text(json.dumps({
                    "v": 1,
                    "fingerprint": fp,
                    "request": {"method": request.method, "url": str(request.url), "body": body},
                    "response": {
                        "status": resp.status_code,
                        "headers": dict(resp.headers),
                        "body": content.decode("utf-8", "ignore"),
                    },
                }, indent=2))
            return httpx.Response(resp.status_code, headers=resp.headers, content=content,
                                  request=request)


def http_client(*, project: Optional[str] = None, mode: Optional[str] = None,
                cassette_dir: Optional[str] = None) -> "httpx.Client":
    """Build an httpx.Client that records/replays locally — pass to OpenAI(http_client=...)."""
    if httpx is None:
        raise RuntimeError("cassette.recorder requires httpx (pip install httpx)")
    project = project or os.environ.get("CASSETTE_PROJECT", "default")
    mode = mode or os.environ.get("CASSETTE_MODE", "auto")
    base = Path(cassette_dir or os.environ.get("CASSETTE_DIR", ".cassettes")) / project
    transport = CassetteTransport(httpx.HTTPTransport(), base, mode)
    return httpx.Client(transport=transport)
