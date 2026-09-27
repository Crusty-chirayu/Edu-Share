import { getEnv } from "@/lib/env";

/**
 * Write-target safety guard (M3 Supabase verification).
 *
 * The migration runner and seed write to whichever database the environment
 * points at. This module refuses writes unless the target is provably safe:
 *   - loopback (local Docker / CI service), or
 *   - an EXACT match for the Supabase project in NEXT_PUBLIC_SUPABASE_URL:
 *     hostname exactly `db.<ref>.supabase.co` (direct), or a
 *     `*.pooler.supabase.com` hostname used with the user exactly
 *     `postgres.<ref>` (pooled). Substring/containment matches are refused,
 *     so a deceptive host like `db.<ref>.supabase.co.evil.example.com` never
 *     passes.
 *
 * Read-only `status` deliberately bypasses this guard so the database can
 * always be inspected safely first.
 *
 * Nothing secret is ever returned or logged here: only hostnames (not
 * credentials) and the public project ref (part of the public Supabase URL).
 */

export type WriteTargetVia = "DIRECT_URL" | "DATABASE_URL";

export interface WriteTarget {
  host: string;
  ref: string | null;
  via: WriteTargetVia;
}

/** Effective write target: DIRECT_URL when set, else DATABASE_URL. */
export function getEffectiveDatabaseUrl(): string {
  const env = getEnv();
  const direct = env.DIRECT_URL?.trim() ?? "";
  return direct.length > 0 ? direct : env.DATABASE_URL;
}

/**
 * Redact credentials for any message that mentions a connection URL.
 * Rebuilds the URL from parsed components, so userinfo is dropped wholesale —
 * passwords containing raw `@`, `?`, `/` or `#` can never leak. Anything that
 * does not parse (and is therefore also refused by assertWriteTarget) is
 * replaced entirely rather than echoed.
 */
export function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hasUserinfo = parsed.username !== "" || parsed.password !== "";
    const authority = hasUserinfo ? `***@${parsed.host}` : parsed.host;
    // Query/hash are dropped deliberately: they are never needed to identify
    // a write target and could carry sensitive parameters.
    return `${parsed.protocol}//${authority}${parsed.pathname}`;
  } catch {
    return "<unparseable connection URL>";
  }
}

/** Extract `<ref>` from `https://<ref>.supabase.co` (public URL — safe to handle). */
export function extractSupabaseRef(supabaseUrl: string): string | null {
  const match = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/.exec(supabaseUrl.trim());
  return match?.[1] ?? null;
}

/** Exact loopback allowlist — WHATWG URLs keep IPv6 literals bracketed (`[::1]`). */
export function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

/**
 * Exact (never substring) match of a database target against our Supabase
 * project ref. `user` is the raw, possibly percent-encoded URL username.
 * Direct connections are verified by hostname alone; pooled connections
 * require both a `*.pooler.supabase.com` hostname and the exact
 * `postgres.<ref>` username.
 */
export function matchesSupabaseRef(host: string, user: string, ref: string): boolean {
  const want = ref.toLowerCase();
  const h = host.toLowerCase();
  if (h === `db.${want}.supabase.co`) return true;
  const pooled = h === "pooler.supabase.com" || h.endsWith(".pooler.supabase.com");
  if (!pooled) return false;
  try {
    return decodeURIComponent(user).toLowerCase() === `postgres.${want}`;
  } catch {
    return false; // undecodable username — fail closed
  }
}

/**
 * Verify the effective write target and return its public identity.
 * Throws (refusing the write) when the target is remote but cannot be proven
 * to be our Supabase project.
 */
export function assertWriteTarget(): WriteTarget {
  const env = getEnv();
  const via: WriteTargetVia = env.DIRECT_URL?.trim() ? "DIRECT_URL" : "DATABASE_URL";
  const raw = getEffectiveDatabaseUrl();

  let host = "";
  let user = "";
  try {
    const parsed = new URL(raw);
    host = parsed.hostname.toLowerCase();
    user = parsed.username; // raw; matchesSupabaseRef decodes it
  } catch {
    throw new Error("Refusing database write: the effective connection URL is not parseable.");
  }

  if (isLoopbackHost(host)) return { host, ref: null, via };

  const expectedRef = extractSupabaseRef(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!expectedRef) {
    throw new Error(
      `Refusing database write to remote host "${host}": NEXT_PUBLIC_SUPABASE_URL is unset, ` +
        `so the target project cannot be verified. Set it to https://<ref>.supabase.co first.`,
    );
  }
  if (!matchesSupabaseRef(host, user, expectedRef)) {
    throw new Error(
      `Refusing database write: target host "${host}" does not match Supabase project ` +
        `ref "${expectedRef}" (expected exactly "db.${expectedRef}.supabase.co", or a ` +
        `"*.pooler.supabase.com" host used with the user "postgres.${expectedRef}"). ` +
        `Check DIRECT_URL / DATABASE_URL before retrying.`,
    );
  }
  return { host, ref: expectedRef, via };
}
