import { AppError } from "@/lib/errors";
import {
  offsetOf,
  type ResourceCreateInput,
  type ResourceUpdateInput,
  type SearchParams,
} from "@/lib/validation";

/**
 * Pure SQL builders — the only place in the resource data layer where SQL text is
 * assembled.
 *
 * The rule this module exists to enforce:
 *
 * > **No runtime value is ever concatenated into SQL text.**
 *
 * Two mechanisms make that true:
 *
 *  1. Everything that *can* be a bind parameter *is* one. The builders emit
 *     `$1`, `$2`, … and return the matching `values` array, which the caller
 *     hands to `sql.unsafe(text, values)` (postgres.js binds those positionally
 *     over the extended protocol). Search text, pagination, ids, titles and file
 *     metadata all travel as parameters.
 *  2. The only fragments that cannot be parameters — a column list, an equality
 *     on `app_current_user_id()`, and an `ORDER BY` — are **fixed string
 *     constants** or lookups in a frozen allow-list keyed by a Zod-validated
 *     enum. A caller cannot influence their content, only select one of three
 *     pre-approved sort orders.
 *
 * The previous revision interpolated the viewer's profile UUID into the column
 * list with `sql.unsafe(LIST_COLUMNS.replace("@VIEWER", viewerId))`. That is gone:
 * the bookmark flag now reads `public.app_current_user_id()`, which the transaction
 * already carries (set by `withIdentity`), so viewer identity reaches PostgreSQL as
 * *state*, not as SQL text.
 *
 * Being pure, this module is unit-tested without a database. The assertions in
 * `src/lib/validation.test.ts` and `src/db/resources.test.ts` are the regression
 * guard for the interpolation defect.
 */

export interface BuiltQuery {
  text: string;
  values: unknown[];
}

/* ------------------------------------------------------------------ *
 * Fixed fragments (never influenced by input)
 * ------------------------------------------------------------------ */

/**
 * Result columns. Fixed text: no placeholder is substituted at runtime.
 * `bookmarked` and `bookmark_count` resolve from the transaction-local identity.
 */
export const RESOURCE_LIST_COLUMNS = `r.id, r.title, r.description, r.visibility,
      r.resource_type, r.download_count,
      r.file_name, r.file_size_bytes, r.file_mime_type, r.created_at, r.updated_at,
      r.owner_id, p.display_name AS owner_name,
      s.id AS subject_id, s.name AS subject_name, i.name AS institution_name,
      (SELECT count(*) FROM bookmarks b WHERE b.resource_id = r.id)::text AS bookmark_count,
      EXISTS (
        SELECT 1 FROM bookmarks b
        WHERE b.resource_id = r.id AND b.user_id = public.app_current_user_id()
      ) AS bookmarked`;

export const RESOURCE_FROM = `FROM resources r
      JOIN profiles p ON p.id = r.owner_id
      LEFT JOIN subjects s ON s.id = r.subject_id
      LEFT JOIN institutions i ON i.id = s.institution_id`;

/**
 * The shared visibility predicate, mirroring migration 0002's `resources_read`
 * policy. It is applied to the *query*, not as a post-filter, so a private
 * resource is never fetched and then discarded.
 */
export const RESOURCE_VISIBILITY_PREDICATE =
  "(r.visibility = 'public' OR r.owner_id = public.app_current_user_id())";

/** Owner-only predicate — again database-side identity, not a bound parameter. */
export const RESOURCE_OWNER_PREDICATE = "r.owner_id = public.app_current_user_id()";

/** The complete allow-list of `ORDER BY` fragments. Frozen so it cannot drift. */
export const RESOURCE_ORDER_BY: Readonly<Record<SearchParams["sort"], string>> = Object.freeze({
  newest: "r.created_at DESC, r.id ASC",
  oldest: "r.created_at ASC, r.id ASC",
  title: "lower(r.title) ASC, r.id ASC",
});

/**
 * Resolve a sort key to its fixed fragment. Accepts `string` on purpose: the
 * parameter arrives from a query string, and an unrecognised value must fall back
 * to the default rather than reach the SQL text.
 */
export function orderByFragment(sort: string): string {
  const fallback: string = RESOURCE_ORDER_BY.newest;
  if (!Object.prototype.hasOwnProperty.call(RESOURCE_ORDER_BY, sort)) return fallback;
  return RESOURCE_ORDER_BY[sort as SearchParams["sort"]] ?? fallback;
}

/* ------------------------------------------------------------------ *
 * Binding helper
 * ------------------------------------------------------------------ */

