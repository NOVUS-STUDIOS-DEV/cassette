# Cassette — Design-Partner Recruitment Campaign

**Goal:** sign **5–10 design-partner teams** onto the free Team beta to answer the #1 open question:
*will teams actually pay £18/seat, and which paid feature do they care about most?* This is the one
genuinely hands-ON stretch — do it well and the rest of the funnel runs itself.

## Who we want (design-partner ICP)
- Engineering team of **3–30 devs** actively shipping an AI/agent feature (not a side experiment).
- **Already feels the pain:** flaky/slow/expensive LLM tests in CI. (If they don't test their AI at
  all, they're not ready — skip.)
- Uses **GitHub** (the merge-gate is GitHub-first).
- Bonus wedge: **polyglot / multi-cloud / security-conscious** — the segment Vercel/Azure/LangSmith
  can't serve. These are the highest-signal partners.

## Where to find them (in priority order)
1. **The launch funnel itself.** Free-recorder users who open GitHub issues mentioning CI/teams, or
   star from a company-domain account → warmest possible leads. Watch this first.
2. **GitHub search** — repos that import `openai`/`anthropic` AND have a `tests/` dir AND CI config;
   especially repos with skipped/flaky LLM tests or `# TODO: mock the model` comments.
3. **Discords** — Latent Space, LangChain, agent-framework communities; people complaining about test
   cost/flakiness.
4. **Your network** — anyone building agents commercially.

## The offer
> Free Team beta (shared registry + the GitHub PR behavior-gate) in exchange for: (a) using it on a
> real repo, and (b) two short feedback calls. No payment during the beta; locked-in founder pricing
> if they convert.

Frictionless to say yes; obligation is feedback, not money.

## Outreach sequence (per lead)

**Touch 1 — DM/email (the one in GTM.md):** acknowledge they use the OSS tool → describe the team
version → offer free early access for feedback → ask for 20 min.

**Touch 2 — follow-up (if no reply, +4 days):**
> Quick nudge — still keen to get Cassette in front of a few teams with real AI test pain before we
> lock the team features. 15 min this week? If it's not a fit, totally fine — what would've made it
> one?

**The call (20 min) — agenda:**
1. (5m) How do they test their AI today? What breaks / what does it cost them? *(confirm the pain is real)*
2. (10m) Show the behavior-gate catching a regression on a sample PR. *(the "aha")*
3. (5m) The two questions that decide the business ↓

## The willingness-to-pay test (the core of every call)
1. **"If this blocked a bad agent change before it shipped, what would that be worth per developer per month?"** — let them answer first, *then* reveal £18 and read the reaction (instant yes / hesitation / "too high").
2. **"Of these three, which is the must-have, the nice-to-have, and the don't-care: shared registry · the PR behavior-gate · the cross-repo drift detector?"** — tells you what to build deep vs. drop.

Bonus: *"Who signs off on a £200/mo dev-tool — you, or someone else?"* — surfaces the real buyer and sales-cycle length.

## Targets & tracking
- **Pipeline:** 20 personal outreaches → ~8 calls → 5+ active beta teams.
- **Conversion proof:** ≥2 teams say an unhesitating "I'd pay £18."  ← *this is the green light to build/charge.*
- **Feature signal:** a clear winner among the three paid features.
- **Track** in a simple sheet: lead · source · stage (outreach/call/beta/verbal-yes) · WTP number · must-have feature · buyer.

## Kill / pivot criteria (be honest)
- If 8+ calls yield **no** unhesitating "I'd pay," the seats-not-bytes price or the value prop is
  wrong → revisit before building more (don't paper over it).
- If everyone wants only the **free recorder** and shrugs at the gate → the paid layer is mispriced
  or the gate isn't visceral enough → make "blocked a bad merge" louder before re-testing.
