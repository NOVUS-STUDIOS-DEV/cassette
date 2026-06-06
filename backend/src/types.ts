export interface Env {
  /** R2 bucket: the shared cassette registry. */
  REGISTRY: R2Bucket;
  /** D1 database: audit log + project/seat metadata. Schema in backend/README.md. */
  DB: D1Database;
  /** GitHub App credentials (set via `wrangler secret put`). */
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  /** Stripe webhook signing secret (set via `wrangler secret put`). */
  STRIPE_WEBHOOK_SECRET?: string;
  /** Stripe secret key (set via `wrangler secret put`) — used to create Checkout sessions. */
  STRIPE_SECRET_KEY?: string;
  /** Stripe per-seat price id (plain var in wrangler.toml). */
  STRIPE_PRICE_ID?: string;
}

/** A drift finding attached to a PR check. */
export interface PrDriftFinding {
  fingerprint: string;
  verdict: "identical" | "benign" | "regression";
  reasons: string[];
}
