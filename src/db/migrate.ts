import postgres from "postgres";
import { migrations } from "@/db/migrations";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

async function withClient<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const env = getEnv();
  const sql = postgres(
    env.DIRECT_URL && env.DIRECT_URL.length > 0 ? env.DIRECT_URL : env.DATABASE_URL,
    {
      max: 1,
    },
  );
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function migrateUp(): Promise<void> {
  await withClient(async (sql) => {
    await sql.unsafe(migrations[0]?.up ?? "");
    await sql`
      INSERT INTO schema_migrations (version, name)
      VALUES (${migrations[0]?.version ?? "0001"}, ${migrations[0]?.name ?? "foundation"})
      ON CONFLICT (version) DO NOTHING
    `;
  });
  logger.info("migration applied", { version: migrations[0]?.version });
}

export async function migrateDown(): Promise<void> {
  await withClient(async (sql) => {
    await sql.unsafe(migrations[0]?.down ?? "");
  });
  logger.info("migration reversed", { version: migrations[0]?.version });
}

export async function migrateStatus(): Promise<{ version: string; applied: boolean }[]> {
  return withClient(async (sql) => {
    const tables = await sql`SELECT to_regclass('public.schema_migrations') AS reg`;
    if (tables[0]?.reg === null) {
      return migrations.map((m) => ({ version: m.version, applied: false }));
    }
    const rows = await sql`SELECT version FROM schema_migrations`;
    const applied = new Set(rows.map((r) => String((r as { version: unknown }).version)));
    return migrations.map((m) => ({ version: m.version, applied: applied.has(m.version) }));
  });
}
