# Cassette — Go-Live Checklist

Honest status: the **product core is built, deployed, and proven end-to-end** (OSS recorder live on
PyPI+npm, behavior-gate fired on a real PR, Stripe test payment provisioned a subscription). What's
below is what stands between "works in test" and "a stranger can pay and use it unattended."

Three buckets, in order: **(1) mechanical production swaps**, **(2) must-build before real paying
customers**, **(3) should-have soon**. Don't skip bucket 2 — that's the real gap.

---

## Current state snapshot
| Thing | State |
|---|---|
| `cassette-sdk` (PyPI + npm) | ✅ live v0.1.0 |
| Backend Worker (D1 + R2) | ✅ deployed (`cassette-backend.black-tooth-7c1e.workers.dev`) |
| GitHub App merge-gate | ✅ proven on real PR |
| Stripe product/price/webhook | ⚠️ **TEST mode only** |
| Checkout endpoint | ✅ deployed (test mode) |
| Customer onboarding / token issuance | ❌ **not built — manual D1 inserts only** |
| CI integration recipe (push cassettes) | ❌ not documented |
| Landing page / signup | ❌ none |
| Gateway worker (optional transport) | ❌ not deployed (recorder-first, so not blocking) |

---

## 1. Mechanical production swaps (flip to live)

- [ ] **Stripe → live mode.** In the dashboard, switch off Sandbox. Re-create in LIVE mode: the
      `Cassette Team` product, the £18/mo per-seat price, and the webhook → `/webhooks/stripe`.
      (Live IDs differ from test IDs.)
- [ ] **Swap the three Stripe config values** to live:
      ```bash
      cd backend
      printf '%s' 'sk_live_...'   | npx wrangler secret put STRIPE_SECRET_KEY
      printf '%s' 'whsec_LIVE...' | npx wrangler secret put STRIPE_WEBHOOK_SECRET
      # update STRIPE_PRICE_ID in wrangler.toml to the LIVE price id, then redeploy
      npx wrangler deploy
      ```
- [ ] **Activate the Stripe account for real payouts** (bank details + identity verification) — required
      before live charges settle.
- [ ] **Purge test data from production D1** (the test subscription would otherwise grant real seats):
      ```bash
      npx wrangler d1 execute cassette-db --remote --yes --command \
        "DELETE FROM subscriptions; DELETE FROM seats; DELETE FROM project_tokens; DELETE FROM cassette_log;"
      ```
- [ ] **Rotate the test Stripe key** that was shared during setup (Developers → API keys → roll). Low
      risk since it's test, but tidy.
- [ ] **Cloudflare Workers Paid ($5/mo)** — only required if you deploy the *gateway* for live LLM
      proxying. The backend/gate runs fine on the free plan. Skip unless/until you ship the gateway.
- [ ] **Custom domain (optional)** — map `api.cassette.dev` to the Worker so URLs aren't `*.workers.dev`.
      Update the GitHub App + Stripe webhook URLs if you do.
- [ ] **Bump + re-tag packages** when you cut a real release: edit versions, `git tag py-vX.Y.Z` /
      `ts-vX.Y.Z`, push tags (CI publishes).

## 2. Must-build before a real customer can self-onboard
These are real features, not switches. Today everything works only because *we* seeded tokens by hand.

- [ ] **Onboarding + token issuance flow.** After a team pays, they need: (a) a `project_token` minted
      for their repo, (b) the GitHub App installed on that repo, (c) that token shown to them once.
      Right now `project_tokens` rows are manual `wrangler d1 execute` inserts. Build: a post-checkout
      page (Stripe `success_url`) that mints a token and walks them through App install.
- [ ] **CI integration recipe.** Customers need a copy-paste GitHub Action that records cassettes in CI
      and calls `cassette.registry.push_dir(...)` to push them to `pr-<number>` / `blessed`. Without
      this, the gate has nothing to compare. Ship a documented `cassette.yml` workflow template.
- [ ] **Landing page.** Somewhere the GTM launch (`GTM.md`) can point — what it is, install snippet,
      "start free / buy team", link to docs. Even a single static page on Cloudflare Pages.
- [ ] **Docs site.** Quickstart (recorder), the drift concept, team setup, pricing. The README is a
      start; a real docs site converts.

## 3. Should-have soon (not launch-blocking, but don't ignore)
- [ ] **Clean-machine quickstart test.** Run the README install on a fresh machine — a broken
      `pip install` / quickstart on launch day is unrecoverable (per `GTM.md`).
- [ ] **Error monitoring.** Wire Sentry (already in the intended stack) or at least alert on Worker
      exceptions; add `wrangler tail` to your runbook.
- [ ] **Legal: ToS + Privacy + DPA.** Cassettes can contain prompt/response content. You need a privacy
      policy and a data-processing agreement for teams, and the cross-org corpus (future) needs explicit
      opt-in consent. Don't market the corpus/matcher until this exists.
- [ ] **Abuse/rate limiting** on the public `/checkout` and free-audit endpoints (cheap to spam).
- [ ] **Seat-enforcement polish.** Decide behavior when a committer exceeds the seat allowance (currently
      soft-warn) — block gating, or prompt upgrade.
- [ ] **Secret hygiene review.** Confirm no secrets in the repo; GitHub App private key only in CF;
      document rotation.

---

## Launch sequence (once buckets 1–2 are done)
1. Clean-machine quickstart passes.
2. Stripe live + test data purged + one real £-charge self-test (then refund it).
3. Landing page + docs up.
4. Publish a fresh package version, tag a GitHub release.
5. Execute `GTM.md` (Show HN Mon/Tue AM → channels in order).
6. Recruit design partners (`DESIGN-PARTNERS.md`) and run the willingness-to-pay test — the real
   validation of the £18 price.

## Rollback safety
- The human approval gate stays sacred — never auto-merge/auto-bless.
- Keep the OSS recorder fully functional offline so a backend outage never breaks customers' tests.
- D1 + R2 are the source of truth; back up the `subscriptions` + `cassette_log` tables before any bulk
  `DELETE`.
