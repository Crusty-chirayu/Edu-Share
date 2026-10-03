import { afterEach, describe, expect, it } from "vitest";
import { __setTestEnv } from "@/lib/env";
import {
  assertWriteTarget,
  extractSupabaseRef,
  getEffectiveDatabaseUrl,
  isLoopbackHost,
  matchesSupabaseRef,
  redactDatabaseUrl,
} from "@/db/guard";

const supabaseUrl = "https://uqcmcurhohbdnxzpdpei.supabase.co";
const ref = "uqcmcurhohbdnxzpdpei";
// Same host as the direct URL above, but with `u` percent-encoded as `%75`.
// Opaque hosts are never decoded, so this must NOT be treated as the project.
const encodedHostUrl =
  "postgres://postgres:secret@db.%75qcmcurhohbdnxzpdpei.supabase.co:5432/postgres";

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/edushare",
    DIRECT_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
    LOG_LEVEL: "warn",
    ...overrides,
  };
}

// Capture the restore function __setTestEnv returns so every test hands
// process.env back exactly as it found it (values and env cache).
let restoreEnv: (() => void) | null = null;

function setEnv(overrides: Record<string, string | undefined> = {}): void {
  restoreEnv?.();
  restoreEnv = __setTestEnv(baseEnv(overrides));
}

afterEach(() => {
  restoreEnv?.();
  restoreEnv = null;
});

