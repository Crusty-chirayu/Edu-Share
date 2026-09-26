import "dotenv/config";
import { getSql } from "@/db/client";
import { logger } from "@/lib/logger";

/**
 * M3 seed — inserts nothing product-like. Verifies the migrated database is
 * writable by writing a single health-probe row, then reports the count.
 * Real taxonomy/product seeds arrive with M6; auth seeds with M5.
 */
async function main(): Promise<void> {
  const sql = getSql();
  await sql`INSERT INTO health_probes DEFAULT VALUES`;
  const rows = await sql`SELECT count(*)::text AS count FROM health_probes`;
  logger.info("seed complete", { health_probes: (rows[0] as { count: string }).count });
  await sql.end({ timeout: 2 });
}

main().catch((err: unknown) => {
  logger.error("seed failed", { error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
