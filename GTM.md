# Cassette — Go-to-Market: path to first paying customer

The model: **free OSS recorder → team upgrade**. Developers adopt the free tool with zero friction,
hit the team wall, and their company pays per-seat. First £ comes from a warm free user, ~3–4 months
in. Below: the staged path + the actual launch assets for Stages 0–1.

## Stages (with the metric that unlocks the next)

| Stage | Weeks | Goal | You (founder) | Automation | Advance when |
|------|------|------|---------------|------------|--------------|
| 0 Free tool out | 1–4 | devs using the recorder | write launch posts, answer comments | install/record/replay self-serve | hundreds of installs + "this is useful" |
| 1 Design partners | 4–10 | confirm teams will pay | 20 personal outreaches, ~5 calls | usage analytics flag team users | 5+ teams in beta, 2+ say "I'd pay" |
| 2 First £ | 10–16 | money in the door | ship the asked-for feature, ask warm partner to upgrade | Stripe billing self-serve | first paid invoice clears |
| 3 Repeatable | mo 4–9 | customers pay without you | docs, light feature work | acquisition→billing→renewal | a paid team arrives in a no-outreach week |
| 4 Compounding | mo 9+ | scale w/o effort | watch numbers, widen funnel | seats grow, matcher improves | NRR > 110%, organic seat growth |

The unavoidable hands-ON bit is **Stage 1** (validating willingness-to-pay needs real conversations).
It is temporary; steady state (Stage 3+) is ~5–10 hrs/week.

---

## ASSET 1 — Show HN post (sharpened)

**Title (use this one):**
> Show HN: Cassette – record/replay LLM calls in CI so agent tests are fast, free, and deterministic

*Leads with the mechanism + the three outcomes devs care about. Do NOT title it "like VCR.py but for
AI" — a large fraction of HN won't know VCR.py and will bounce. Do NOT put pricing in the title.*

Runner-up titles if testing: "VCR for AI agents (open source, in-process, works offline)" ·
"deterministic agent testing without mocks (record once, replay forever)".

**Body:**

> I build agents for internal tooling and kept hitting the same wall: tests that call real LLMs are
> slow (2–30s/call), cost money on every CI run, and fail randomly when the model updates or
> rate-limits. Mocks are worse — they drift immediately and test nothing real.
>
> The standard answer is "stub the HTTP layer." But LLM responses are large, structured, and
> semantically meaningful. A 200-OK stub returning garbage JSON passes your tests while your agent is
> completely broken.
>
> Cassette is a small in-process library (Python first, Node/Go in progress) that records real
> LLM/tool interactions to a local cassette file on first run, then replays them on every run after —
> no network, no API key, no cost. Cassettes are plain JSON so they diff cleanly in PRs.
>
> The free OSS layer does recording/replay and nothing else — it composes with pytest, Jest, Go test,
> whatever you use. The paid TEAM layer is a shared cassette registry + a GitHub Checks merge gate
> that does *semantic* drift detection (catches when a model/prompt change shifts agent behavior in a
> way a string-diff would miss). Pricing is per seat; storage/bandwidth generously included.
>
> The recorder is the commodity. The intelligence is knowing when behavior has *actually* drifted vs.
> just changed harmlessly.
>
> Repo: <link> | Docs: <link> — especially keen on feedback from polyglot agent stacks where replay
> options are basically nothing.

## ASSET 2 — Channel plan & posting order

**Launch Monday/Tuesday 9–11am US Eastern. Never Friday.** Newsletter submissions go out Day 1 (1–4
week editorial lead).

| When | Channel | Framing |
|---|---|---|
| Day 1 AM | **Hacker News** (Show HN) | the post above — mechanism + pain, OSS-first |
| Day 1 PM | **Latent Space Discord** #tools | "record/replay for LLM calls, offline + deterministic CI, free OSS core" |
| Day 1 | Newsletters: **TLDR (dev), Console.dev, Pointer.io** | submit; they publish weeks 1–4 |
| Day 2 | **LangChain Discord** | lead with the callback-handler integration |
| Day 2 | **r/MachineLearning** | angle: evaluation/reproducibility, not CI |
| Day 3 | **r/programming** | link back to the HN thread (now has social proof) |
| Day 4–5 | **r/Python**, **r/golang** (separately) | language-native: "pytest plugin for recording LLM calls" |
| Week 2 | **r/devops, r/SRE** | a write-up post with real usage numbers — not a launch post |

**Order rationale:** HN first (algo weights early votes); Latent Space same afternoon (they watch HN
and amplify); subreddits staggered with genuinely different posts per community.

**First-week target:** 300–500 GitHub stars, 150–250 unique installs, and — more important — **15–25
people opening issues/Discord threads with real feedback**, plus 30–50 teams on the TEAM waitlist.
A top-10 HN day (800–1200 stars) is upside, not the plan.

## ASSET 2b — Mistakes that kill dev-tool launches (avoid)

- ❌ Same title cross-posted to multiple subreddits same day → spam filter + call-outs. Write distinct posts.
- ❌ Pricing in the HN title/first paragraph → flagged as commercial, early downvotes kill momentum.
- ❌ Responding defensively to "just use a mock" → have the calm answer ready (*cassettes pin the exact response, so replay is deterministic by definition*); thank skeptics.
- ❌ Asking for stars/upvotes → against HN guidelines, reads as desperate.
- ❌ A broken quickstart on launch day → unrecoverable for that wave. **Run the README on a clean machine the morning of launch.**
- ❌ Making the paid tier the main event early → the OSS recorder must win on its own; free lovers become the TEAM funnel.

## ASSET 3 — Design-partner outreach DM (Stage 1)

To a free user who's clearly on a team:

> Hey <name> — saw you're using Cassette on <repo/at work>. I'm building the team version: a shared
> recording registry so everyone works from the same cassettes, plus a GitHub check that goes red
> when a PR changes how your AI actually behaves (caught before it ships). 
>
> I'm giving ~5–10 teams early access free in exchange for feedback. Worth a 20-min call to see if it
> fits how your team works? Either way, thanks for using the OSS tool.

The two questions every call must answer:
1. Would you pay for the team version, and roughly what per developer?
2. Which is the must-have: shared registry, the PR behavior-check, or the smart drift detector?
