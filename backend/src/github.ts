// GitHub Checks merge-gate. On a pull_request event we compare the PR branch's recorded cassettes
// against the blessed baseline using the server-side drift detector, then post a Check Run that goes
// RED on a real behavior regression — blocking merge until a human blesses the change.
//
// NOTE: GitHub App JWT signing + installation-token exchange is stubbed (marked TODO) so the flow is
// readable without secrets wired. The drift + check-conclusion logic is real.

import { compare } from "./drift";
import { installationToken } from "./githubAuth";
import { getCassette, listFingerprints } from "./registry";
import type { Env, PrDriftFinding } from "./types";

interface PrContext {
  project: string;
  prRef: string; // the PR branch's pushed cassette ref
  installationId: number;
  owner: string;
  repo: string;
  headSha: string;
}

/** Compare PR cassettes vs blessed baseline → list of findings. */
export async function evaluatePr(env: Env, ctx: PrContext): Promise<PrDriftFinding[]> {
  const prFps = await listFingerprints(env, ctx.project, ctx.prRef);
  const findings: PrDriftFinding[] = [];

  for (const fp of prFps) {
    const baseline = await getCassette(env, ctx.project, "blessed", fp);
    const candidate = await getCassette(env, ctx.project, ctx.prRef, fp);
    if (!candidate) continue;
    if (!baseline) {
      // brand-new interaction — informational, not a regression
      findings.push({ fingerprint: fp, verdict: "benign", reasons: ["new cassette (no baseline)"] });
      continue;
    }
    const a = JSON.parse(baseline).response.body as string;
    const b = JSON.parse(candidate).response.body as string;
    const d = await compare(a, b /*, semanticJudge: env-backed matcher (Enterprise tier) */);
    findings.push({ fingerprint: fp, verdict: d.verdict, reasons: d.reasons });
  }
  return findings;
}

export function summarize(findings: PrDriftFinding[]): {
  conclusion: "success" | "action_required";
  title: string;
  summary: string;
} {
  const regressions = findings.filter((f) => f.verdict === "regression");
  if (regressions.length === 0) {
    return {
      conclusion: "success",
      title: `✓ No behavior drift (${findings.length} interactions checked)`,
      summary: "Agent behavior is unchanged or only reworded. Safe to merge.",
    };
  }
  const lines = regressions
    .map((r) => `- \`${r.fingerprint.slice(0, 12)}\` — ${r.reasons.join("; ")}`)
    .join("\n");
  return {
    conclusion: "action_required",
    title: `⚠ ${regressions.length} behavior change(s) need review`,
    summary:
      `This PR changes how your agent behaves:\n\n${lines}\n\n` +
      "Review the drift and **bless** it to merge, or fix the regression.",
  };
}

/** Post the Check Run to GitHub. (Token exchange stubbed.) */
export async function postCheckRun(
  env: Env,
  ctx: PrContext,
  result: ReturnType<typeof summarize>,
): Promise<void> {
  const token = await installationToken(env, ctx.installationId);
  const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/check-runs`;
  await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "cassette-bot",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "cassette / agent-behavior",
      head_sha: ctx.headSha,
      status: "completed",
      conclusion: result.conclusion,
      output: { title: result.title, summary: result.summary },
    }),
  });
}