function binder(): { values: unknown[]; bind: (value: unknown) => string } {
  const values: unknown[] = [];
  const bind = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };
  return { values, bind };
}

/* ------------------------------------------------------------------ *
 * Resource read paths
 * ------------------------------------------------------------------ */

export interface ResourceQueryOptions {
  /** Restrict to the transaction's own identity (the dashboard query). */
  mine?: boolean;
  /**
   * Restrict to rows the transaction's identity has bookmarked. Uses the same
   * `app_current_user_id()` identity as every other predicate, so `?saved=1` from an
   * anonymous caller resolves to an empty set rather than someone else's list.
   */
  saved?: boolean;
  /** Filter by visibility (e.g. public or private tab in dashboard). */
  visibility?: "public" | "private";
}

/**
 * Build the (paginated list, exact count) query pair for resource discovery.
 *
 * Both statements share the same `WHERE` text, so they cannot disagree about which
 * rows are visible; the count binds only the `WHERE` parameters, the list binds
 * those plus `LIMIT`/`OFFSET`.
 */
export function buildResourceListQuery(
  params: SearchParams,
  options: ResourceQueryOptions = {},
): { list: BuiltQuery; count: BuiltQuery } {
  const { values, bind } = binder();
  const predicates: string[] = [RESOURCE_VISIBILITY_PREDICATE];

  if (options.mine) {
    // The dashboard never trusts a client-supplied owner id: the predicate is the
    // transaction identity, so `?ownerId=` cannot be used to read someone else's
    // private rows.
    predicates.push(RESOURCE_OWNER_PREDICATE);
  } else if (params.ownerId) {
    predicates.push(`r.owner_id = ${bind(params.ownerId)}::uuid`);
  }
  if (params.subjectId) predicates.push(`r.subject_id = ${bind(params.subjectId)}::uuid`);
  if (params.institutionId) {
    predicates.push(`s.institution_id = ${bind(params.institutionId)}::uuid`);
  }
  if (options.saved) {
    // No value is bound: the saved set is defined by the transaction's own identity,
    // so there is nothing a caller could have supplied to widen it.
    predicates.push(
      `EXISTS (
        SELECT 1 FROM bookmarks sb
        WHERE sb.resource_id = r.id AND sb.user_id = public.app_current_user_id()
      )`,
    );
  }
  if (options.visibility) {
    predicates.push(`r.visibility = ${bind(options.visibility)}::text`);
  }
  if (params.q) {
    // Matches the stored generated column and the GIN index from migration 0002.
    predicates.push(`r.search_vector @@ websearch_to_tsquery('english', ${bind(params.q)}::text)`);
  }
  if (params.resourceType) {
    predicates.push(`r.resource_type = ${bind(params.resourceType)}::text`);
  }

  const whereText = `WHERE ${predicates.join("\n      AND ")}`;
  // Snapshot before LIMIT/OFFSET so the count statement binds only WHERE values.
  const whereValues = [...values];
  const limit = bind(params.pageSize);
  const offset = bind(offsetOf(params.page, params.pageSize));

  return {
    list: {
      text: `SELECT ${RESOURCE_LIST_COLUMNS}
    ${RESOURCE_FROM}
    ${whereText}
    ORDER BY ${orderByFragment(params.sort)}
    LIMIT ${limit} OFFSET ${offset}`,
      values,
    },
    count: {
      text: `SELECT count(*)::text AS total
    ${RESOURCE_FROM}
    ${whereText}`,
      values: whereValues,
    },
  };
}

/** One resource, applying the same visibility predicate as the listing. */
export function buildResourceDetailQuery(id: string): BuiltQuery {
  return {
    text: `SELECT ${RESOURCE_LIST_COLUMNS}
    ${RESOURCE_FROM}
    WHERE r.id = $1::uuid AND ${RESOURCE_VISIBILITY_PREDICATE}
    LIMIT 1`,
    values: [id],
  };
}

/* ------------------------------------------------------------------ *
 * Resource write paths — every mutation is owner-scoped in the WHERE clause
 * ------------------------------------------------------------------ */

export function buildResourceInsertQuery(ownerId: string, input: ResourceCreateInput): BuiltQuery {
  const { values, bind } = binder();
  const file = input.file;
  return {
    text: `INSERT INTO resources (
      owner_id, subject_id, title, description, visibility, resource_type,
      file_key, file_name, file_size_bytes, file_mime_type
    ) VALUES (
      ${bind(ownerId)}::uuid, ${bind(input.subjectId ?? null)}::uuid, ${bind(input.title)}::text,
      ${bind(input.description ?? null)}::text, ${bind(input.visibility ?? "public")}::text,
      ${bind(input.resourceType ?? "other")}::text,
      ${bind(file?.key ?? null)}::text, ${bind(file?.name ?? null)}::text,
      ${bind(file?.sizeBytes ?? null)}::bigint, ${bind(file?.mimeType ?? null)}::text
    )
    RETURNING id`,
    values,
  };
}

