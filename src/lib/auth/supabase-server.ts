import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { AUTH_COOKIE_PREFIX, ChunkedCookieStorage, type SyncCookieStore } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Supabase Authentication boundary.
 *
 * Uses `@supabase/supabase-js` alone — the version the project already pins — with a
 * cookie-backed storage adapter (`ChunkedCookieStorage`). No new dependency is
 * introduced and no service-role key is ever used: every call authenticates as the
 * end user with the project's public anon key.
 *
 * Identity is verified **server-side** with `auth.getUser()`, which validates the
 * access token against the Supabase Auth server. `auth.getSession()` is deliberately
 * not used for authorization decisions: it reads a cookie the client controls and
 * only proves that *something* was stored, not that the token is genuine.
 */

export function isSupabaseAuthConfigured(): boolean {
  try {
    const env = getEnv();
    return env.NEXT_PUBLIC_SUPABASE_URL !== "" && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "";
  } catch {
    // An invalid environment counts as "not configured" here; the caller's own
    // `getEnv()` is what surfaces the configuration error.
    return false;
  }
}

/** A client whose session lives in the supplied cookie store. */
export function createSupabaseClientWithStore(store: SyncCookieStore): SupabaseClient | null {
  const env = getEnv();
  if (env.NEXT_PUBLIC_SUPABASE_URL === "" || env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "") return null;

  const storage = new ChunkedCookieStorage(store, AUTH_COOKIE_PREFIX);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      // Refreshing happens in middleware, where a response can carry the rotated
      // cookies; a background timer is not usable in a serverless request.
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => storage.getItem(key),
        setItem: (key: string, value: string) => storage.setItem(key, value),
        removeItem: (key: string) => storage.removeItem(key),
      },
    },
  });
}

export interface VerifiedAuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

/** Derives a display name from provider metadata, never from a client payload. */
function toVerifiedUser(user: User): VerifiedAuthUser {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidate =
    typeof metadata["display_name"] === "string"
      ? metadata["display_name"]
      : typeof metadata["full_name"] === "string"
        ? metadata["full_name"]
        : null;
  const localPart = user.email ? (user.email.split("@")[0] ?? null) : null;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: candidate?.trim() || localPart || null,
  };
}

/**
 * Server-verified identity for the request's session. Returns `null` for an
 * anonymous visitor, an unconfigured project, or an invalid/expired token.
 */
export async function readVerifiedUser(store: SyncCookieStore): Promise<VerifiedAuthUser | null> {
  const supabase = createSupabaseClientWithStore(store);
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return toVerifiedUser(data.user);
  } catch (error) {
    logger.warn("supabase getUser failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export interface AuthOutcome {
  ok: boolean;
  /** A message safe to display. Deliberately generic for credential failures. */
  message: string;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  /** False when Supabase requires the address to be confirmed before a session. */
  hasSession: boolean;
}

/**
 * Credential failures return one message for both "unknown address" and "wrong
 * password", so the endpoint cannot be used to enumerate registered addresses.
 */
const GENERIC_CREDENTIAL_MESSAGE = "That email address and password did not match an account.";

const NOT_CONFIGURED_MESSAGE = "Supabase Authentication is not configured on this deployment.";

function failure(message: string): AuthOutcome {
  return { ok: false, message, userId: null, email: null, displayName: null, hasSession: false };
}

export async function signUpWithPassword(
  store: SyncCookieStore,
  input: { email: string; password: string; displayName: string },
): Promise<AuthOutcome> {
  const supabase = createSupabaseClientWithStore(store);
  if (!supabase) return failure(NOT_CONFIGURED_MESSAGE);

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.displayName } },
  });
  if (error) return failure(error.message);
  return {
    ok: true,
    message: data.session
      ? "Account created and signed in."
      : "Account created. Check your email to confirm the address, then sign in.",
    userId: data.user?.id ?? null,
    email: data.user?.email ?? input.email,
    displayName: input.displayName,
    hasSession: data.session !== null,
  };
}

export async function signInWithPassword(
  store: SyncCookieStore,
  input: { email: string; password: string },
): Promise<AuthOutcome> {
  const supabase = createSupabaseClientWithStore(store);
  if (!supabase) return failure(NOT_CONFIGURED_MESSAGE);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error || !data.user) return failure(GENERIC_CREDENTIAL_MESSAGE);

  const verified = toVerifiedUser(data.user);
  return {
    ok: true,
    message: "Signed in.",
    userId: verified.id,
    email: verified.email,
    displayName: verified.displayName,
    hasSession: data.session !== null,
  };
}

export async function signOutWithStore(store: SyncCookieStore): Promise<void> {
  const supabase = createSupabaseClientWithStore(store);
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (error) {
    // A failed remote sign-out must still clear the local session, so the error is
    // logged and swallowed rather than leaving the user apparently signed in.
    logger.warn("supabase signOut failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Rotates the session when the access token is about to expire. Called from
 * middleware only, because that is the one place a response exists to carry the new
 * cookies. At most one network call, and only when the token is genuinely near
 * expiry — not on every request.
 */
export async function refreshSessionIfExpiring(store: SyncCookieStore): Promise<void> {
  const supabase = createSupabaseClientWithStore(store);
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    if (expiresAt - nowSeconds > 60) return;
    await supabase.auth.refreshSession();
  } catch (error) {
    logger.warn("supabase session refresh failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}
