export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
}

/**
 * M3 migration 0001 — foundation journal + health probe table.
 * Plain SQL with explicit UP and DOWN so `db:migrate` and
 * `db:migrate:down` are exact inverses (roadmap gate G6).
 */
export const migrations: Migration[] = [
  {
    version: "0001",
    name: "foundation_journal",
    up: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS health_probes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`.trim(),
    down: `
DROP TABLE IF EXISTS health_probes;
DROP TABLE IF EXISTS schema_migrations;
`.trim(),
  },
];
