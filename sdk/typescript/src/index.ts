/**
 * Cassette — optional one-call TS/JS shim.
 *
 * Not strictly required: setting `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` to the gateway URL works
 * on its own. `cassetteBaseURL()` composes the right URL; `use()` sets the standard env vars.
 *
 *   import { use } from "cassette-sdk";
 *   use(); // reads CASSETTE_GATEWAY / CASSETTE_PROJECT / CASSETTE_MODE
 *
 * Or pass it explicitly when constructing a client:
 *
 *   import OpenAI from "openai";
 *   import { cassetteBaseURL } from "cassette-sdk";
 *   const client = new OpenAI({ baseURL: cassetteBaseURL("openai") });
 */
export type Provider = "openai" | "anthropic" | "google";
export type Mode = "record" | "replay" | "auto";

const PROVIDER_SUFFIX: Record<Provider, string> = {
  openai: "/openai/v1",
  anthropic: "/anthropic",
  google: "/google",
};

interface Opts {
  gateway?: string;
  project?: string;
  mode?: Mode;
}

function resolve(opts: Opts = {}) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return {
    gateway: (opts.gateway ?? env.CASSETTE_GATEWAY ?? "http://localhost:8787").replace(/\/+$/, ""),
    project: opts.project ?? env.CASSETTE_PROJECT ?? "default",
    mode: (opts.mode ?? (env.CASSETTE_MODE as Mode) ?? "auto") as Mode,
  };
}

export function cassetteBaseURL(provider: Provider, opts: Opts = {}): string {
  const { gateway, project, mode } = resolve(opts);
  return `${gateway}/${project}/${mode}${PROVIDER_SUFFIX[provider]}`;
}

/** Set the standard SDK base-URL env vars to point at the gateway. Returns what it set. */
export function use(opts: Opts = {}): Record<string, string> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const map: Record<string, string> = {
    OPENAI_BASE_URL: cassetteBaseURL("openai", opts),
    ANTHROPIC_BASE_URL: cassetteBaseURL("anthropic", opts),
    GOOGLE_GEMINI_BASE_URL: cassetteBaseURL("google", opts),
  };
  if (env) Object.assign(env, map);
  return map;
}