/**
 * Partial update. The `SET` list is assembled from a **fixed allow-list of column
 * assignments**; a column appears only when its field was supplied, and the value
 * is always bound. `owner_id` is in the `WHERE`, so a non-owner updates zero rows
 * and receives the same 404 as a missing resource.
 */
export function buildResourceUpdateQuery(
  id: string,
  ownerId: string,
  input: ResourceUpdateInput,
): BuiltQuery {
  const { values, bind } = binder();
  const assignments: string[] = [];

  if (input.title !== undefined) assignments.push(`title = ${bind(input.title)}::text`);
  if (input.description !== undefined) {
    assignments.push(`description = ${bind(input.description)}::text`);
  }
  if (input.subjectId !== undefined) {
    assignments.push(`subject_id = ${bind(input.subjectId)}::uuid`);
  }
  if (input.visibility !== undefined) {
    assignments.push(`visibility = ${bind(input.visibility)}::text`);
  }
  if (input.resourceType !== undefined) {
    assignments.push(`resource_type = ${bind(input.resourceType)}::text`);
  }
  const file = input.file;
  if (file) {
    assignments.push(`file_key = ${bind(file.key)}::text`);
    assignments.push(`file_name = ${bind(file.name)}::text`);
    assignments.push(`file_size_bytes = ${bind(file.sizeBytes)}::bigint`);
    assignments.push(`file_mime_type = ${bind(file.mimeType)}::text`);
  }

  if (assignments.length === 0) {
    throw AppError.invalid({ form: "provide at least one field to update" });
  }
  assignments.push("updated_at = now()");

  const idParam = bind(id);
  const ownerParam = bind(ownerId);
  return {
    text: `UPDATE resources SET ${assignments.join(", ")}
    WHERE id = ${idParam}::uuid AND owner_id = ${ownerParam}::uuid
    RETURNING id`,
    values,
  };
}

/** Returns the previous `file_key` so the caller can delete the replaced object. */
export function buildResourceDeleteQuery(id: string, ownerId: string): BuiltQuery {
  return {
    text: `DELETE FROM resources
    WHERE id = $1::uuid AND owner_id = $2::uuid
    RETURNING id, file_key`,
    values: [id, ownerId],
  };
}

/* ------------------------------------------------------------------ *
 * Bookmarks
 * ------------------------------------------------------------------ */

export function buildBookmarkDeleteQuery(userId: string, resourceId: string): BuiltQuery {
  return {
    text: `DELETE FROM bookmarks
    WHERE user_id = $1::uuid AND resource_id = $2::uuid
    RETURNING resource_id`,
    values: [userId, resourceId],
  };
}

export function buildBookmarkInsertQuery(userId: string, resourceId: string): BuiltQuery {
  return {
    text: `INSERT INTO bookmarks (user_id, resource_id)
    VALUES ($1::uuid, $2::uuid)
    ON CONFLICT DO NOTHING
    RETURNING resource_id`,
    values: [userId, resourceId],
  };
}

/**
 * A bookmark may only reference a resource the caller can actually see. Enforcing
 * that here means a direct POST cannot save — or probe the existence of — a
 * private resource belonging to somebody else.
 */
export function buildBookmarkVisibilityQuery(resourceId: string, userId: string): BuiltQuery {
  return {
    text: `SELECT 1 AS one FROM resources r
    WHERE r.id = $1::uuid
      AND (r.visibility = 'public' OR r.owner_id = $2::uuid)
    LIMIT 1`,
    values: [resourceId, userId],
  };
}

/* ------------------------------------------------------------------ *
 * Profiles
 * ------------------------------------------------------------------ */

/** `email` is deliberately absent: no read projection needs it. */
export const PUBLIC_PROFILE_COLUMNS = "id, display_name, role, created_at";

export function buildProfileByAuthUserQuery(authUserId: string): BuiltQuery {
  return {
    text: `SELECT id, auth_user_id, display_name, role, created_at
    FROM public.profiles WHERE auth_user_id = $1::uuid LIMIT 1`,
    values: [authUserId],
  };
}

export function buildProfileByIdQuery(id: string): BuiltQuery {
  // `public_profiles` (migration 0003) omits `email` by construction, so a public
  // profile read cannot leak it even if a policy were to be bypassed.
  return {
    text: `SELECT ${PUBLIC_PROFILE_COLUMNS} FROM public.public_profiles WHERE id = $1::uuid LIMIT 1`,
    values: [id],
  };
}

