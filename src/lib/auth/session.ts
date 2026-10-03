import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getPublicProfile, insertProfileIfAbsent, resolveProfileId } from "@/db/profiles";
import type { PublicProfile } from "@/db/profiles";
import { withIdentity } from "@/db/query";
import { DEV_AUTH_COOKIE, isDevAuthEnabled, readDevSession } from "@/lib/auth/development";
import { ReadOnlyCookieStore } from "@/lib/auth/cookies";
import { isSupabaseAuthConfigured, readVerifiedUser } from "@/lib/auth/supabase-server";
import { AppError } from "@/lib/errors";

/**
 * The application's session boundary.
 *
 * Authorisation always starts here. A page or route handler asks for a `Session` and
 * receives a **profile id that the server derived from a verified identity** — never
 * an id from a request body, query string or header. Everything downstream
 * (`withIdentity`, the RLS policies, the owner-scoped statements) depends on that
 * invariant holding.
 *
 * Two identity providers, in strict priority order:
 *
 *  1. **Supabase Auth** — used whenever the project is configured. The access token
 *     is verified against the Supabase Auth server (`auth.getUser()`), not merely
 *     read from a cookie.
 *  2. **Development adapter** — only when `EDU_SHARE_DEV_AUTH=1` *and* `NODE_ENV` is
 *     not `production`. See `src/lib/auth/development.ts` for what it does and does
 *     not guarantee.
 *
 * With neither available, `getSession()` returns `null` and every protected route
 * renders its signed-out state. There is no third path, and nothing here falls back
 * to a default user.
 */

export type SessionMode = "supabase" | "development";

export interface Session {
  /** The application's profile id — the value used for ownership and RLS identity. */
  profileId: string;
  /** The identity provider's user id. Never exposed to the browser. */
  authUserId: string;
  displayName: string;
  role: PublicProfile["role"];
  mode: SessionMode;
  /** Drives the persistent "development identity" label in the UI. */
  isDevelopmentIdentity: boolean;
}

interface VerifiedIdentity {
  authUserId: string;
  email: string | null;
  displayName: string;
}

/** Reads the request's cookies into a read-only store (Server Components may not write). */
export async function readIncomingCookieStore(): Promise<ReadOnlyCookieStore> {
  const store = await cookies();
  return new ReadOnlyCookieStore(store.getAll().map(({ name, value }) => ({ name, value })));
}

function fallbackDisplayName(identity: VerifiedIdentity): string {
  const candidate = identity.displayName.trim();
  if (candidate.length > 0) return candidate.slice(0, 80);
  const localPart = identity.email?.split("@")[0]?.trim() ?? "";
  return (localPart.length > 0 ? localPart : "EDU-SHARE member").slice(0, 80);
}

/**
 * Maps a verified identity onto a profile row, creating it on first sight.
 *
 * The profile UUID is minted here rather than by the database, because the
 * `profiles_insert_self` RLS policy requires `id = app_current_user_id()`: the
 * transaction must already know the identity it is inserting. The lookup itself goes
 * through the `app_profile_for_auth_user()` bridge from migration 0003, since RLS
 * cannot permit the mapping lookup before `app.user_id` is set.
 */
async function provisionProfile(identity: VerifiedIdentity): Promise<Session> {
  const existingId = await withIdentity(null, (sql) => resolveProfileId(sql, identity.authUserId));
  const profileId = existingId ?? randomUUID();

  if (!existingId) {
    await withIdentity(profileId, (sql) =>
      insertProfileIfAbsent(sql, {
        id: profileId,
        authUserId: identity.authUserId,
        displayName: fallbackDisplayName(identity),
        email: identity.email,
      }),
    );
  }

  // Re-resolve: on a concurrent first request the winner's row is the authoritative
  // one, and this makes the loser converge on it instead of inventing a second row.
  const resolvedId =
    existingId ??
    (await withIdentity(null, (sql) => resolveProfileId(sql, identity.authUserId))) ??
    profileId;

  const profile = await withIdentity(resolvedId, (sql) => getPublicProfile(sql, resolvedId));
  return {
    profileId: resolvedId,
    authUserId: identity.authUserId,
    displayName: profile?.displayName ?? fallbackDisplayName(identity),
    role: profile?.role ?? "student",
    mode: "supabase",
    isDevelopmentIdentity: false,
  };
}

/**
 * Per-request memoised session lookup. `cache` means the identity provider is
 * consulted once per request even though the top bar, the page and several
 * components all ask for the session.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await readIncomingCookieStore();

  if (isSupabaseAuthConfigured()) {
    const verified = await readVerifiedUser(store);
    if (!verified) return null;
    return provisionProfile({
      authUserId: verified.id,
      email: verified.email,
      displayName: verified.displayName ?? "",
    });
  }

  if (isDevAuthEnabled()) {
    const dev = readDevSession(store.get(DEV_AUTH_COOKIE));
    if (!dev) return null;
    const session = await provisionProfile({
      authUserId: dev.authUserId,
      email: dev.email,
      displayName: dev.displayName,
    });
    return { ...session, mode: "development", isDevelopmentIdentity: true };
  }

  return null;
});

/** For protected pages and mutations. Throws `unauthorized` (401) when signed out. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw AppError.unauthorized("Sign in to continue.");
  }
  return session;
}

/** The only sanctioned way to obtain an identity for `withIdentity`. */
export async function requireProfileId(): Promise<string> {
  return (await requireSession()).profileId;
}

/** Whether any identity provider is usable in this deployment. */
export function identityProvidersAvailable(): boolean {
  return isSupabaseAuthConfigured() || isDevAuthEnabled();
}

/** Whether real Supabase Authentication is wired up (as opposed to the dev adapter). */
export function isRealAuthConfigured(): boolean {
  return isSupabaseAuthConfigured();
}
