import { describe, expect, it } from "vitest";
import {
  assertLocalTestDatabaseUrl,
  isLocalTestHost,
  LOCAL_TEST_DB_NAME,
  LOCAL_TEST_DB_PORT,
  resolveLocalTestDatabaseUrl,
} from "./test-database-url";

const LOOPBACK = `postgres://postgres:postgres@127.0.0.1:${LOCAL_TEST_DB_PORT}/${LOCAL_TEST_DB_NAME}`;

describe("local test database URL validator", () => {
  it("accepts the documented loopback DSN", () => {
    expect(assertLocalTestDatabaseUrl(LOOPBACK)).toEqual({ host: "127.0.0.1" });
  });

  it("accepts localhost and IPv6 loopback forms", () => {
    expect(
      assertLocalTestDatabaseUrl(
        `postgres://postgres:postgres@localhost:${LOCAL_TEST_DB_PORT}/${LOCAL_TEST_DB_NAME}`,
      ).host,
    ).toBe("localhost");
    expect(
      assertLocalTestDatabaseUrl(
        `postgres://postgres:postgres@[::1]:${LOCAL_TEST_DB_PORT}/${LOCAL_TEST_DB_NAME}`,
      ).host,
    ).toBe("[::1]");
  });

  it("refuses a missing URL with an actionable error", () => {
    expect(() => assertLocalTestDatabaseUrl("")).toThrow(/DATABASE_URL is missing/);
    expect(() => assertLocalTestDatabaseUrl("   ")).toThrow(/DATABASE_URL is missing/);
  });

  it("refuses a malformed URL without echoing it", () => {
    expect(() => assertLocalTestDatabaseUrl("not-a-url")).toThrow(/not a parseable URL/);
  });

  it("refuses a hosted Supabase target by hostname only", () => {
    const hosted = `postgres://postgres:s3cret@db.uqcmcurhohbdnxzpdpei.supabase.co:5432/postgres`;
    expect(() => assertLocalTestDatabaseUrl(hosted)).toThrow(
      /non-loopback host "db\.uqcmcurhohbdnxzpdpei\.supabase\.co"/,
    );
  });

  it("refuses non-loopback hosts, lookalikes, and wildcard binds", () => {
    for (const host of ["example.com", "localhost.evil.com", "0.0.0.0", "10.0.0.5"]) {
      expect(() =>
        assertLocalTestDatabaseUrl(
          `postgres://postgres:postgres@${host}:${LOCAL_TEST_DB_PORT}/${LOCAL_TEST_DB_NAME}`,
        ),
      ).toThrow(/non-loopback host/);
    }
  });

  it("refuses unexpected ports and database names", () => {
    expect(() =>
      assertLocalTestDatabaseUrl("postgres://postgres:postgres@127.0.0.1:5433/edushare"),
    ).toThrow(/unexpected port/);
    expect(() =>
      assertLocalTestDatabaseUrl("postgres://postgres:postgres@127.0.0.1:5432/postgres"),
    ).toThrow(/unexpected database/);
  });

  it("refuses non-postgres schemes", () => {
    expect(() =>
      assertLocalTestDatabaseUrl("mysql://postgres:postgres@127.0.0.1:5432/edushare"),
    ).toThrow(/postgres:\/\/ scheme/);
  });

  it("error messages never contain credentials", () => {
    const secret = "sup3r-s3cret-pw";
    try {
      assertLocalTestDatabaseUrl(
        `postgres://postgres:${secret}@db.uqcmcurhohbdnxzpdpei.supabase.co:5432/postgres`,
      );
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});

describe("resolveLocalTestDatabaseUrl (shell wins, file is fallback)", () => {
  it("prefers an explicitly exported value over the file", () => {
    const other = `postgres://postgres:postgres@localhost:${LOCAL_TEST_DB_PORT}/${LOCAL_TEST_DB_NAME}`;
    expect(resolveLocalTestDatabaseUrl(other, LOOPBACK)).toBe(other);
  });

  it("falls back to the file value when nothing is exported", () => {
    expect(resolveLocalTestDatabaseUrl(undefined, LOOPBACK)).toBe(LOOPBACK);
    expect(resolveLocalTestDatabaseUrl("", LOOPBACK)).toBe(LOOPBACK);
  });

  it("throws an actionable error when both are absent", () => {
    expect(() => resolveLocalTestDatabaseUrl(undefined, undefined)).toThrow(
      /DATABASE_URL is missing/,
    );
  });

  it("validates even the winning value (a hosted shell export still fails closed)", () => {
    const hosted = `postgres://postgres:pw@db.uqcmcurhohbdnxzpdpei.supabase.co:5432/postgres`;
    expect(() => resolveLocalTestDatabaseUrl(hosted, LOOPBACK)).toThrow(/non-loopback host/);
  });
});

describe("isLocalTestHost (exact allowlist)", () => {
  it("accepts exactly the loopback forms", () => {
    expect(isLocalTestHost("localhost")).toBe(true);
    expect(isLocalTestHost("127.0.0.1")).toBe(true);
    expect(isLocalTestHost("::1")).toBe(true);
    expect(isLocalTestHost("[::1]")).toBe(true);
  });

  it("rejects lookalikes", () => {
    expect(isLocalTestHost("localhost.evil.com")).toBe(false);
    expect(isLocalTestHost("0.0.0.0")).toBe(false);
    expect(isLocalTestHost("")).toBe(false);
  });
});
