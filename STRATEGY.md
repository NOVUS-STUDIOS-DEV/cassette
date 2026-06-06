# Cassette — Strategy & Moat (post-validation, 2026-06)

The JARVIS board validated the opportunity and adversarially war-gamed the moat. Verdict:
**GO — but build a different company than the original brief.**

## What's true

- **Demand: confirmed-High.** Slow/flaky/expensive LLM CI is a real, dollar-figured pain. Multiple
  teams independently built the same OSS workaround (vcrpy, vcr-langchain, llm-rewind, aimock,
  Docker cagent) — the strongest possible demand signal.
- **White space: real (June 2026).** Nobody combines a transparent recorder + hosted shared team
  registry + CI merge-gating. Observability tools are post-hoc; OSS VCRs are local-only.
- **12–24 month window** before incumbents (Vercel, GitHub/Microsoft, LangChain) could bundle a
  free version. This is the master clock.

## What was wrong in the original thesis

The gateway-VCR-with-usage-pricing version loses:

1. The **gateway is a commodity** (a Workers proxy is a weekend project; OSS already exists).
2. **Request-path "lock-in" is illusory** — the one env var that makes adoption frictionless makes
   exit frictionless.
3. **Metering storage + bandwidth meters the exact thing customers self-host** on their own R2/S3
   for cents. The $400–2k/mo team has the incentive *and* the engineers to defect in ~2 days.

Three independent kill-scenarios (incumbent bundle / self-host defection / native vendor caching)
all converged on **one** defense — which is the real signal.

## The inversion (load-bearing, decide BEFORE building further)

1. **Decouple recording from the request path.** Ship an OSS in-process recorder (Python decorator /
   TS-vitest plugin) that records with no gateway. The gateway is one optional ingest transport. We
   own the recording surface even if frameworks bundle their own.
2. **Move the meter off bytes onto seats + CI merge-gating.** Storage/bandwidth generously included.
   **Self-host must be a downgrade, not a saving.**
3. **Make the registry a review/audit workflow**, not a blob store: GitHub Checks merge-gate on
   *semantic* drift, inline approve/reject, immutable "who blessed this behavior change" audit trail
   tied to our GitHub App identity.
4. **Win the one data-network-effect we can:** a cross-org semantic matcher trained on the
   privacy-scrubbed, opt-in aggregate cassette graph. Better than any lone self-hoster's. **Start
   harvesting labeled diff data (real-regression vs benign-nondeterminism) from the first free user**
   — start it after incumbents ship and it's too late.

## Architectural boundary (drawn in Phase 1, enforced forever)

| OSS client shim (permissive license) | Hosted backend (paid) |
|---|---|
| in-process recorder, hashing, local record/replay | shared registry, RBAC, audit trail |
| optional gateway transport | GitHub Checks merge-gate + diff review |
| portable cassette file format + importers | semantic-drift matcher service |
| genuinely useful solo | cross-org corpus + intelligence tier |

The shim is a **client** of the backend for any team feature. Registry/merge-gate/drift logic must
**not** depend on the gateway, so we can drop gateway-as-requirement without a rewrite when native
caching commoditizes the mechanism.

## Positioning

**"Codecov of agent behavior."** Platform-, cloud-, and vendor-neutral; sits on top of whatever a
team already uses. Primary GTM wedge: the **polyglot / multi-cloud / security-conscious** segment
that won't hand its deploy pipeline *and* model traffic to one vendor — a segment Vercel/Azure/
LangSmith structurally cannot serve without cannibalizing their own lock-in. Anti-lock-in
(clean export, published self-host guide) is a **trust asset**, never a restrictive license.

## Open questions to resolve with 5–10 design-partner teams

- Does seats + merge-gating (storage near-free) clear real willingness-to-pay before the registry/
  intelligence value is deep?
- How fast is the incumbent window actually closing? (Monitor Vercel/GitHub changelogs quarterly.)
- Cold-start: can the drift classifier be trusted before the corpus is large?
- Is the security-conscious polyglot segment large enough to be venture-scale, or just a niche?
- What consent/contractual model makes enterprises comfortable contributing to the cross-org corpus?

## Funding gate

If we cannot commit to inverting the moat **and** the pricing before serious spend, **don't fund it**
— the brief's version loses the commodity middle to a free bundled feature by default.
