import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * M3 Supabase boundary — lazy client for the approved Supabase PostgreSQL path.
 * Returns null when Supabase is not configured (local Docker is the default).
 * Auth/storage product use arrives in M5/M7; this only establishes the safe
 * integration point + documents the migration workflow (see docs/SUPABASE.md).
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

/** Test-only reset. */
export function __resetSupabase(): void {
  client = null;
}
