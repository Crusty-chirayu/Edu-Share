/**
 * Vitest setup — safe local database environment for DB-gated suites.
 *
 * Runs in every worker BEFORE any test module is imported (via
 * `setupFiles` in `vitest.config.ts`), which is what makes it correct:
 * the DB suites capture `process.env["DATABASE_URL"]` at import time, so
 * setting the variable later (e.g. inside `beforeAll`) is too late.
 *
 * Behaviour:
 *  - When `RUN_DB_TESTS` is not `"1"`: does nothing. Unit-only runs keep
 *    their existing behaviour; no `.env` file is touched.
 *  - When `RUN_DB_TESTS=1`: loads `.env` with `override: false` (an
 *    explicitly exported `DATABASE_URL` always wins over the file), then
 *    validates the effective `DATABASE_URL` — and a non-empty `DIRECT_URL`
 *    — against the local-only validator. Anything missing, malformed, or
 *    non-loopback throws an actionable error BEFORE any test import can
 *    capture an empty string, so the suite fails with "export the loopback
 *    test DSN" instead of `Invalid URL` + cascading `undefined.end`.
 *  - Fills safe non-secret defaults (`APP_URL`, `NODE_ENV`, `LOG_LEVEL`)
 *    only when absent, so `getEnv()` validation inside test bodies does not
 *    fail for reasons unrelated to the database target.
 *
 * Never prints environment values. Never writes files.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import {
  assertLocalTestDatabaseUrl,
  resolveLocalTestDatabaseUrl,
} from "./src/db/test-database-url";

declare global {
  var __eduShareDbSetupDone: boolean | undefined;
}

if (process.env["RUN_DB_TESTS"] === "1" && !globalThis.__eduShareDbSetupDone) {
  globalThis.__eduShareDbSetupDone = true;
  loadDotenv({ override: false });

  // Shell wins over `.env`: `dotenv` with `override: false` leaves an
  // already-exported value untouched, and `parseDotenvFile` below reads the
  // file without applying it, so resolution priority is explicit here.
  const shellValue = process.env["DATABASE_URL"];
  const fileValue = parseDotenvFileValue("DATABASE_URL");
  const effective = resolveLocalTestDatabaseUrl(shellValue, fileValue);
  process.env["DATABASE_URL"] = effective;

  // DIRECT_URL takes precedence in `getEffectiveDatabaseUrl()`: a hosted
  // DIRECT_URL paired with a loopback DATABASE_URL would still write to the
  // hosted project, so a non-empty DIRECT_URL must prove itself too.
  const direct = (process.env["DIRECT_URL"] ?? "").trim();
  if (direct.length > 0) {
    assertLocalTestDatabaseUrl(direct);
  }

  if (!process.env["APP_URL"]) process.env["APP_URL"] = "http://127.0.0.1:3000";
  const envRecord = process.env as Record<string, string | undefined>;
  if (!envRecord["NODE_ENV"]) envRecord["NODE_ENV"] = "test";
  if (!process.env["LOG_LEVEL"]) process.env["LOG_LEVEL"] = "error";
}

/**
 * Reads a single key from the working-tree `.env` without applying anything
 * to `process.env`. Returns `undefined` when the file or key is absent.
 * Values stay in memory; nothing is logged.
 */
function parseDotenvFileValue(key: string): string | undefined {
  try {
    const file = path.join(process.cwd(), ".env");
    if (!existsSync(file)) return undefined;
    const line = readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l === key || l.startsWith(`${key}=`));
    if (!line) return undefined;
    const raw = line.slice(key.length + 1).trim();
    // Strip matching single/double quotes and a leading `export ` prefix.
    const unexported = raw.startsWith("export ") ? raw.slice("export ".length).trim() : raw;
    if (
      (unexported.startsWith('"') && unexported.endsWith('"')) ||
      (unexported.startsWith("'") && unexported.endsWith("'"))
    ) {
      return unexported.slice(1, -1);
    }
    return unexported;
  } catch {
    return undefined;
  }
}
