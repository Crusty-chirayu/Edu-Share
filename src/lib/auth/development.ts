import { createHash, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

/**
 * Development-only identity adapter.
 *
 * ## What this is
 *
 * A way to exercise the *real* application — sessions, ownership, RLS identity,
 * uploads, bookmarks — on a developer machine before Supabase credentials exist.
 *
 * ## What this is not
 *
 * It is **not** Supabase Auth, it never claims to be, and it cannot be enabled in
 * production: `src/lib/env.ts` refuses to validate a configuration that combines
 * `EDU_SHARE_DEV_AUTH=1` with `NODE_ENV=production`, so the process fails at boot
 * rather than serving silently-authenticated traffic. `isDevAuthEnabled()` repeats
 * the check at the call site, so a code path cannot reach this module by accident
 * either.
 *
 * ## Security properties it does keep
 *
 * - The token is 256 bits from `randomBytes`, stored server-side in process memory;
 *   the cookie carries the token, never a user id, so a client cannot name itself.
 * - The derived auth user id is a SHA-256 of the email, so it is stable across
 *   restarts without the raw email being used as a key.
 * - It does **not** bypass RLS or the identity bridge: the profile id it produces
 *   is fed to the same `withIdentity()` transaction local as a Supabase session
 *   would be, so every authorisation rule still applies.
 *
 * ## Known limitations (documented, not hidden)
 *
 * - Sessions live in the dev server process, so restarting `next dev` signs
 *   everyone out. There is no persistence by design — a persisted dev session
 *   would be a real credential store.
 * - There is no password: this adapter is an identity stand-in, not an
 *   authentication system. The UI labels it as such on every screen where it is
 *   active.
 */

/**
 * The session store is deliberately held on `globalThis` rather than in a
 * module-level `Map`.
 *
 * With a module-level `Map`, every hot reload — which the dev server performs
 * constantly, as ordinary editing compiles new routes — re-evaluates this module
 * and starts from an empty store. The visible effect is that saving any file
 * signs the developer out without warning, and any browser test that spans a
 * compile loses its session halfway through. Neither is a useful property of a
 * development adapter, and neither is inherent to keeping the sessions in memory.
 *
 * This does not weaken anything: the store is still process memory only, still
 * holds opaque random tokens rather than user ids, and is still impossible to
 * enable in production. The global slot is namespaced so it cannot collide with
 * anything else on the object.
 */
const SESSION_STORE_KEY = "__eduShareDevSessions";

type SessionStore = Map<string, DevSession>;

function sessionStore(): SessionStore {
  const globals = globalThis as unknown as Record<string, SessionStore | undefined>;
  const existing = globals[SESSION_STORE_KEY];
  if (existing) return existing;
  const created: SessionStore = new Map<string, DevSession>();
  globals[SESSION_STORE_KEY] = created;
  return created;
}

export const DEV_AUTH_COOKIE = "edu-share-dev-session";

interface DevSession {
  readonly authUserId: string;
  readonly email: string;
  readonly displayName: string;
}

/** The single gate. Returns `false` in production no matter what the env says. */
export function isDevAuthEnabled(): boolean {
  let nodeEnv: string;
  let flag: string;
  try {
    const env = getEnv();
    nodeEnv = env.NODE_ENV;
    flag = env.EDU_SHARE_DEV_AUTH;
  } catch {
    return false;
  }
  if (nodeEnv === "production") return false;
  return flag === "1";
}

/** Fail closed with a message a developer can act on. */
export function assertDevAuthEnabled(): void {
  const env = getEnv();
  if (env.NODE_ENV === "production") {
    throw AppError.forbidden(
      "The development identity adapter is not available in production. Configure Supabase Auth instead.",
    );
  }
  if (!isDevAuthEnabled()) {
    throw AppError.forbidden(
      "The development identity adapter is off. Set EDU_SHARE_DEV_AUTH=1 in .env to use it.",
    );
  }
}

/** Stable, non-reversible auth user id for an email, shaped like a UUID. */
export function devAuthUserIdFor(email: string): string {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  // Version/variant nibbles are set so the value is a well-formed UUID for the
  // `auth_user_id UUID` column.
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}

export function createDevSession(input: { email: string; displayName: string }): {
  token: string;
  session: DevSession;
} {
  assertDevAuthEnabled();
  const token = randomBytes(32).toString("base64url");
  const session: DevSession = {
    authUserId: devAuthUserIdFor(input.email),
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
  };
  sessionStore().set(token, session);
  return { token, session };
}

export function readDevSession(token: string | undefined): DevSession | null {
  if (!token) return null;
  return sessionStore().get(token) ?? null;
}

export function destroyDevSession(token: string | undefined): void {
  if (token) sessionStore().delete(token);
}

/** Test-only: drop every development session. */
export function __resetDevSessions(): void {
  sessionStore().clear();
}
