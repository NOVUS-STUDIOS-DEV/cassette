// Cassette hosted backend (Phase 2) — the paid team layer.
//
// Routes:
//   POST /v1/:project/cassettes?ref=<branch>     push recorded cassettes from CI  (project token + actor)
//   GET  /v1/:project/cassettes?ref=<branch>     list fingerprints
//   GET  /v1/:project/cassettes/:fp?ref=<branch> pull one cassette
//   POST /v1/:project/bless?from=<branch>        promote a PR's cassettes to baseline (after review)
//   POST /webhooks/github                        GitHub App: run the PR merge-gate (HMAC verified)
//   POST /webhooks/stripe                        Stripe: sync subscription → seat allowance (verified)

import { ensureSeat, handleStripeEvent } from "./billing";
import { evaluatePr, postCheckRun, summarize } from "./github";
import { blessRef, getCassette, listFingerprints, putCassette } from "./registry";
import type { Env } from "./types";
import { verifyGithub, verifyStripe } from "./verify";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b, null, 2), { status, headers: { "content-type": "application/json" } });

const bearer = (req: Request) => (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

/** A valid shared CI push token for this project? */
async function authProject(env: Env, req: Request, project: string): Promise<boolean> {
  const token = bearer(req);
  if (!token) return false;
  const row = await env.DB.prepare(
    "SELECT 1 FROM project_tokens WHERE token = ? AND project = ?",
  )
    .bind(token, project)
    .first();
  return !!row;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] === "_health") return json({ ok: true });

    // --- GitHub merge-gate webhook (signature-verified) ---
    if (req.method === "POST" && parts[0] === "webhooks" && parts[1] === "github") {
      const raw = await req.text();
      if (env.GITHUB_WEBHOOK_SECRET) {
        const ok = await verifyGithub(env.GITHUB_WEBHOOK_SECRET, raw, req.headers.get("x-hub-signature-256"));
        if (!ok) return json({ error: "bad signature" }, 401);
      }
      if (req.headers.get("x-github-event") !== "pull_request") {
        return json({ ignored: req.headers.get("x-github-event") });
      }
      const payload = JSON.parse(raw);
      const ctx = {
        project: payload.repository?.full_name ?? "default",
        prRef: `pr-${payload.number}`,
        installationId: payload.installation?.id ?? 0,
        owner: payload.repository?.owner?.login ?? "",
        repo: payload.repository?.name ?? "",
        headSha: payload.pull_request?.head?.sha ?? "",
      };
      const findings = await evaluatePr(env, ctx);
      const result = summarize(findings);
      try {
        await postCheckRun(env, ctx, result);
      } catch (e) {
        return json({ evaluated: findings.length, result, postError: String(e) }, 202);
      }
      return json({ evaluated: findings.length, conclusion: result.conclusion });
    }

    // --- Stripe billing webhook (signature-verified) → seat allowance sync ---
    if (req.method === "POST" && parts[0] === "webhooks" && parts[1] === "stripe") {
      const raw = await req.text();
      if (env.STRIPE_WEBHOOK_SECRET) {
        const ok = await verifyStripe(env.STRIPE_WEBHOOK_SECRET, raw, req.headers.get("stripe-signature"));
        if (!ok) return json({ error: "bad signature" }, 401);
      }
      const result = await handleStripeEvent(env, JSON.parse(raw));
      return json(result);
    }

    // --- registry API: /v1/:project/... ---
    if (parts[0] === "v1") {
      const project = parts[1];
      const ref = url.searchParams.get("ref") || "blessed";
      const actor = req.headers.get("x-cassette-actor") || "ci";

      if (!(await authProject(env, req, project))) {
        return json({ error: "unauthorized — invalid project token" }, 401);
      }
      const seated = await ensureSeat(env, project, actor); // provision/track up to allowance

      // POST /v1/:project/cassettes
      if (req.method === "POST" && parts[2] === "cassettes" && parts.length === 3) {
        const items = (await req.json()) as Array<{ fingerprint: string; body: string }>;
        for (const it of items) await putCassette(env, project, ref, it.fingerprint, it.body, actor);
        return json({ pushed: items.length, ref, actor, seated, ...(seated ? {} : { warning: "no seat available for this committer — gating limited until a seat is added" }) });
      }
      if (req.method === "GET" && parts[2] === "cassettes" && parts.length === 3) {
        return json({ ref, fingerprints: await listFingerprints(env, project, ref) });
      }
      if (req.method === "GET" && parts[2] === "cassettes" && parts[3]) {
        const body = await getCassette(env, project, ref, parts[3]);
        return body
          ? new Response(body, { headers: { "content-type": "application/json" } })
          : json({ error: "not found" }, 404);
      }
      if (req.method === "POST" && parts[2] === "bless") {
        const from = url.searchParams.get("from");
        if (!from) return json({ error: "missing ?from=<branch>" }, 400);
        const n = await blessRef(env, project, from, actor);
        return json({ blessed: n, from, by: actor });
      }
    }

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
