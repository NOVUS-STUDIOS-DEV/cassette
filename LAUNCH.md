# Cassette — Launch Runbook (paste-ready)

✅ **Pre-flight passed (2026-06-06):** published `cassette-sdk` 0.1.1 installs and record→replay works
end-to-end; `cassette` CLI present; repo / PyPI / npm / landing / docs all live.

**Links to use everywhere:**
- Repo: https://github.com/NOVUS-STUDIOS-DEV/cassette
- Landing: https://cassette-site.pages.dev
- Docs: https://cassette-site.pages.dev/docs/
- Install: `pip install cassette-sdk` · `npm install cassette-sdk`

**Timing:** post the Show HN **Monday or Tuesday, 9–11am US Eastern**. Never Friday. Everything else
staggers off it (below).

---

## Launch-day order
| When | Channel | Action |
|---|---|---|
| Day 1, 9–11am ET | **Hacker News** | post the Show HN (below). Then watch comments for the day. |
| Day 1, same PM | **Latent Space Discord** #tools | short post (below) |
| Day 1 | Newsletters | submit TLDR (dev), Console.dev, Pointer.io |
| Day 2 | **LangChain Discord** | the integration angle |
| Day 2 | **r/MachineLearning** | reproducibility angle |
| Day 3 | **r/programming** | link back to the HN thread |
| Day 4–5 | **r/Python**, **r/golang** | language-native posts (separate, different text) |
| Week 2 | **r/devops, r/SRE** | a write-up with early usage numbers |

---

## Show HN

**Title:**
`Show HN: Cassette – record/replay LLM calls in CI so agent tests are fast, free, and deterministic`

**Body:**
> I build agents and kept hitting the same wall: tests that call real LLMs are slow (2–30s/call),
> cost money on every CI run, and fail randomly when the model updates or rate-limits. Mocks are
> worse — they drift and test nothing real.
>
> "Just stub the HTTP layer" doesn't cut it for LLMs: responses are large, structured, and
> semantically meaningful. A 200-OK stub returning garbage JSON passes your tests while your agent is
> broken.
>
> Cassette is a small in-process library (Python now, Node too) that records real LLM/tool
> interactions to a local cassette file on first run, then replays them on every run after — no
> network, no API key, no cost. Cassettes are plain JSON so they diff cleanly in PRs.
>
> The free OSS layer does recording/replay and nothing else — it composes with pytest, vitest, Go
> test. The paid Team layer is a shared registry + a GitHub Checks merge-gate that does *semantic*
> drift detection (catches when a model/prompt change shifts agent behaviour in a way a string-diff
> would miss). Per seat; storage included.
>
> The recorder is the commodity. The intelligence is knowing when behaviour actually drifted vs.
> changed harmlessly.
>
> Repo: https://github.com/NOVUS-STUDIOS-DEV/cassette · Docs: https://cassette-site.pages.dev/docs/
> Keen on feedback, especially from polyglot agent stacks where replay options are basically nothing.

**Have ready for the inevitable "just use a mock" reply:** *"Cassettes pin the exact recorded
response, so replay is deterministic by definition — and the gate diffs behaviour (tool calls,
output shape), not strings, so it catches real regressions a mock can't."* Thank skeptics; don't get
defensive.

---

## Latent Space Discord (#tools-and-libraries), Day 1 PM
> Built Cassette — record/replay for LLM/agent calls so CI tests run offline, free, and
> deterministically (in-process, no gateway). Free OSS core; paid team tier adds a GitHub PR gate
> that flags real behaviour drift. Would love feedback: https://github.com/NOVUS-STUDIOS-DEV/cassette

## LangChain Discord, Day 2
> If your LangChain tests hit real models in CI, Cassette records them once and replays them after —
> fast, free, deterministic. OSS: https://github.com/NOVUS-STUDIOS-DEV/cassette  (docs:
> https://cassette-site.pages.dev/docs/)

## r/MachineLearning, Day 2 (reproducibility angle)
> **Deterministic, reproducible agent tests via record/replay** — we record LLM responses once and
> replay them so test runs are byte-stable and free, instead of re-sampling the model every CI run.
> Open source, plain-JSON cassettes that diff in PRs. Feedback welcome: <repo link>

## r/programming, Day 3 (link the HN thread for social proof)
> Cassette: record/replay for LLM/agent tests — fast, free, deterministic CI without mocks. (HN
> discussion: <link>) Repo: <repo link>

## r/Python, Day 4 (library angle)
> `pip install cassette-sdk` — records your app's LLM calls and replays them in pytest, like VCR.py
> but built for large, structured, semantically-meaningful model responses. Free/OSS: <repo link>

## Newsletters (Day 1, 1–4 week lead)
- **TLDR (dev section)** — community submission: "Cassette: open-source record/replay for LLM/agent
  calls — fast, free, deterministic CI."
- **Console.dev** — "interesting tools" submission, same one-liner + repo.
- **Pointer.io** — angle at eng managers: "Make AI agent tests as reliable as your existing suite."

---

## Mistakes to avoid (these sink dev launches)
- ❌ Same title cross-posted to multiple subreddits same day → spam filter + call-outs. Write each post fresh.
- ❌ Pricing in the HN title/first line → flagged commercial, downvoted.
- ❌ Asking for upvotes/stars → against HN rules, reads desperate.
- ❌ Defensive replies → answer calmly, thank skeptics.
- ✅ Be at your keyboard the first 2–3 hours after the HN post to answer every comment fast.

## First-week target
300–500 GitHub stars, 150–250 installs, and — more important — **15–25 people opening issues/Discord
threads with real feedback**, plus 30–50 teams on a Team waitlist/interest.

---

## Design partners (run in parallel — this is the real validation)
From free-tool users who are clearly on a team, DM ~20 (template + the willingness-to-pay call script
are in `DESIGN-PARTNERS.md`). Goal: 5+ teams in beta, ≥2 unhesitating "I'd pay £18". That signal —
not stars — is what de-risks the business.
