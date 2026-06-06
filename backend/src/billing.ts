// Stripe → seats sync. On subscription events we upsert the project's seat allowance; seats are then
// auto-provisioned per active committer up to that allowance (see ensureSeat). Project is carried in
// the Stripe subscription metadata (set at checkout): metadata.project.

import type { Env } from "./types";

interface StripeEvent {
  type: string;
  data: { object: any };
}

export async function handleStripeEvent(env: Env, event: StripeEvent): Promise<{ handled: string }> {
  const obj = event.data.object;
  const project = obj?.metadata?.project;

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      if (!project) break;
      const status = obj.status ?? "active";
      // seats purchased = quantity on the first line item (per-seat price)
      const seats = obj.items?.data?.[0]?.quantity ?? obj.quantity ?? 1;
      await env.DB.prepare(
        `INSERT INTO subscriptions (project, stripe_id, status, seats_allowed, updated)
         VALUES (?,?,?,?,?)
         ON CONFLICT(project) DO UPDATE SET status=excluded.status,
           seats_allowed=excluded.seats_allowed, updated=excluded.updated`,
      )
        .bind(project, obj.id ?? "", status, seats, new Date().toISOString())
        .run();
      break;
    }
    case "customer.subscription.deleted": {
      if (!project) break;
      await env.DB.prepare("UPDATE subscriptions SET status='canceled', updated=? WHERE project=?")
        .bind(new Date().toISOString(), project)
        .run();
      // deactivate seats so the gate stops blessing for a lapsed team
      await env.DB.prepare("UPDATE seats SET active=0 WHERE project=?").bind(project).run();
      break;
    }
  }
  return { handled: event.type };
}

/**
 * Auto-provision a seat for a committer up to the subscription's allowance.
 * Returns true if the actor holds (or just got) an active seat.
 */
export async function ensureSeat(env: Env, project: string, actor: string): Promise<boolean> {
  const existing = await env.DB.prepare(
    "SELECT 1 FROM seats WHERE project=? AND actor=? AND active=1",
  )
    .bind(project, actor)
    .first();
  if (existing) return true;

  const sub = await env.DB.prepare(
    "SELECT seats_allowed FROM subscriptions WHERE project=? AND status='active'",
  )
    .bind(project)
    .first<{ seats_allowed: number }>();
  if (!sub) return false;

  const used = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM seats WHERE project=? AND active=1",
  )
    .bind(project)
    .first<{ n: number }>();
  if ((used?.n ?? 0) >= sub.seats_allowed) return false; // over allowance → soft-warn upstream

  await env.DB.prepare(
    "INSERT INTO seats (token, project, actor, active, created) VALUES (?,?,?,1,?)",
  )
    .bind(crypto.randomUUID(), project, actor, new Date().toISOString())
    .run();
  return true;
}
