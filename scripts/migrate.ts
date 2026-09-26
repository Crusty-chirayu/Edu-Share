import "dotenv/config";
import { migrateDown, migrateStatus, migrateUp } from "@/db/migrate";
import { logger } from "@/lib/logger";

const action = process.argv[2];

async function main(): Promise<void> {
  if (action === "up") {
    await migrateUp();
  } else if (action === "down") {
    await migrateDown();
  } else if (action === "status") {
    const rows = await migrateStatus();
    for (const r of rows) {
      logger.info("migration status", { version: r.version, applied: r.applied });
    }
  } else {
    throw new Error(`Unknown migrate action: ${String(action)} (expected up|down|status)`);
  }
}

main().catch((err: unknown) => {
  logger.error("migration failed", { error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
