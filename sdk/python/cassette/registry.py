"""Registry client — sync local cassettes to/from the hosted team registry (the paid layer).

The OSS recorder works fully offline; this is the opt-in bridge that pushes a CI run's cassettes to
the shared registry so the GitHub merge-gate can compare them. Requires a seat token.

    from cassette.registry import push_dir
    push_dir(".cassettes/demo", project="acme/app", ref="pr-42", token="...")
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore


def _base() -> str:
    return os.environ.get("CASSETTE_BACKEND", "https://api.cassette.dev").rstrip("/")


def push_dir(cassette_dir: str, *, project: str, ref: str, token: Optional[str] = None) -> int:
    """Upload every cassette in a local dir to the registry under <project>/<ref>. Returns count."""
    if httpx is None:
        raise RuntimeError("cassette.registry requires httpx")
    token = token or os.environ.get("CASSETTE_TOKEN")
    if not token:
        raise RuntimeError("no seat token (set CASSETTE_TOKEN)")
    items = []
    for f in Path(cassette_dir).rglob("*.json"):
        rec = json.loads(f.read_text())
        items.append({"fingerprint": rec.get("fingerprint", f.stem), "body": json.dumps(rec)})
    if not items:
        return 0
    resp = httpx.post(
        f"{_base()}/v1/{project}/cassettes",
        params={"ref": ref},
        headers={"authorization": f"Bearer {token}"},
        json=items,
        timeout=30,
    )
    resp.raise_for_status()
    return int(resp.json().get("pushed", 0))
