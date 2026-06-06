import type { Cassette, Env } from "./types";

/**
 * Content-addressed cassette storage on R2.
 * Key layout is registry-ready: <project>/<provider>/<fingerprint>.json
 * (Phase 2 adds a Postgres index over the same keys for the shared team registry.)
 */
function key(project: string, provider: string, fingerprint: string): string {
  return `${project}/${provider}/${fingerprint}.json`;
}

export async function getCassette(
  env: Env,
  project: string,
  provider: string,
  fingerprint: string,
): Promise<Cassette | null> {
  const obj = await env.CASSETTES.get(key(project, provider, fingerprint));
  if (!obj) return null;
  return (await obj.json()) as Cassette;
}

export async function putCassette(env: Env, project: string, cassette: Cassette): Promise<void> {
  await env.CASSETTES.put(
    key(project, cassette.request.provider, cassette.fingerprint),
    JSON.stringify(cassette),
    { httpMetadata: { contentType: "application/json" } },
  );
}
