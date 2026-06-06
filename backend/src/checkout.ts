// Self-serve Stripe Checkout — how a team buys seats. Creates a subscription Checkout session for
// the per-seat price and returns the hosted payment URL. Project is carried in metadata (on both the
// session and the subscription) so billing.ts can provision seats when the webhook fires.

import type { Env } from "./types";

export async function createCheckoutSession(
  env: Env,
  project: string,
  seats: number,
  baseUrl: string,
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
  form.set("cancel_url", `${baseUrl}/?checkout=cancelled`);

  // success_url must keep Stripe's {CHECKOUT_SESSION_ID} placeholder UN-encoded, so append it raw.
  const success = `${baseUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const body =
    form.toString() +
    "&success_url=" +
    encodeURIComponent(success).replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await resp.json()) as { url?: string; error?: { message?: string } };
  if (!resp.ok || !data.url) throw new Error(data.error?.message || "stripe checkout failed");
  return data.url;
}
