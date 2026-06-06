// Self-serve Stripe Checkout — how a team buys seats. Creates a subscription Checkout session for
// the per-seat price and returns the hosted payment URL. Project is carried in metadata (on both the
// session and the subscription) so billing.ts can provision seats when the webhook fires.

import type { Env } from "./types";

export async function createCheckoutSession(
  env: Env,
  project: string,
  seats: number,
): Promise<string> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    throw new Error("Stripe not configured (missing STRIPE_SECRET_KEY / STRIPE_PRICE_ID)");
  }
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", env.STRIPE_PRICE_ID);
  form.set("line_items[0][quantity]", String(seats));
  form.set("metadata[project]", project);
  form.set("subscription_data[metadata][project]", project);
  form.set("success_url", `https://github.com/${project}?cassette=welcome`);
  form.set("cancel_url", `https://github.com/${project}?cassette=cancelled`);

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = (await resp.json()) as { url?: string; error?: { message?: string } };
  if (!resp.ok || !data.url) throw new Error(data.error?.message || "stripe checkout failed");
  return data.url;
}