describe("migration write-target guard", () => {
  it("prefers DIRECT_URL over DATABASE_URL", () => {
    setEnv({ DIRECT_URL: "postgres://postgres:postgres@127.0.0.1:5432/other" });
    expect(getEffectiveDatabaseUrl()).toContain("@127.0.0.1:5432/other");
    expect(assertWriteTarget().via).toBe("DIRECT_URL");
  });

  it("accepts loopback targets without a Supabase project", () => {
    setEnv();
    const target = assertWriteTarget();
    expect(target.host).toBe("127.0.0.1");
    expect(target.via).toBe("DATABASE_URL");
    expect(target.ref).toBeNull();
  });

  it("accepts bracketed IPv6 loopback ([::1]) as WHATWG URLs report it", () => {
    setEnv({ DATABASE_URL: "postgres://postgres:postgres@[::1]:5432/edushare" });
    const target = assertWriteTarget();
    expect(target.host).toBe("[::1]");
    expect(target.ref).toBeNull();
  });

  it("accepts the Supabase direct host matching the public project ref", () => {
    setEnv({
      DIRECT_URL: "postgres://postgres:secret@db.uqcmcurhohbdnxzpdpei.supabase.co:5432/postgres",
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    const target = assertWriteTarget();
    expect(target.ref).toBe(ref);
    expect(target.via).toBe("DIRECT_URL");
  });

  it("accepts an uppercase direct hostname (URL opaque hosts preserve case)", () => {
    setEnv({
      DIRECT_URL: `postgres://postgres:secret@DB.${ref.toUpperCase()}.supabase.co:5432/postgres`,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(assertWriteTarget().ref).toBe(ref);
  });

  it("accepts the Supabase pooled user matching the public project ref", () => {
    setEnv({
      DIRECT_URL: "",
      DATABASE_URL:
        "postgres://postgres.uqcmcurhohbdnxzpdpei:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    const target = assertWriteTarget();
    expect(target.ref).toBe(ref);
    expect(target.via).toBe("DATABASE_URL");
  });

  it("refuses when DATABASE_URL is missing entirely", () => {
    setEnv({ DATABASE_URL: undefined, DIRECT_URL: "" });
    expect(() => assertWriteTarget()).toThrow(/DATABASE_URL/);
  });

  it("refuses a percent-encoded host that would decode to the project", () => {
    setEnv({ DIRECT_URL: encodedHostUrl, NEXT_PUBLIC_SUPABASE_URL: supabaseUrl });
    // Opaque hosts (non-special scheme `postgres:`) are never percent-decoded,
    // so a decode-equivalent hostname must fail the exact match — fail closed.
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses a trailing-dot host instead of normalising it away", () => {
    setEnv({
      DIRECT_URL: `postgres://postgres:secret@db.${ref}.supabase.co.:5432/postgres`,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses a deceptive hostname that only contains the ref", () => {
    setEnv({
      DIRECT_URL: `postgres://postgres:secret@db.${ref}.supabase.co.evil.example.com:5432/postgres`,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses a non-Supabase host that embeds the ref", () => {
    setEnv({
      DIRECT_URL: `postgres://postgres:secret@${ref}.attacker.example.com:5432/postgres`,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses a ref-bearing user on a non-pooler host", () => {
    setEnv({
      DATABASE_URL: `postgres://postgres.${ref}:secret@attacker.example.com:6543/postgres`,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses a pooler host whose username is not exactly postgres.<ref>", () => {
    setEnv({
      DATABASE_URL: `postgres://postgres.${ref}.evil:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses a remote host that does not match the project ref", () => {
    setEnv({
      DIRECT_URL: "postgres://postgres:secret@db.otherproject.supabase.co:5432/postgres",
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    expect(() => assertWriteTarget()).toThrow(/does not match Supabase project ref/);
  });

  it("refuses any remote host when the Supabase URL is unset", () => {
    setEnv({
      DIRECT_URL: "postgres://postgres:secret@db.uqcmcurhohbdnxzpdpei.supabase.co:5432/postgres",
      NEXT_PUBLIC_SUPABASE_URL: "",
    });
    expect(() => assertWriteTarget()).toThrow(/cannot be verified/);
  });

  it("refuses an unparseable connection URL", () => {
    setEnv({ DATABASE_URL: "postgres://[" });
    expect(() => assertWriteTarget()).toThrow(/not parseable/);
  });

  it("never includes the password in a refusal message", () => {
    setEnv({
      DATABASE_URL: "postgres://postgres:sup3rS3cret@evil.example.com:5432/postgres",
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    });
    let message = "";
    try {
      assertWriteTarget();
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("does not match Supabase project ref");
    expect(message).not.toContain("sup3rS3cret");
  });
});

describe("matchesSupabaseRef (exact matching)", () => {
  const pooler = "aws-0-eu-central-1.pooler.supabase.com";

  it("accepts only the exact direct host or exact pooler user", () => {
    expect(matchesSupabaseRef(`db.${ref}.supabase.co`, "postgres", ref)).toBe(true);
    expect(matchesSupabaseRef(pooler, `postgres.${ref}`, ref)).toBe(true);
    expect(matchesSupabaseRef("pooler.supabase.com", `postgres.${ref}`, ref)).toBe(true);
    expect(matchesSupabaseRef(`db.${ref}.supabase.co`, "anything", ref)).toBe(true);
  });

  it("rejects deceptive hostnames that merely contain the ref", () => {
    const deceptive = `db.${ref}.supabase.co.evil.example.com`;
    expect(matchesSupabaseRef(deceptive, "postgres", ref)).toBe(false);
    expect(matchesSupabaseRef(`${ref}.evil.example.com`, "postgres", ref)).toBe(false);
    const deceptive2 = `db.${ref}.supabase.co.evil.com`;
    expect(matchesSupabaseRef(deceptive2, `postgres.${ref}`, ref)).toBe(false);
    expect(matchesSupabaseRef("db.otherproject.supabase.co", "postgres", ref)).toBe(false);
    expect(matchesSupabaseRef("attacker.example.com", `postgres.${ref}`, ref)).toBe(false);
  });

  it("rejects usernames that are not exactly postgres.<ref> on pooler hosts", () => {
    const suffixUser = `postgres.${ref}.evil`;
    expect(matchesSupabaseRef(pooler, suffixUser, ref)).toBe(false);
    expect(matchesSupabaseRef(pooler, `evil-${ref}`, ref)).toBe(false);
    expect(matchesSupabaseRef(pooler, ref, ref)).toBe(false);
    expect(matchesSupabaseRef(pooler, "postgres.other", ref)).toBe(false);
    expect(matchesSupabaseRef(pooler, "", ref)).toBe(false);
  });

  it("rejects a trailing-dot host instead of trimming it", () => {
    expect(matchesSupabaseRef(`db.${ref}.supabase.co.`, "postgres", ref)).toBe(false);
  });

  it("rejects a percent-encoded hostname (host escapes are never decoded)", () => {
    const encoded = "db.%75qcmcurhohbdnxzpdpei.supabase.co";
    expect(matchesSupabaseRef(encoded, "postgres", ref)).toBe(false);
  });

  it("decodes percent-encoded usernames before comparing", () => {
    expect(matchesSupabaseRef(pooler, `postgres%2E${ref}`, ref)).toBe(true);
  });

  it("fails closed on undecodable usernames", () => {
    expect(matchesSupabaseRef(pooler, `postgres.${ref}%ZZ`, ref)).toBe(false);
  });

  it("is case-insensitive on host and user", () => {
    const hostUpper = `DB.${ref.toUpperCase()}.supabase.co`;
    expect(matchesSupabaseRef(hostUpper, "postgres", ref)).toBe(true);
    const userUpper = `POSTGRES.${ref.toUpperCase()}`;
    expect(matchesSupabaseRef(pooler.toUpperCase(), userUpper, ref)).toBe(true);
  });
});

describe("isLoopbackHost (exact allowlist)", () => {
  it("accepts exactly localhost, 127.0.0.1, ::1 and [::1]", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("::1")).toBe(true);
    expect(isLoopbackHost("[::1]")).toBe(true);
  });

  it("rejects lookalike hosts", () => {
    expect(isLoopbackHost("localhost.evil.com")).toBe(false);
    expect(isLoopbackHost("127.0.0.1.evil.com")).toBe(false);
    expect(isLoopbackHost("0.0.0.0")).toBe(false);
    expect(isLoopbackHost("")).toBe(false);
  });
});

describe("redaction and ref extraction", () => {
  it("redacts credentials instead of leaking them", () => {
    const url = "postgres://postgres:s3cret@db.example.com:5432/postgres";
    expect(redactDatabaseUrl(url)).toBe("postgres://***@db.example.com:5432/postgres");
  });

  it("redacts passwords containing a raw @ sign without leaking a tail", () => {
    const url = "postgres://user:p@ss@db.example.com:5432/postgres";
    expect(redactDatabaseUrl(url)).toBe("postgres://***@db.example.com:5432/postgres");
  });

  it("drops query and hash entirely", () => {
    const url = "postgres://user:pass@h.example.com:5432/db?sslmode=require";
    expect(redactDatabaseUrl(url)).toBe("postgres://***@h.example.com:5432/db");
  });

  it("leaves credential-less URLs without inventing userinfo", () => {
    const url = "postgres://db.example.com:5432/postgres";
    expect(redactDatabaseUrl(url)).toBe("postgres://db.example.com:5432/postgres");
  });

  it("replaces unparseable input instead of echoing it", () => {
    expect(redactDatabaseUrl("not-a-url")).toBe("<unparseable connection URL>");
    expect(redactDatabaseUrl("postgres://[")).toBe("<unparseable connection URL>");
  });

  it("extracts the Supabase project ref", () => {
    expect(extractSupabaseRef(supabaseUrl)).toBe(ref);
    expect(extractSupabaseRef("https://evil.example.com")).toBeNull();
    expect(extractSupabaseRef("not-a-url")).toBeNull();
  });
});
