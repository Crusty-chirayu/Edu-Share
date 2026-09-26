/**
 * M3 connectivity probe (integration): requires a live PostgreSQL.
 * Skipped by default in CI-quick runs; exercised explicitly via `npm run test -- db.integration`
 * or against the compose service. Never runs migrations against an unknown database:
 * the target must be localhost or a *_test database.
 */
import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { getEnv } from "@/lib/env";

const enabled = process.env["RUN_DB_TESTS"] === "1";

describe.skipIf(!enabled)("database connectivity", () => {
  it("connects and answers SELECT 1", async () => {
    const { DATABASE_URL } = getEnv();
    const isLocal =
      DATABASE_URL.includes("@127.0.0.1") ||
      DATABASE_URL.includes("@localhost") ||
      /\/[^/]*test[^/]*$/i.test(DATABASE_URL);
    expect(
      isLocal,
      `Refusing integration test against non-local/non-test database: ${redact(DATABASE_URL)}`,
    ).toBe(true);

    const sql = postgres(DATABASE_URL, { max: 1 });
    try {
      const rows = await sql`SELECT 1 AS one`;
      expect((rows[0] as { one: number }).one).toBe(1);
    } finally {
      await sql.end({ timeout: 2 });
    }
  });
});

function redact(url: string): string {
  return url.replace(/:\/\/[^@]+@/, "://***@");
}
