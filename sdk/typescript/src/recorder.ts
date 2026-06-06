/**
 * In-process recorder for Node (the surface we own — no gateway required).
 *
 * Returns a `fetch`-compatible function that records/replays at the HTTP layer. Pass it to the SDK:
 *
 *   import OpenAI from "openai";
 *   import { recordingFetch } from "cassette-sdk/recorder";
 *   const client = new OpenAI({ fetch: recordingFetch({ project: "demo" }) });
 *
 * In vitest/jest, wrap the global fetch in setup:
 *   globalThis.fetch = recordingFetch({ project: "demo" });
 *
 * Cassettes conform to SPEC.md and interoperate with the Python recorder and the gateway.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Mode = "record" | "replay" | "auto";
const VOLATILE = new Set(["stream_options", "user", "metadata"]);
const DROP_RESP = new Set(["content-length", "content-encoding", "transfer-encoding", "connection"]);

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .filter((k) => !VOLATILE.has(k))
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(obj[k]))
      .join(",") +
    "}"
  );
}

function fingerprint(method: string, url: string, body: string): string {
  let norm = body;
  if (body) {
    try {
      norm = canonical(JSON.parse(body));
    } catch {
      /* non-JSON body — hash verbatim */
    }
  }
  return createHash("sha256").update([method.toUpperCase(), url, norm].join("\n")).digest("hex");
}

export class CassetteMiss extends Error {}

export interface RecorderOpts {
  project?: string;
  mode?: Mode;
  cassetteDir?: string;
}

export function recordingFetch(opts: RecorderOpts = {}): typeof fetch {
  const env = (globalThis as any).process?.env ?? {};
  const project = opts.project ?? env.CASSETTE_PROJECT ?? "default";
  const mode: Mode = opts.mode ?? env.CASSETTE_MODE ?? "auto";
  const dir = join(opts.cassetteDir ?? env.CASSETTE_DIR ?? ".cassettes", project);
  mkdirSync(dir, { recursive: true });
  const realFetch = (globalThis.fetch as typeof fetch).bind(globalThis);

  return async function cassetteFetch(input: any, init?: any): Promise<Response> {
    const req = new Request(input, init);
    const body = req.method === "GET" || req.method === "HEAD" ? "" : await req.clone().text();
    const fp = fingerprint(req.method, req.url, body);
    const path = join(dir, `${fp}.json`);

    if ((mode === "replay" || mode === "auto") && existsSync(path)) {
      const rec = JSON.parse(readFileSync(path, "utf8"));
      const headers = new Headers();
      for (const [k, v] of Object.entries(rec.response.headers as Record<string, string>)) {
        if (!DROP_RESP.has(k.toLowerCase())) headers.set(k, v);
      }
      headers.set("x-cassette", "replay");
      return new Response(rec.response.body, { status: rec.response.status, headers });
    }
    if (mode === "replay") {
      throw new CassetteMiss(`no cassette for ${req.method} ${req.url} (fp=${fp.slice(0, 12)})`);
    }

    const resp = await realFetch(req);
    const text = await resp.text();
    if (resp.ok) {
      const headers: Record<string, string> = {};
      resp.headers.forEach((v, k) => {
        if (!/^(authorization|set-cookie)$/i.test(k)) headers[k] = v;
      });
      writeFileSync(
        path,
        JSON.stringify(
          {
            v: 1,
            fingerprint: fp,
            request: { method: req.method, url: req.url, body },
            response: { status: resp.status, headers, body: text },
          },
          null,
          2,
        ),
      );
    }
    return new Response(text, { status: resp.status, headers: resp.headers });
  } as typeof fetch;
}
