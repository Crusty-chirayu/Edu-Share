/**
 * Local-only test database URL validator (unit-testable, dependency-free).
 *
 * Why this file exists: Vitest does not load `.env` on its own, so when the
 * DB suites run with `RUN_DB_TESTS=1` but no exported `DATABASE_URL`, the
 * test modules capture `""` at import time and fail later with a bare
 * `Invalid URL`. This module is the single place that decides which database
 * targets a test run may touch. It knows only the disposable local
 * PostgreSQL from `compose.yaml` (loopback, port 5432, database `edushare`)
 * and refuses everything else — hosted Supabase, non-loopback hosts,
 * unexpected ports or database names — before any socket opens.
 *
 * Safety properties:
 *  - Fail-closed: anything missing, malformed, or unexpected throws.
 *  - Never echoes credentials: error messages name at most the hostname,
 *    never userinfo, passwords, query strings, or full DSNs.
 *  - No imports from `@/lib/env` or `@/db/guard` on purpose: those read and
 *    validate the ambient environment, which is exactly what is not yet
 *    established when this runs. The small loopback allowlist is duplicated
 *    here (matching `isLoopbackHost`) so this module stays self-contained.
 */

export const LOCAL_TEST_DB_PORT = "5432";
export const LOCAL_TEST_DB_NAME = "edushare";

/** Exact loopback allowlist — WHATWG URLs keep IPv6 literals bracketed (`[::1]`). */
export function isLocalTestHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

export interface LocalTestTarget {
  host: string;
}

/**
 * Throws (refusing the run) unless `raw` is a postgres URL for the local
 * disposable test database. Returns the verified host on success.
 */
export function assertLocalTestDatabaseUrl(raw: string): LocalTestTarget {
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "Refusing database test: DATABASE_URL is missing or empty. " +
        "Export the loopback test DSN (see README testing section) or provide it " +
        "via .env, then re-run with RUN_DB_TESTS=1.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(
      "Refusing database test: DATABASE_URL is not a parseable URL. " +
        "Expected a postgres:// DSN for the local test database.",
    );
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Refusing database test: DATABASE_URL must use the postgres:// scheme.");
  }
  const host = parsed.hostname.toLowerCase();
  if (!isLocalTestHost(host)) {
    throw new Error(
      `Refusing database test against non-loopback host "${host}". ` +
        "Database tests run only against the local disposable PostgreSQL.",
    );
  }
  if (parsed.port !== LOCAL_TEST_DB_PORT) {
    throw new Error(
      `Refusing database test: unexpected port "${parsed.port || "<default>"}" for host "${host}". ` +
        `Expected port ${LOCAL_TEST_DB_PORT}.`,
    );
  }
  const database = parsed.pathname.replace(/\/+$/, "").replace(/^\//, "");
  if (database !== LOCAL_TEST_DB_NAME) {
    throw new Error(
      `Refusing database test: unexpected database "${database || "<none>"}" for host "${host}". ` +
        `Expected database "${LOCAL_TEST_DB_NAME}".`,
    );
  }
  return { host };
}

/**
 * Prefer an explicitly exported value; fall back to the loopback DSN parsed
 * from `.env` (validated before use). Throws an actionable error when neither
 * provides a usable target. Never logs or returns secrets — only selection.
 */
export function resolveLocalTestDatabaseUrl(
  shellValue: string | undefined,
  fileValue: string | undefined,
): string {
  const fromShell = (shellValue ?? "").trim();
  if (fromShell.length > 0) {
    assertLocalTestDatabaseUrl(fromShell);
    return fromShell;
  }
  const fromFile = (fileValue ?? "").trim();
  if (fromFile.length > 0) {
    assertLocalTestDatabaseUrl(fromFile);
    return fromFile;
  }
  throw new Error(
    "Refusing database test: DATABASE_URL is missing or empty. " +
      "Export the loopback test DSN (see README testing section) or provide it " +
      "via .env, then re-run with RUN_DB_TESTS=1.",
  );
}
