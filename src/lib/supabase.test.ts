import { describe, expect, it } from "vitest";
import { __resetSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { __resetEnvCache } from "@/lib/env";

describe("supabase boundary", () => {
  it("reports unconfigured when env has no Supabase keys", () => {
    process.env["DATABASE_URL"] = "postgres://postgres:postgres@127.0.0.1:5432/edushare";
    process.env["APP_URL"] = "http://localhost:3000";
    process.env["NEXT_PUBLIC_SUPABASE_URL"] = "";
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "";
    __resetEnvCache();
    __resetSupabase();
    expect(isSupabaseConfigured()).toBe(false);
    __resetSupabase();
    __resetEnvCache();
  });
});
