// Shared cassette registry — the paid team layer. Stores cassettes per project/branch in R2 and
// keeps a lightweight index in D1 (who blessed which behavior change = the audit trail). This is the
// thing a self-hosted shim cannot cheaply replicate: shared state + RBAC + lineage.

import type { Env } from "./types";

function objKey(project: string, ref: string, fingerprint: string): string {
  // ref = branch or "blessed" baseline pointer
  return `${project}/${ref}/${fingerprint}.json`;
}

export async function putCassette(
  env: Env,
  project: string,
  ref: string,
  fingerprint: string,
  body: string,
  actor: string,
): Promise<void> {
  await env.REGISTRY.put(objKey(project, ref, fingerprint), body, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { actor, ref },
  });
  // Audit trail: append who pushed what. (D1 schema in backend/README.md.)
  await env.DB.prepare(
    "INSERT INTO cassette_log (project, ref, fingerprint, actor, action, ts) VALUES (?,?,?,?,?,?)",
  )
    .bind(project, ref, fingerprint, actor, "push", new Date().toISOString())
    .run();
}

export async function getCassette(
  env: Env,
  project: string,
  ref: string,
  fingerprint: string,
): Promise<string | null> {
  const obj = await env.REGISTRY.get(objKey(project, ref, fingerprint));
  return obj ? await obj.text() : null;
}

export async function listFingerprints(env: Env, project: string, ref: string): Promise<string[]> {
  const out: string[] = [];
  const prefix = `${project}/${ref}/`;
  let cursor: string | undefined;
  do {
    const page = await env.REGISTRY.list({ prefix, cursor });
    for (const o of page.objects) out.push(o.key.slice(prefix.length).replace(/\.json$/, ""));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** Promote a PR's recordings to the blessed baseline (after a human approves the drift). */
export async function blessRef(env: Env, project: string, fromRef: string, actor: string): Promise<number> {
  const fps = await listFingerprints(env, project, fromRef);
  for (const fp of fps) {
    const body = await getCassette(env, project, fromRef, fp);
    if (body) await putCassette(env, project, "blessed", fp, body, actor);
  }
  return fps.length;
}
