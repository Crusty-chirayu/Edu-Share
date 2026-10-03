/**
 * `npm run test:db` — portable full-suite entry point with DB tests enabled.
 *
 * Only sets the opt-in flag `RUN_DB_TESTS=1` and hands through extra args to
 * Vitest. The database URL itself is never defaulted here: `vitest.setup.ts`
 * resolves it (explicit shell export wins, `.env` loopback DSN is the
 * fallback) and refuses to run the DB suites against anything that is not
 * the local disposable PostgreSQL. Exit code propagates to the caller.
 * Nothing secret is read or printed.
 */
import { spawnSync } from "node:child_process";

process.env["RUN_DB_TESTS"] = "1";
const result = spawnSync("npx", ["vitest", "run", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
