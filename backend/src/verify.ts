// Webhook signature verification (constant-time) for GitHub and Stripe. Uses Web Crypto HMAC.

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** GitHub: verify X-Hub-Signature-256: "sha256=<hex>". */
export async function verifyGithub(
  secret: string,
  payload: string,
  header: string | null,
): Promise<boolean> {
  if (!header) return false;
  const expected = "sha256=" + (await hmacHex(secret, payload));
  return constantTimeEqual(expected, header);
}

/** Stripe: verify Stripe-Signature: "t=<ts>,v1=<hex>" over `${t}.${payload}` with a 5-min tolerance. */
export async function verifyStripe(
  secret: string,
  payload: string,
  header: string | null,
): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > 300) return false; // replay window
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return constantTimeEqual(expected, v1);
}
