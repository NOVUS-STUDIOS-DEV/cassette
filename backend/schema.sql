-- Cassette backend D1 schema. Apply: npx wrangler d1 execute cassette-db --file=schema.sql

-- Per-project seats. Billing = count of active seats (per active committer). Token authenticates
-- a CI/dev push and ties it to a committer identity.
CREATE TABLE IF NOT EXISTS seats (
  token    TEXT PRIMARY KEY,
  project  TEXT NOT NULL,
  actor    TEXT NOT NULL,          -- github login of the committer holding this seat
  active   INTEGER NOT NULL DEFAULT 1,
  created  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seats_project ON seats(project, active);

-- Shared CI push tokens (one+ per project, set as a CI secret). Authenticates cassette pushes; the
-- committer identity comes from the x-cassette-actor header so seats can be attributed per committer.
CREATE TABLE IF NOT EXISTS project_tokens (
  token   TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ptokens_project ON project_tokens(project);

-- Stripe subscriptions → seat allowance per project. Seats auto-provision per committer up to this.
CREATE TABLE IF NOT EXISTS subscriptions (
  project       TEXT PRIMARY KEY,
  stripe_id     TEXT NOT NULL,
  status        TEXT NOT NULL,         -- 'active' | 'canceled' | ...
  seats_allowed INTEGER NOT NULL DEFAULT 0,
  updated       TEXT NOT NULL
);

-- Immutable audit trail: who pushed/blessed which behavior change. The compliance/lineage artifact
-- that makes the registry painful to leave.
CREATE TABLE IF NOT EXISTS cassette_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project     TEXT NOT NULL,
  ref         TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,       -- 'push' | 'bless'
  ts          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_project ON cassette_log(project, ts);
