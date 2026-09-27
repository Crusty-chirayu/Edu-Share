import "dotenv/config";
import { assertWriteTarget } from "@/db/guard";
import { getSql } from "@/db/client";

/**
 * M3 seed — inserts nothing product-like. Verifies the migrated database is
 * writable by writing a bounded number of health-probe rows, then reports the
 * count. Bounded, not strictly idempotent: each run adds one probe row, then
 * prunes the probe table to the 5 newest rows (M3 scaffolding only — product
 * tables arriving in M5+ are never touched).
 * Real taxonomy/product seeds arrive with M6; auth seeds with M5.
 */
async function main(): Promise<void> {
  const target = assertWriteTarget();
  const sql = getSql();
  try {
    await sql`INSERT INTO health_probes DEFAULT VALUES`;
    // Keep local/CI loops from growing the probe table unboundedly.
    await sql`DELETE FROM health_probes WHERE id NOT IN (
      SELECT id FROM health_probes ORDER BY created_at DESC LIMIT 5
    )`;
    const rows = await sql`SELECT count(*)::text AS count FROM health_probes`;
    console.log(
      `seed: ok health_probes=${(rows[0] as { count: string }).count} ` +
        `(host=${target.host} via=${target.via})`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(`seed failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
