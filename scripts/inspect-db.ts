/**
 * Read-only hosted-database inspector (M3 Supabase verification).
 * Never writes, never migrates — reports identity + foundation-table state.
 * Print-safe: hostnames and table names only, never credentials or row data.
 */
import "dotenv/config";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import { getEffectiveDatabaseUrl } from "@/db/guard";

async function main(): Promise<void> {
  getEnv(); // fail fast on invalid env before connecting
  // Identity line: hostname only (never userinfo/port-path credentials).
  let host = "(unparseable host)";
  try {
    host = new URL(getEffectiveDatabaseUrl()).hostname;
  } catch {
    // keep the placeholder — the connection below will fail with the real cause
  }
  const sql = postgres(getEffectiveDatabaseUrl(), { max: 1, prepare: false });
  try {
    const version = await sql`SELECT version() AS v`;
    console.log(`db: ${(version[0] as { v: string }).v.split(" ")[0]} connected host=${host}`);
    const db = await sql`SELECT current_database() AS db, current_user AS usr`;
    const row = db[0] as { db: string; usr: string };
    console.log(`database=${row.db} user=${String(row.usr).slice(0, 12)}…`);
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('schema_migrations', 'health_probes')
      ORDER BY table_name
    `;
    const names = tables.map((t) => String((t as { table_name: string }).table_name));
    console.log(`foundation tables: ${names.join(", ") || "(none)"}`);
    const journal = await sql`
      SELECT to_regclass('public.schema_migrations') AS reg,
        to_regclass('public.health_probes') AS probe
    `;
    const reg = String((journal[0] as { reg: unknown }).reg);
    const probe = String((journal[0] as { probe: unknown }).probe);
    console.log(`journal=${reg} probe=${probe}`);
    if ((journal[0] as { reg: unknown }).reg !== null) {
      const applied = await sql`SELECT version, name FROM schema_migrations ORDER BY version`;
      for (const r of applied) {
        const rec = r as { version: string; name: string };
        console.log(`applied: ${rec.version} ${rec.name}`);
      }
    }
    if ((journal[0] as { probe: unknown }).probe !== null) {
      const count = await sql`SELECT count(*)::text AS count FROM health_probes`;
      console.log(`health_probes rows=${(count[0] as { count: string }).count}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(`inspect failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
