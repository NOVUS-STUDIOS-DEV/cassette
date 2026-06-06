# Cassette — Pricing (pressure-tested)

**Axis: per-seat + the CI merge-gate. Storage/bandwidth generously included, never metered.**
(Metering bytes is fatal — it teaches customers to self-host the one thing that's cheap to host.)

## Tiers

| Tier | Price | Includes | For |
|------|-------|----------|-----|
| **Free / OSS** | £0 | In-process recorder + replay, local cassettes in the customer's own repo, single-repo, community support. Byte-**unlimited** but coordination-**limited** (no shared registry, no merge-gate, no matcher). | Individuals, OSS, evaluation. Goal = ubiquity |
| **Team** | **£18/dev/mo** (annual) · £22 m2m | Everything free + shared cassette registry, **GitHub Checks merge-gate on semantic drift**, drift diff UI, RBAC, Slack/CI notifications, 50GB registry included, unlimited replay bandwidth. Billed per active committer. | Eng teams of 3–60 building with AI. **Primary revenue driver** |
| **Enterprise** | £39/dev/mo (annual, 25-seat min) | Everything in Team + **cross-org/cross-repo drift matcher**, SSO/SAML/SCIM, audit logs, VPC/on-prem registry or BYO-bucket, GitLab/Bitbucket/Azure gates, drift policy controls, SLA, CSM at 50+. | Security-conscious, polyglot, multi-cloud orgs (25+) |

## Revenue by team size (Team tier)

| Devs | Monthly | Annual |
|---|---|---|
| 2 | £36 | £432 |
| 5 | £90 | £1,080 |
| 10 | £180 | £2,160 |
| 25 | £450 (£975 Ent) | £5,400 (£11,700 Ent) |
| 50 | £900 (£1,950 Ent) | £10,800 (£23,400 Ent) |

## Willingness-to-pay (grounded in real comps)

Defensible band for "CI gate + team coordination" tooling is **£8–35/dev/mo**. Anchors: Codecov ~$10–12
(the literal positioning comp), Graphite (PR merge tooling) ~$25–35, LinearB ~$15–49, Datadog CI
Visibility ~$30–40/committer, Sentry Team ~$26+. **Team at £18 sits ~50% above Codecov** (it does
more — semantic drift + a real merge gate, not just a coverage %) yet below the £30+ premium tools,
maximising conversion off the free recorder. ROI is trivially positive: one flaky-test debugging
afternoon (£200–400 loaded eng time) exceeds a year of one seat.

## Seats-not-bytes sanity check ✅

Cassettes are 10–100KB text. Worst realistic cases: 25-dev team ≈ 500MB; extreme monorepo ≈ 5GB. At
~£0.02/GB/mo that 5GB costs **~£0.10/mo** to host vs **£5,400+/yr** in seat revenue — bytes are
~0.002% of the bill. So self-hosting bytes saves the customer **pennies** while forfeiting the
registry, gate, and matcher. Caps (50GB Team / 500GB Ent / BYO-bucket) exist only to trigger upsell
conversations — **never** a per-GB charge.

## The 3 ways pricing breaks (and the fix)

1. **The recorder is good enough alone → nobody upgrades.** → Make the merge-gate produce visible
   "this PR silently changed agent behavior — blocked" moments local diffing can't. Auto-enable a
   14-day Team trial on first PR.
2. **Seat under-counting** (buy 5 seats for 20 devs, route CI through a service account). → Bill per
   **active committer** detected via GitHub identity on gated PRs (Codecov/Datadog model); un-seated
   authors get a soft warning + upgrade prompt. Revenue tied to the value event (a gated merge).
3. **Young category = no budget line.** → Anchor against budgets they already fund ("CI reliability +
   PR quality gate", not a net-new category); ship ROI proof (flaky hours saved, bad merges blocked)
   in-product so champions can expense it. Hold £18; discount via annual commit, never list price.
