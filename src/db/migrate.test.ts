import { afterEach, describe, expect, it, vi } from "vitest";
import { __setTestEnv } from "@/lib/env";
import { describeWriteTarget, migrateDown, migrateUp } from "@/db/migrate";

// The driver is stubbed so this file can never open a socket. Every test below
// asserts on the error it throws ("network disabled in unit tests"), which makes
// "did a connection get attempted?" observable: an empty `connectCalls` proves
// the code refused BEFORE connecting.
const { connectCalls } = vi.hoisted(() => ({ connectCalls: [] as string[] }));

vi.mock("postgres", () => ({
  default: (url: string) => {
    connectCalls.push(url);
    throw new Error("network disabled in unit tests");
  },
}));

const supabaseUrl = "https://uqcmcurhohbdnxzpdpei.supabase.co";
const loopbackUrl = "postgres://postgres:postgres@127.0.0.1:5432/edushare";
const hostedDirectUrl =
  "postgres://postgres:secret@db.uqcmcurhohbdnxzpdpei.supabase.co:5432/postgres";

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: loopbackUrl,
    DIRECT_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
    LOG_LEVEL: "warn",
    ...overrides,
  };
}

let restoreEnv: (() => void) | null = null;

function setEnv(overrides: Record<string, string | undefined> = {}): void {
  restoreEnv?.();
  restoreEnv = __setTestEnv(baseEnv(overrides));
}

afterEach(() => {
  restoreEnv?.();
  restoreEnv = null;
  connectCalls.length = 0;
});

describe("rollback barrier (down is loopback-only)", () => {
  it("refuses a ref-matched hosted target before opening any connection", async () => {
    setEnv({ DIRECT_URL: hostedDirectUrl, NEXT_PUBLIC_SUPABASE_URL: supabaseUrl });
    await expect(migrateDown()).rejects.toThrow(/Rollback is only permitted/);
    expect(connectCalls).toEqual([]);
  });

  it("refuses a hosted target when no project is configured (guard first)", async () => {
    setEnv({ DIRECT_URL: hostedDirectUrl });
    await expect(migrateDown()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL is unset/);
    expect(connectCalls).toEqual([]);
  });

  it("still allows `up` to reach a ref-matched hosted target (down-only barrier)", async () => {
    setEnv({ DIRECT_URL: hostedDirectUrl, NEXT_PUBLIC_SUPABASE_URL: supabaseUrl });
    await expect(migrateUp()).rejects.toThrow(/network disabled in unit tests/);
    expect(connectCalls).toEqual([hostedDirectUrl]);
  });

  it("allows rollback against a loopback database (local Docker / CI)", async () => {
    setEnv({ DIRECT_URL: loopbackUrl });
    await expect(migrateDown()).rejects.toThrow(/network disabled in unit tests/);
    expect(connectCalls).toEqual([loopbackUrl]);
  });
});

describe("describeWriteTarget (never throws, never leaks)", () => {
  it("reports host and source without credentials for a valid target", () => {
    setEnv({ DIRECT_URL: loopbackUrl });
    expect(describeWriteTarget()).toBe("host=127.0.0.1 via=DIRECT_URL");
  });

  it("returns a clear placeholder when the environment is unusable", () => {
    setEnv({ DATABASE_URL: undefined, DIRECT_URL: "" });
    expect(describeWriteTarget()).toBe("url=<invalid environment>");
  });
});
