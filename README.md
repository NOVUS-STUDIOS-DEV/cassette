# Cassette 🎞️

**The Codecov of agent behavior.** Record your LLM/agent API calls once; replay them in CI so tests
run **fast, deterministic, and free** — then catch *behavioral regressions* on every PR with a
shared team registry and a merge-gate that goes red when your agent's behavior drifts.

Platform-neutral by design: works regardless of your CI, cloud, or model vendor — and never asks you
to hand your deploy pipeline **and** your model traffic to the same company.

> **Strategy note (post-validation):** the recording layer is a generous, permissively-licensed
> loss-leader. The product — and the moat — is the **hosted shared registry + CI merge-gating +
> cross-org semantic-drift intelligence**. See `STRATEGY.md` for why the gateway is *not* the
> product.

## How recording works (recorder-first, no gateway required)

Cassette records at the HTTP-client layer **inside your test process** — no proxy, no extra infra in
CI, nothing to self-host-around:

```python
from cassette.recorder import http_client
from openai import OpenAI

client = OpenAI(http_client=http_client(project="demo"))   # record → replay locally
```

```
  record:  test ─> SDK ─> [cassette transport] ─> model API     (stores a cassette)
  replay:  test ─> SDK ─> [cassette transport] ─> local cassette  (free, instant, deterministic)
  auto:    replay if a cassette exists, else record   ← fails SAFE: a miss just re-records
```

Cassettes are a portable, documented file format (`SPEC.md`) — the ".har of agent test traffic" —
with one-way importers from `vcrpy` / `pytest-recording` / `nock` / `MSW`. **We own the format, not
the proxy.**

## What you pay for (the hosted backend — Phase 2)

The free recorder is genuinely useful solo. Teams pay for what a self-hosted shim **cannot** cheaply
replicate:

- **Shared team registry** with RBAC and an immutable audit trail (who blessed which behavior change),
  tied to a **GitHub App identity**.
- **GitHub Checks merge-gate** that turns red on **semantic drift** (changed tool calls, JSON shape,
  answer meaning — not byte-diff), with inline approve/reject diff review.
- **Cross-org semantic matcher** trained on the privacy-scrubbed, opt-in aggregate cassette graph —
  better than any lone self-hoster's matcher can ever be, and it compounds with every free user.

**Pricing is per-seat + CI merge-gating. Storage/bandwidth are generously included.** Deliberate:
self-hosting must be a *capability downgrade*, never a cost saving.

## The optional gateway (one ingest transport, not the product)

For polyglot stacks or languages without an in-process shim, a Cloudflare Worker can proxy via one
env var. It's **optional** — the registry, merge-gate, and drift logic never depend on traffic
flowing through it.

```bash
# format: https://<gateway>/<project>/<mode>/<provider>/<...native path>
export OPENAI_BASE_URL="https://gw.cassette.dev/myproj/auto/openai/v1"
```

> ⚠️ Cloudflare Workers' **free** tier (50ms wall-clock) can't proxy LLM latency — the gateway needs
> the $5/mo paid plan. Another reason the recorder, not the gateway, is the default.

## Layout

| Path | What | Layer |
|------|------|-------|
| `sdk/python/cassette/recorder.py` | In-process record/replay (the surface we own) | OSS client |
| `sdk/python/cassette/__init__.py` | Optional gateway-URL shim | OSS client |
| `sdk/typescript/` | TS/JS shim (+ in-process plugin: Phase 1 todo) | OSS client |
| `gateway/` | Optional Cloudflare Worker transport | OSS client |
| `SPEC.md` | Portable cassette file format v0 | format |
| *hosted backend* | Registry, RBAC, GitHub Checks, matcher | **paid — Phase 2** |

## Quickstart

```bash
pip install openai httpx
pip install -e sdk/python
export OPENAI_API_KEY="sk-..."          # first run only
python examples/python/test_example.py  # records to ./.cassettes
python examples/python/test_example.py  # replays free
```

## Status

**Phase 1 (this scaffold):** in-process recorder (Python), portable file format + fingerprinting,
optional gateway transport, multi-provider URL shims. Architectural boundary drawn now: **OSS client
shim** (records standalone, permissive license) vs **hosted backend** (a client-server layer on top
of the format). See `STRATEGY.md`.

**Deferred to Phase 2–3 (intentionally):** hosted shared registry + RBAC, GitHub Checks merge-gate &
diff-review UX, semantic-drift classifier + cross-org corpus harvesting, TS in-process plugin,
provider matrix beyond OpenAI/Anthropic, SSO/compliance.
