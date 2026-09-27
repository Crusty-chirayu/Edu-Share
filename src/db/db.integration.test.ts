/**
 * M3 connectivity probe (integration): requires a live PostgreSQL.
 * Target rule: loopback, a *test* database, or the owner's Supabase project
 * whose ref matches NEXT_PUBLIC_SUPABASE_URL. No migrations here — SELECT 1.
 */
import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import { getEffectiveDatabaseUrl, isLoopbackHost, matchesSupabaseRef } from "@/db/guard";

const enabled = process.env["RUN_DB_TESTS"] === "1";

describe.skipIf(!enabled)("database connectivity", () => {
  it("connects to the configured effective database and answers SELECT 1", async () => {
    // Safety stays, but honours the hosted project: allow loopback, *test*
    // databases — or the owner's Supabase project when the target matches
    // NEXT_PUBLIC_SUPABASE_URL exactly (shared guard helpers, never substrings).
    const raw = getEffectiveDatabaseUrl();
    const { hostname, username } = new URL(raw);
    const ref =
      /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/.exec(
        (getEnv().NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
      )?.[1] ?? "";
    const allowed =
      isLoopbackHost(hostname) ||
      /test/i.test(new URL(raw).pathname) ||
      (ref !== "" && matchesSupabaseRef(hostname, username, ref));
    const why = `Refusing integration test against unverified database host: ${hostname}`;
    expect(allowed, why).toBe(true);

    const sql = postgres(raw, { max: 1, prepare: false });
    try {
      const rows = await sql`SELECT 1 AS one`;
      expect((rows[0] as { one: number }).one).toBe(1);
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});
