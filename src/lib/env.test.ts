import { describe, expect, it } from "vitest";
import { __resetEnvCache, validateEnv } from "@/lib/env";

const base = {
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/edushare",
  APP_URL: "http://localhost:3000",
};

describe("env validation", () => {
  it("accepts a complete valid environment", () => {
    __resetEnvCache();
    const env = validateEnv({ ...base, NODE_ENV: "development", LOG_LEVEL: "info" });
    expect(env.DATABASE_URL).toContain("postgres://");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("rejects a missing DATABASE_URL with a field-level message", () => {
    __resetEnvCache();
    expect(() => validateEnv({ APP_URL: base.APP_URL })).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    __resetEnvCache();
    expect(() => validateEnv({ ...base, DATABASE_URL: "mysql://root@localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects an invalid APP_URL", () => {
    __resetEnvCache();
    expect(() => validateEnv({ ...base, APP_URL: "not-a-url" })).toThrow(/APP_URL/);
  });
});
