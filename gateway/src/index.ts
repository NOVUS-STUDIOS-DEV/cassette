import { fingerprint } from "./match";
import { getCassette, putCassette } from "./store";
import { UPSTREAMS, type Cassette, type Env, type Mode } from "./types";

/** Headers we never forward upstream or persist (secrets / hop-by-hop). */
const STRIP_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "api-key",
  "host",
  "content-length",
  "cf-connecting-ip",
  "cf-ray",
  "x-forwarded-for",
  "x-real-ip",
]);

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    if (!STRIP_HEADERS.has(k.toLowerCase())) out[k] = v;
  });
  return out;
}

/** Forward auth + content headers upstream, drop hop-by-hop ones. */
function upstreamHeaders(h: Headers): Headers {
  const out = new Headers();
  h.forEach((v, k) => {
    const lk = k.toLowerCase();
    if (lk === "host" || lk === "content-length" || lk.startsWith("cf-")) return;
    out.set(k, v);
  });
  return out;
}

function replay(cassette: Cassette): Response {
  const headers = new Headers(cassette.response.headers);
  headers.set("x-cassette", "replay");
  headers.set("x-cassette-recorded-at", cassette.recordedAt);
  return new Response(cassette.response.body, { status: cassette.response.status, headers });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return json({ service: "cassette-gateway", usage: "/<project>/<mode>/<provider>/<path>" });
    }
    if (parts[0] === "_health") return json({ ok: true });

    // Path: /<project>/<mode>/<provider>/<...upstream path>
    const [project, modeRaw, provider, ...rest] = parts;
    const mode = (modeRaw || env.DEFAULT_MODE || "auto") as Mode;
    const upstreamBase = UPSTREAMS[provider];

    if (!upstreamBase) {
      return json(
        { error: `unknown provider '${provider}'`, known: Object.keys(UPSTREAMS) },
        404,
      );
    }
    if (!["record", "replay", "auto"].includes(mode)) {
      return json({ error: `invalid mode '${mode}'`, valid: ["record", "replay", "auto"] }, 400);
    }

    const upstreamPath = "/" + rest.join("/") + url.search;
    const body =
      req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
    const fp = await fingerprint(provider, req.method, upstreamPath, body);

    // --- replay / auto: try the cassette first ---
    if (mode === "replay" || mode === "auto") {
      const hit = await getCassette(env, project, provider, fp);
      if (hit) return replay(hit);
      if (mode === "replay") {
        return json(
          {
            error: "cassette miss",
            hint: "no recording for this request; run the suite once in record mode",
            project,
            provider,
            fingerprint: fp,
          },
          504,
          { "x-cassette": "miss" },
        );
      }
      // auto + miss falls through to record (fails SAFE: just re-records)
    }

    // --- record (or auto-miss): proxy upstream and store ---
    const upstreamResp = await fetch(upstreamBase + upstreamPath, {
      method: req.method,
      headers: upstreamHeaders(req.headers),
      body: body || undefined,
    });
    const respBody = await upstreamResp.text();

    // Only persist successful interactions; let errors pass through untouched.
    if (upstreamResp.ok) {
      const cassette: Cassette = {
        v: 1,
        fingerprint: fp,
        request: { provider, method: req.method, path: upstreamPath, body },
        response: {
          status: upstreamResp.status,
          headers: headersToObject(upstreamResp.headers),
          body: respBody,
        },
        recordedAt: new Date().toISOString(),
      };
      await putCassette(env, project, cassette);
    }

    const outHeaders = new Headers(upstreamResp.headers);
    outHeaders.set("x-cassette", upstreamResp.ok ? "record" : "passthrough");
    return new Response(respBody, { status: upstreamResp.status, headers: outHeaders });
  },
} satisfies ExportedHandler<Env>;
