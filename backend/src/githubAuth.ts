// GitHub App authentication: sign an App JWT (RS256) and exchange it for a short-lived installation
// access token, cached until ~1 min before expiry. Uses Web Crypto (available in Workers).

import type { Env } from "./types";

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const strToB64url = (s: string) => bytesToB64url(new TextEncoder().encode(s));

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedKey: CryptoKey | null = null;
async function signingKey(pem: string): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedKey;
}

export async function appJwt(env: Env): Promise<string> {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY not configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = strToB64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = strToB64url(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: env.GITHUB_APP_ID }),
  );
  const input = `${header}.${payload}`;
  const key = await signingKey(env.GITHUB_APP_PRIVATE_KEY);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  return `${input}.${bytesToB64url(new Uint8Array(sig))}`;
}

const tokenCache = new Map<number, { token: string; exp: number }>();

export async function installationToken(env: Env, installationId: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(installationId);
  if (cached && cached.exp - 60 > now) return cached.token;

  const jwt = await appJwt(env);
  const resp = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: "application/vnd.github+json",
        "user-agent": "cassette-bot",
      },
    },
  );
  if (!resp.ok) throw new Error(`installation token exchange failed: ${resp.status}`);
  const data = (await resp.json()) as { token: string; expires_at: string };
  tokenCache.set(installationId, {
    token: data.token,
    exp: Math.floor(new Date(data.expires_at).getTime() / 1000),
  });
  return data.token;
}
