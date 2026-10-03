import { guarded, run, type Sql } from "@/db/query";
import { AppError } from "@/lib/errors";
import {
  buildProfileByAuthUserQuery,
  buildProfileByIdQuery,
  buildProfileIdByAuthUserQuery,
  buildProfileInsertQuery,
  buildProfileUpdateQuery,
} from "@/lib/sql";

/**
 * Profile data access — the identity side of the domain.
 *
 * Two separations this module keeps:
 *
 *  1. **Public vs. private projection.** `getPublicProfile` reads
 *     `public.public_profiles` (migration 0003), a view that does not contain an
 *     `email` column at all. No public read path in this application can therefore
 *     return an email address, regardless of what a query string asks for.
 *  2. **Role is never writable here.** `profiles.role` exists so the schema can
 *     express a future moderation path, but no function in this module accepts it:
 *     a caller cannot promote themselves through a profile update (inherited
 *     `AUD-002`).
 */

export interface PublicProfile {
  id: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
  createdAt: Date;
}

export interface IdentityProfile extends PublicProfile {
  authUserId: string | null;
}

interface ProfileRow {
  id: string;
  display_name: string;
  role: PublicProfile["role"];
  created_at: Date;
}

interface IdentityRow extends ProfileRow {
  auth_user_id: string | null;
}

function toPublicProfile(row: ProfileRow): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

function toIdentityProfile(row: IdentityRow): IdentityProfile {
  return { ...toPublicProfile(row), authUserId: row.auth_user_id };
}

/** Public author projection — reads the email-free view. */
export async function getPublicProfile(sql: Sql, id: string): Promise<PublicProfile | null> {
  return guarded(async () => {
    const rows = await run<ProfileRow[]>(sql, buildProfileByIdQuery(id));
    const row = rows[0];
    return row ? toPublicProfile(row) : null;
  });
}

/**
 * Maps a *server-verified* Supabase auth user id to an application profile id.
 *
 * Uses `public.app_profile_for_auth_user()` from migration 0003. Plain SQL cannot
 * do this: `profiles_read` requires `app.user_id`, which requires the profile id.
 * The function is SECURITY DEFINER, returns only a surrogate key, and is revoked
 * from PUBLIC, so it is not reachable by an anonymous database client.
 *
 * Must be called **without** an identity set (`withIdentity(null, …)`).
 */
export async function resolveProfileId(sql: Sql, authUserId: string): Promise<string | null> {
  return guarded(async () => {
    const rows = await run<{ profile_id: string | null }[]>(
      sql,
      buildProfileIdByAuthUserQuery(authUserId),
    );
    return rows[0]?.profile_id ?? null;
  });
}

/** Reads the full profile row for an already-authenticated user (contains no email). */
export async function readProfileByAuthUserId(
  sql: Sql,
  authUserId: string,
): Promise<IdentityProfile | null> {
  return guarded(async () => {
    const rows = await run<IdentityRow[]>(sql, buildProfileByAuthUserQuery(authUserId));
    const row = rows[0];
    return row ? toIdentityProfile(row) : null;
  });
}

/**
 * Insert-if-absent. `ON CONFLICT DO NOTHING` keeps this safe to call on every
 * request: the winner's row is read back instead of duplicated. Returns `null` when
 * the row already existed.
 */
export async function insertProfileIfAbsent(
  sql: Sql,
  input: { id: string; authUserId: string; displayName: string; email: string | null },
): Promise<IdentityProfile | null> {
  return guarded(async () => {
    const rows = await run<IdentityRow[]>(sql, buildProfileInsertQuery(input));
    const row = rows[0];
    return row ? toIdentityProfile(row) : null;
  });
}

/** Owner-only profile edit. `role` is not writable through this path. */
export async function updateProfile(
  sql: Sql,
  id: string,
  input: { displayName?: string; email?: string | null },
): Promise<PublicProfile> {
  return guarded(async () => {
    const rows = await run<ProfileRow[]>(sql, buildProfileUpdateQuery(id, input));
    const row = rows[0];
    if (!row) throw AppError.notFound();
    return toPublicProfile(row);
  });
}
