import postgres from "postgres";
import { migrations } from "@/db/migrations";
import {
  assertWriteTarget,
  getEffectiveDatabaseUrl,
  isLoopbackHost,
  redactDatabaseUrl,
} from "@/db/guard";
import { logger } from "@/lib/logger";

/**
 * M3 migration runner — a small versioned-SQL runner (NOT drizzle-kit).
 *
 * `drizzle.config.ts` (`out: "./drizzle"`) is the drizzle-kit code-generation
 * config for future `drizzle-kit generate` use; it never produced output in M3.
 * The absent `./drizzle/` directory is therefore by design, not a missing
 * artifact: the committed source of truth is `src/db/migrations.ts` (plain SQL
 * with explicit up/down), which is unit-tested and needs no generated files.
 *
 * Safety: `migrateUp` / `migrateDown` verify the write target via
 * `assertWriteTarget()` (loopback, or a Supabase host whose project ref matches
 * NEXT_PUBLIC_SUPABASE_URL) BEFORE opening a write connection. `migrateDown`
 * adds a second, independent barrier on top: rollback is loopback-only, so a
 * ref-matched hosted Supabase target can never be rolled back from the CLI even
 * though `up` accepts it. There is deliberately no environment-variable bypass.
 * `migrateStatus` stays read-only so inspection never needs the guard.
 */
function connect(url: string): postgres.Sql {
  // `prepare: false` — required for Supabase's pooled (transaction-mode)
  // connections, harmless for direct/local connections.
  return postgres(url, { max: 1, prepare: false });
}

async function withClient<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = connect(getEffectiveDatabaseUrl());
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function isApplied(sql: postgres.Sql, version: string): Promise<boolean> {
  const tables = await sql`SELECT to_regclass('public.schema_migrations') AS reg`;
  if (tables[0]?.reg === null) return false;
  const rows = await sql`SELECT 1 AS one FROM schema_migrations WHERE version = ${version}`;
  return rows.length > 0;
}

export async function migrateUp(): Promise<void> {
  const target = assertWriteTarget();
  await withClient(async (sql) => {
    for (const m of migrations) {
      if (await isApplied(sql, m.version)) {
        logger.info("migration already applied, skipping", { version: m.version });
        continue;
      }
      // A multi-statement `unsafe` goes out as ONE simple-query message, which
      // PostgreSQL executes in a single implicit transaction, so `m.up` itself is
      // all-or-nothing. The journal INSERT is a separate statement, so a crash
      // between the two would leave idempotent DDL applied but unjournalled;
      // re-running is safe because 0001 uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
      await sql.unsafe(m.up);
      await sql`
        INSERT INTO schema_migrations (version, name)
        VALUES (${m.version}, ${m.name})
        ON CONFLICT (version) DO NOTHING
      `;
      logger.info("migration applied", { version: m.version, host: target.host });
    }
  });
  // stdout (not the level-filtered JSON logger) so `db:migrate:status`-style
  // invocations always produce visible output. No secrets: host only, never URLs.
  console.log(`migrate up: ok (host=${target.host} via=${target.via})`);
}

export async function migrateDown(): Promise<void> {
  const target = assertWriteTarget();
  // Independent safety barrier (docs/SUPABASE.md §4): `down` is destructive, so
  // on top of the write-target guard it must also be loopback. `assertWriteTarget()`
  // on its own permits a ref-matched hosted Supabase target (which `up` needs),
  // and a hosted rollback is never performed from the CLI.
  if (!isLoopbackHost(target.host)) {
    throw new Error(
      `Refusing migrate down: host "${target.host}" is not loopback. Rollback is only ` +
        `permitted against a local/disposable database (localhost, 127.0.0.1, [::1]); ` +
        `hosted Supabase schema changes stay in the dashboard (docs/SUPABASE.md, section 4).`,
    );
  }
  await withClient(async (sql) => {
    for (const m of [...migrations].reverse()) {
      if (!(await isApplied(sql, m.version))) {
        logger.info("migration not applied, skipping rollback", { version: m.version });
        continue;
      }
      await sql.unsafe(m.down);
      // Keep the journal truthful. 0001's `down` drops `schema_migrations` itself
      // (it created it), so this delete only runs once a future `down` keeps the
      // journal — without it, `status` would report a reverted migration as
      // applied. Truthy check: a missing table (regclass null) skips the delete.
      const journal = await sql`SELECT to_regclass('public.schema_migrations') AS reg`;
      if (journal[0]?.reg) {
        await sql`DELETE FROM schema_migrations WHERE version = ${m.version}`;
      }
      logger.info("migration reversed", { version: m.version, host: target.host });
    }
  });
  console.log(`migrate down: ok (host=${target.host} via=${target.via})`);
}

export async function migrateStatus(): Promise<{ version: string; applied: boolean }[]> {
  const rows = await withClient(async (sql) => {
    const tables = await sql`SELECT to_regclass('public.schema_migrations') AS reg`;
    if (tables[0]?.reg === null) {
      return migrations.map((m) => ({ version: m.version, applied: false }));
    }
    const applied = await sql`SELECT version FROM schema_migrations`;
    const have = new Set(applied.map((r) => String((r as { version: unknown }).version)));
    return migrations.map((m) => ({ version: m.version, applied: have.has(m.version) }));
  });
  for (const r of rows) {
    console.log(`migration ${r.version}: ${r.applied ? "applied" : "pending"}`);
  }
  return rows;
}

/** Redacted helper for error paths — host only, never credentials. */
export function describeWriteTarget(): string {
  try {
    const t = assertWriteTarget();
    return `host=${t.host} via=${t.via}`;
  } catch {
    // Nested try: even reading the env can throw (invalid/missing DATABASE_URL),
    // and this helper must never itself become the unhandled failure.
    try {
      return `url=${redactDatabaseUrl(getEffectiveDatabaseUrl())}`;
    } catch {
      return "url=<invalid environment>";
    }
  }
}
