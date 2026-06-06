// Post-checkout onboarding. Stripe redirects the buyer here with ?session_id=... — we verify the
// session is paid (the session id IS the proof of purchase, known only to the buyer), then mint (or
// reuse) a CI project token and render setup instructions. This turns "paid" into "can use it" with
// no human in the loop.

import type { Env } from "./types";

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

const APP_INSTALL_URL = "https://github.com/apps/cassette-behavior-gate/installations/new";

export async function handleWelcome(env: Env, sessionId: string): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return html("<h1>Stripe not configured</h1>", 500);

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const s = (await r.json()) as any;
  if (!r.ok || (s.status !== "complete" && s.payment_status !== "paid")) {
    return html(
      `<h1>Payment not confirmed yet</h1><p>If you just completed checkout, refresh this page in a few seconds.</p>`,
      402,
    );
  }
  const project: string | undefined = s.metadata?.project;
  if (!project) return html("<h1>Missing project on session</h1>", 400);

  // mint or reuse a project token (idempotent so refreshes don't spawn duplicates)
  let token: string;
  const existing = await env.DB.prepare(
    "SELECT token FROM project_tokens WHERE project=? ORDER BY created LIMIT 1",
  )
    .bind(project)
    .first<{ token: string }>();
  if (existing) {
    token = existing.token;
  } else {
    token = "cas_" + crypto.randomUUID().replace(/-/g, "");
    await env.DB.prepare(
      "INSERT INTO project_tokens (token, project, created) VALUES (?,?,?)",
    )
      .bind(token, project, new Date().toISOString())
      .run();
  }

  return html(page(project, token));
}

function page(project: string, token: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to Cassette</title>
<style>
 body{font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111}
 h1{font-size:28px} code,pre{background:#f4f4f5;border-radius:6px} code{padding:2px 6px}
 pre{padding:14px;overflow:auto;border:1px solid #e4e4e7} .tok{font-size:18px;font-weight:600}
 .step{margin:28px 0} .num{display:inline-block;width:26px;height:26px;border-radius:50%;background:#111;color:#fff;text-align:center;line-height:26px;margin-right:8px;font-size:14px}
 a.btn{display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none}
 .warn{background:#fff7ed;border:1px solid #fed7aa;padding:12px 14px;border-radius:8px}
</style></head><body>
<h1>🎬 You're in. Welcome to Cassette Team.</h1>
<p>Subscription active for <strong>${project}</strong>. Three steps to switch the behavior-gate on.</p>

<div class="step"><span class="num">1</span><strong>Save your CI token</strong>
<p>This authenticates your CI pushing cassettes. Add it as a repo secret named <code>CASSETTE_TOKEN</code> in
<code>${project}</code> → Settings → Secrets and variables → Actions.</p>
<p class="tok">Token: <code>${token}</code></p>
<p class="warn">Copy it now — treat it like a password. You can re-open this page from your Stripe receipt link if needed.</p>
</div>

<div class="step"><span class="num">2</span><strong>Install the GitHub App on your repo</strong>
<p>This lets the gate post the ✓/✗ check on your pull requests.</p>
<p><a class="btn" href="${APP_INSTALL_URL}">Install Cassette on ${project}</a></p>
</div>

<div class="step"><span class="num">3</span><strong>Add the CI workflow</strong>
<p>Drop this into <code>.github/workflows/cassette.yml</code> (full template in the
<a href="https://github.com/NOVUS-STUDIOS-DEV/cassette/blob/main/examples/ci/cassette.yml">repo</a>):</p>
<pre>name: cassette
on: [pull_request]
jobs:
  agent-tests:
    runs-on: ubuntu-latest
    env:
      CASSETTE_MODE: auto
      CASSETTE_PROJECT: \${{ github.repository }}
      CASSETTE_TOKEN: \${{ secrets.CASSETTE_TOKEN }}
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install cassette-sdk pytest
      - run: pytest
      - if: always()
        run: cassette push --ref "pr-\${{ github.event.number }}"</pre>
</div>

<p>That's it. Open a PR and Cassette will flag any change in your agent's behavior before it merges.
Questions: see the <a href="https://github.com/NOVUS-STUDIOS-DEV/cassette#readme">docs</a>.</p>
</body></html>`;
}
