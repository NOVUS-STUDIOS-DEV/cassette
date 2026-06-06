# Cassette Backend — the paid team layer (Phase 2)

This is what teams pay for. The OSS recorder is free and works offline; this backend adds the things
a self-hosted shim can't cheaply replicate: a **shared cassette registry**, an **audit trail**, and
the **GitHub PR merge-gate** that runs the drift detector server-side.

## Flow

```
 CI run (PR branch)
   └─ records cassettes ──> cassette.registry.push_dir(..., ref="pr-42")  ──> POST /v1/:project/cassettes
                                                                                      │
 GitHub PR opened ──> webhook /webhooks/github ──> evaluatePr():                       │
   for each cassette: compare(blessed baseline, PR recording) via drift.ts ───────────┘
   regression?  ──> Check Run "cassette / agent-behavior" = action_required (RED, blocks merge)
   clean?       ──> Check Run = success (green)
 human reviews drift, approves ──> POST /v1/:project/bless?from=pr-42 ──> promotes to blessed baseline
```

The merge-gate is deliberately **fail-safe and advisory-but-blocking**: it never auto-blesses; a
human approves behavior changes, and every bless is written to the immutable `cassette_log`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/:project/cassettes?ref=` | push CI recordings (seat token) |
| GET | `/v1/:project/cassettes?ref=` | list fingerprints |
| GET | `/v1/:project/cassettes/:fp?ref=` | pull one cassette |
| POST | `/v1/:project/bless?from=` | promote a PR's cassettes to the blessed baseline |
| POST | `/webhooks/github` | GitHub App: run the merge-gate |

## Setup

```bash
npm install
npx wrangler r2 bucket create cassette-registry
npx wrangler d1 create cassette-db        # paste the id into wrangler.toml
npm run db:init                            # apply schema.sql
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
npx wrangler secret put GITHUB_WEBHOOK_SECRET
npm run dev
```

## Billing model (see ../PRICING.md)

Seats = active committers whose gated PRs run through the merge-gate. Storage/bandwidth are
generously included and **never** metered (bytes are ~0.002% of the bill — metering them would just
teach customers to self-host). The seat check lives in `src/index.ts: authSeat`.

## What's real vs stubbed in this scaffold

**Real:** routing, registry read/write to R2, the audit log, PR evaluation, the drift detector
(`src/drift.ts`, behaviourally in sync with the Python version), check-run conclusion logic.

**Stubbed (wire before launch, marked TODO in code):**
- GitHub App JWT signing + installation-token exchange (`src/github.ts: getInstallationToken`)
- Webhook HMAC signature verification (`X-Hub-Signature-256`)
- Seat provisioning / Stripe sync (rows in the `seats` table)
- The Enterprise cross-org semantic matcher as the `semanticJudge` passed into `compare()`
