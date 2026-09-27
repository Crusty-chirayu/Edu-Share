import "dotenv/config";
import { describeWriteTarget, migrateDown, migrateStatus, migrateUp } from "@/db/migrate";

const action = process.argv[2];

async function main(): Promise<void> {
  if (action === "up") {
    await migrateUp();
  } else if (action === "down") {
    await migrateDown();
  } else if (action === "status") {
    await migrateStatus();
  } else {
    throw new Error(`Unknown migrate action: ${String(action)} (expected up|down|status)`);
  }
}

main().catch((err: unknown) => {
  // console: the JSON logger may be level-filtered (CI sets LOG_LEVEL=warn),
  // which is exactly why `status` previously "completed without printing".
  console.error(
    `migration ${String(action ?? "?")} failed (${describeWriteTarget()}): ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exitCode = 1;
});