/**
 * Session bootstrap: verified Supabase auth user id -> app profile id.
 *
 * This goes through `public.app_profile_for_auth_user()`, a SECURITY DEFINER
 * function created by migration 0003. Without it the mapping would be circular:
 * `profiles_read` needs `app.user_id` to permit the read, and `app.user_id` can only
 * be set once the profile id is known. The function returns a surrogate key and
 * nothing else, and is revoked from PUBLIC.
 */
export function buildProfileIdByAuthUserQuery(authUserId: string): BuiltQuery {
  return {
    text: `SELECT public.app_profile_for_auth_user($1::uuid) AS profile_id`,
    values: [authUserId],
  };
}

/**
 * The profile id is generated by the *application*, not by the database default,
 * because the RLS `profiles_insert_self` policy requires `id = app_current_user_id()`
 * — the transaction must already know the identity it is creating.
 */
export function buildProfileInsertQuery(input: {
  id: string;
  authUserId: string;
  displayName: string;
  email: string | null;
}): BuiltQuery {
  return {
    text: `INSERT INTO profiles (id, auth_user_id, display_name, email)
    VALUES ($1::uuid, $2::uuid, $3::text, $4::text)
    ON CONFLICT (auth_user_id) DO NOTHING
    RETURNING id, auth_user_id, display_name, role, created_at`,
    values: [input.id, input.authUserId, input.displayName, input.email],
  };
}

/** Owner-only. `role` is not in the allow-list, by construction. */
export function buildProfileUpdateQuery(
  id: string,
  input: { displayName?: string; email?: string | null },
): BuiltQuery {
  const { values, bind } = binder();
  const assignments: string[] = [];
  if (input.displayName !== undefined) {
    assignments.push(`display_name = ${bind(input.displayName)}::text`);
  }
  if (input.email !== undefined) assignments.push(`email = ${bind(input.email)}::text`);
  if (assignments.length === 0) {
    throw AppError.invalid({ form: "provide at least one field to update" });
  }
  const idParam = bind(id);
  return {
    text: `UPDATE profiles SET ${assignments.join(", ")}
    WHERE id = ${idParam}::uuid
    RETURNING ${PUBLIC_PROFILE_COLUMNS}`,
    values,
  };
}

/* ------------------------------------------------------------------ *
 * Taxonomy (reference data — read-only for every client)
 * ------------------------------------------------------------------ */

export function buildListSubjectsQuery(institutionId?: string): BuiltQuery {
  const { values, bind } = binder();
  const where = institutionId ? `WHERE s.institution_id = ${bind(institutionId)}::uuid` : "";
  return {
    text: `SELECT s.id, s.name, s.code, s.department, s.semester, s.institution_id, i.name AS institution_name
    FROM subjects s JOIN institutions i ON i.id = s.institution_id
    ${where}
    ORDER BY i.name, s.name
    LIMIT 500`,
    values,
  };
}

export function buildListInstitutionsQuery(): BuiltQuery {
  return {
    text: `SELECT i.id, i.name,
      (SELECT count(*) FROM subjects s WHERE s.institution_id = i.id)::text AS subject_count
    FROM institutions i
    ORDER BY i.name
    LIMIT 200`,
    values: [],
  };
}

/** Ownership-only read used before issuing a download credential. */
export function buildResourceFileQuery(id: string): BuiltQuery {
  return {
    text: `SELECT r.file_key, r.file_name, r.file_mime_type, r.file_size_bytes, r.owner_id
    FROM resources r
    WHERE r.id = $1::uuid AND ${RESOURCE_VISIBILITY_PREDICATE}
    LIMIT 1`,
    values: [id],
  };
}

/* ------------------------------------------------------------------ *
 * Resource Reports (M0007)
 * ------------------------------------------------------------------ */

export function buildReportInsertQuery(
  resourceId: string,
  reporterId: string,
  category: string,
  details?: string | null,
): BuiltQuery {
  const { values, bind } = binder();
  return {
    text: `INSERT INTO resource_reports (resource_id, reporter_id, category, details)
    VALUES (${bind(resourceId)}::uuid, ${bind(reporterId)}::uuid, ${bind(category)}::text, ${bind(details ?? null)}::text)
    ON CONFLICT (reporter_id, resource_id) DO UPDATE
      SET category = EXCLUDED.category, details = EXCLUDED.details
    RETURNING id, resource_id, reporter_id, category, details, status, created_at`,
    values,
  };
}
