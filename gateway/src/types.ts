export interface Env {
  /** R2 bucket binding holding content-addressed cassettes. */
  CASSETTES: R2Bucket;
  /** Fallback mode when the path doesn't specify one. */
  DEFAULT_MODE?: string;
}

export type Mode = "record" | "replay" | "auto";

/** A stored interaction. The shape is intentionally registry-ready (Phase 2). */
export interface Cassette {
  v: 1;
  fingerprint: string;
  request: {
    provider: string;
    method: string;
    /** upstream path + query, with secrets stripped */
    path: string;
    /** request body as text (JSON for chat APIs) */
    body: string;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
  recordedAt: string;
}

/** Map of provider slug -> upstream origin. */
export const UPSTREAMS: Record<string, string> = {
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
  google: "https://generativelanguage.googleapis.com",
};
