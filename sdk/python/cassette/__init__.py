"""Cassette — optional one-call Python shim.

You don't strictly need this: setting OPENAI_BASE_URL / ANTHROPIC_BASE_URL to the gateway URL is
enough. This wrapper just composes those URLs from CASSETTE_* env vars and covers every provider at
once, so a single `cassette.use()` call wires the whole test process.

    import cassette
    cassette.use()            # reads CASSETTE_GATEWAY / CASSETTE_PROJECT / CASSETTE_MODE
    # ...all OpenAI/Anthropic/Google SDK calls now route through the gateway

Env vars:
    CASSETTE_GATEWAY   default http://localhost:8787
    CASSETTE_PROJECT   default "default"
    CASSETTE_MODE      record | replay | auto   (default "auto")
"""
from __future__ import annotations

import os

__all__ = ["use", "base_url"]

_PROVIDER_SUFFIX = {
    "openai": "/openai/v1",
    "anthropic": "/anthropic",
    "google": "/google",
}


def base_url(provider: str, *, gateway: str | None = None, project: str | None = None,
             mode: str | None = None) -> str:
    """Return the gateway base URL for a provider, e.g. for manual client construction."""
    gateway = (gateway or os.environ.get("CASSETTE_GATEWAY", "http://localhost:8787")).rstrip("/")
    project = project or os.environ.get("CASSETTE_PROJECT", "default")
    mode = mode or os.environ.get("CASSETTE_MODE", "auto")
    if provider not in _PROVIDER_SUFFIX:
        raise ValueError(f"unknown provider {provider!r}; known: {list(_PROVIDER_SUFFIX)}")
    return f"{gateway}/{project}/{mode}{_PROVIDER_SUFFIX[provider]}"


def use(*, gateway: str | None = None, project: str | None = None, mode: str | None = None) -> dict:
    """Point the standard SDK base-URL env vars at the Cassette gateway.

    Returns the mapping it set, for logging/inspection. Idempotent.
    """
    env_map = {
        "OPENAI_BASE_URL": base_url("openai", gateway=gateway, project=project, mode=mode),
        "ANTHROPIC_BASE_URL": base_url("anthropic", gateway=gateway, project=project, mode=mode),
        "GOOGLE_GEMINI_BASE_URL": base_url("google", gateway=gateway, project=project, mode=mode),
    }
    os.environ.update(env_map)
    return env_map
