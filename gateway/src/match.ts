/**
 * Request fingerprinting / matching.
 *
 * Phase 1 = exact (content-addressed) matching over a CANONICALISED request:
 * stable key ordering + volatile fields stripped. This deliberately fails SAFE —
 * if the request changes, the fingerprint changes, the cassette misses, and `auto`
 * mode simply re-records. No external side effect, ever.
 *
 * Phase 3 swaps in a semantic matcher behind the same interface. The moat is NOT
 * this function; it's the hosted registry that accumulates around it.
 */

/** Fields that legitimately vary between identical logical calls and must not affect the match. */
const VOLATILE_BODY_KEYS = new Set(["stream_options", "user", "metadata"]);

/** Deterministic JSON stringify with sorted keys. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .filter((k) => !VOLATILE_BODY_KEYS.has(k))
      .map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]))
      .join(",") +
    "}"
  );
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build the content-addressed fingerprint for a request.
 * Body is canonicalised when it's JSON; otherwise hashed verbatim.
 */
export async function fingerprint(
  provider: string,
  method: string,
  path: string,
  body: string,
): Promise<string> {
  let normalizedBody = body;
  if (body) {
    try {
      normalizedBody = canonicalize(JSON.parse(body));
    } catch {
      // non-JSON body — hash as-is
    }
  }
  return sha256Hex([provider, method.toUpperCase(), path, normalizedBody].join("\n"));
}
