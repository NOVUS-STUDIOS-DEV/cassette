# Cassette File Format v0

> The portable **".har of agent test traffic"**. Owning the *format* outlives owning the proxy — it
> is the convergence point even if someone else's recorder wins.

A cassette is one recorded LLM/agent interaction, stored as a single JSON file named
`<sha256-fingerprint>.json`. The format is permissively licensed and intended for cross-tool
interop; one-way importers from `vcrpy`, `pytest-recording`, `nock`, and `MSW` map into it.

```jsonc
{
  "v": 1,
  "fingerprint": "9f2c…",          // sha256(method \n url \n canonicalized-body)
  "request": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "body": "{…}"                   // verbatim request body (JSON for chat APIs)
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "application/json", … },  // secrets stripped
    "body": "{…}"
  },
  "recordedAt": "2026-06-06T12:00:00Z"  // optional
}
```

## Fingerprinting (canonicalization)

The fingerprint is content-addressed over a **canonicalized** request so logically-identical calls
collide deterministically:

1. Parse the body as JSON when possible.
2. Sort object keys recursively.
3. Drop volatile fields that don't change meaning: `stream_options`, `user`, `metadata`.
4. `sha256( METHOD \n URL \n canonical-body )`.

This deliberately **fails safe**: any meaningful change to the request changes the fingerprint, so
in `auto` mode the cassette simply misses and re-records — never a wrong replay, never a side effect.

## Conformance

Both implementations write/read this format identically:
- `gateway/` (Cloudflare Worker transport) — `src/types.ts`, `src/match.ts`
- `sdk/python/cassette/recorder.py` (in-process transport)

## Roadmap (not in v0)

- `semanticHash` alongside `fingerprint` — drift detection on tool-call shape / answer semantics.
- `redactions[]` — declarative PII scrubbing record for opt-in cross-org corpus contribution.
- `lineage` — the blessed-by / approved-in-PR audit chain (lives in the hosted backend, references
  the file fingerprint).
