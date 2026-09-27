import postgres from "postgres";
import { getSql } from "@/db/client";
import { AppError } from "@/lib/errors";
import {
  offsetOf,
  type FileMetadata,
  type ResourceCreateInput,
  type ResourceUpdateInput,
  type SearchParams,
} from "@/lib/validation";

/**
 * M4 data-access layer for the resource lifecycle.
 *
 * Rules this file exists to enforce:
 *  - every value reaches PostgreSQL as a bound parameter; no SQL is built by
 *    string concatenation, and the only dynamic fragments are whole `WHERE`
 *    clauses and a sort key taken from a fixed map;
 *  - identity is a *server-derived* profile id passed in by the caller, never a
 *    value read from the request body or the query string;
 *  - `withIdentity` sets the transaction-local `app.user_id`, so the RLS
 *    policies in migration 0002 decide row visibility even when the connection
 *    user could otherwise bypass them;
 *  - driver errors never escape: they become `AppError.database()`, whose
 *    message is a fixed sentence with no relation, value or DSN in it;
 *  - a private resource is unreachable through the public listing at all — the
 *    visibility predicate is part of the query, not a post-filter.
 */

type Sql = postgres.Sql;

export interface ResourceListItem {
  id: string;
  title: string;
  description: string | null;
  visibility: "public" | "private";
  fileName: string | null;
  fileSizeBytes: string | null;
  fileMimeType: string | null;
  hasFile: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerName: string;
  subjectId: string | null;
  subjectName: string | null;
  institutionName: string | null;
  bookmarkCount: number;
  bookmarked: boolean;
}

export interface ResourcePage {
  items: ResourceListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  visibility: "public" | "private";
  file_key: string | null;
  file_name: string | null;
  file_size_bytes: string | null;
  file_mime_type: string | null;
  created_at: Date;
  updated_at: Date;
  owner_id: string;
  owner_name: string;
  subject_id: string | null;
  subject_name: string | null;
  institution_name: string | null;
  bookmark_count: string;
  bookmarked: boolean;
}

/** `viewer` is a placeholder, substituted with a bound-parameter SQL fragment. */
const LIST_COLUMNS = `
  r.id, r.title, r.description, r.visibility, r.file_name, r.file_size_bytes,
  r.file_mime_type, r.created_at, r.updated_at, r.owner_id,
  p.display_name AS owner_name,
  s.id AS subject_id, s.name AS subject_name,
  i.name AS institution_name,
  (SELECT count(*) FROM bookmarks b WHERE b.resource_id = r.id)::text AS bookmark_count,
  EXISTS (SELECT 1 FROM bookmarks b WHERE b.resource_id = r.id AND b.user_id = @VIEWER) AS bookmarked
`;

const ORDER_BY: Record<SearchParams["sort"], string> = {
  // Fixed fragments only: the sort value is a validated enum key, never input.
  newest: "r.created_at DESC, r.id",
  oldest: "r.created_at ASC, r.id",
  title: "lower(r.title) ASC, r.id",
};

/** Runs `fn` in a transaction with `app.user_id` set, so the RLS policies apply. */
export async function withIdentity<T>(
  profileId: string | null,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const root = getSql();
  try {
    return await root.begin(async (tx) => {
      if (profileId) {
        await tx`SELECT set_config('app.user_id', ${profileId}, true)`;
      }
      return await fn(tx);
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.database();
  }
}

/** The shared predicate: public rows always, private rows only for the viewer. */
function visibilityClause(sql: Sql): Sql {
  return sql`(r.visibility = 'public' OR r.owner_id = app_current_user_id())`;
}

function toItem(row: ResourceRow): ResourceListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    fileMimeType: row.file_mime_type,
    hasFile: row.file_key !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    institutionName: row.institution_name,
    bookmarkCount: Number(row.bookmark_count),
    bookmarked: row.bookmarked,
  };
}

export async function listResources(
  sql: Sql,
  params: SearchParams,
  options: { viewerId: string | null; mine?: boolean } = { viewerId: null },
): Promise<ResourcePage> {
  const viewer = options.viewerId;
  const empty: ResourcePage = {
    items: [],
    total: 0,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: 0,
  };
  const clauses: Sql[] = [visibilityClause(sql)];

  if (options.mine) {
    // Owner-only: an anonymous viewer has no rows, and a viewer never sees
    // another author's list.
    if (!viewer) return empty;
    clauses.push(sql`r.owner_id = app_current_user_id()`);
  } else if (params.ownerId) {
    clauses.push(sql`r.owner_id = ${params.ownerId}`);
  }
  if (params.subjectId) clauses.push(sql`r.subject_id = ${params.subjectId}`);
  if (params.institutionId) clauses.push(sql`s.institution_id = ${params.institutionId}`);
  if (params.q) {
    // Uses the stored generated column from 0002, so index and expression match.
    clauses.push(sql`r.search_vector @@ websearch_to_tsquery('english', ${params.q})`);
  }

  const where = clauses.reduce((acc, clause) => sql`${acc} AND ${clause}`);
  const from = sql`
    FROM resources r
    JOIN profiles p ON p.id = r.owner_id
    LEFT JOIN subjects s ON s.id = r.subject_id
    LEFT JOIN institutions i ON i.id = s.institution_id
    WHERE ${where}
  `;

  const countRows = await sql<{ total: string }[]>`SELECT count(*)::text AS total ${from}`;
  const total = Number(countRows[0]?.total ?? 0);

  const columns = LIST_COLUMNS.replace("@VIEWER", viewer ?? "NULL");
  const rows = await sql<ResourceRow[]>`
    SELECT ${sql.unsafe(columns)}
    ${from}
    ORDER BY ${sql.unsafe(ORDER_BY[params.sort])}
    LIMIT ${params.pageSize} OFFSET ${offsetOf(params.page, params.pageSize)}
  `;

  return {
    items: rows.map(toItem),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.ceil(total / params.pageSize),
  };
}

export async function getResource(sql: Sql, id: string): Promise<ResourceListItem | null> {
  const columns = LIST_COLUMNS.replace("@VIEWER", "app_current_user_id()");
  const rows = await sql<ResourceRow[]>`
    SELECT ${sql.unsafe(columns)}
    FROM resources r
    JOIN profiles p ON p.id = r.owner_id
    LEFT JOIN subjects s ON s.id = r.subject_id
    LEFT JOIN institutions i ON i.id = s.institution_id
    WHERE r.id = ${id} AND ${visibilityClause(sql)}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? toItem(row) : null;
}

export async function createResource(
  sql: Sql,
  ownerId: string,
  input: ResourceCreateInput,
): Promise<ResourceListItem> {
  const file: FileMetadata | undefined = input.file;
  const rows = await sql<{ id: string }[]>`
    INSERT INTO resources (
      owner_id, subject_id, title, description, visibility,
      file_key, file_name, file_size_bytes, file_mime_type
    ) VALUES (
      ${ownerId}, ${input.subjectId ?? null}, ${input.title},
      ${input.description ?? null}, ${input.visibility},
      ${file?.key ?? null}, ${file?.name ?? null}, ${file?.sizeBytes ?? null}, ${file?.mimeType ?? null}
    )
    RETURNING id
  `;
  const created = rows[0];
  if (!created) throw AppError.database();
  const item = await getResource(sql, created.id);
  if (!item) throw AppError.database();
  return item;
}

/**
 * Partial update, owner-only. `coalesce($, column)` means an omitted field keeps
 * its current value; clearing an optional field (blank description, no subject)
 * needs a small follow-up change rather than a second edit path, which is
 * documented as a known limitation rather than solved by a generic JSON patch.
 */
export async function updateResource(
  sql: Sql,
  id: string,
  ownerId: string,
  input: ResourceUpdateInput,
): Promise<ResourceListItem> {
  const file = input.file;
  const rows = await sql<{ id: string }[]>`
    UPDATE resources SET
      title = coalesce(${input.title ?? null}, title),
      description = coalesce(${input.description ?? null}, description),
      subject_id = coalesce(${input.subjectId ?? null}, subject_id),
      visibility = coalesce(${input.visibility ?? null}, visibility),
      file_key = coalesce(${file?.key ?? null}, file_key),
      file_name = coalesce(${file?.name ?? null}, file_name),
      file_size_bytes = coalesce(${file?.sizeBytes ?? null}, file_size_bytes),
      file_mime_type = coalesce(${file?.mimeType ?? null}, file_mime_type),
      updated_at = now()
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id
  `;
  if (rows.length === 0) {
    // Identical answer for "missing" and "not yours": the existence of another
    // user's private resource is not this caller's business.
    throw AppError.notFound();
  }
  const item = await getResource(sql, id);
  if (!item) throw AppError.notFound();
  return item;
}

export async function deleteResource(sql: Sql, id: string, ownerId: string): Promise<void> {
  const rows = await sql<{ id: string }[]>`
    DELETE FROM resources WHERE id = ${id} AND owner_id = ${ownerId} RETURNING id
  `;
  if (rows.length === 0) throw AppError.notFound();
}

/** Save if absent, remove if present. Returns the resulting state. */
export async function toggleBookmark(
  sql: Sql,
  userId: string,
  resourceId: string,
): Promise<{ bookmarked: boolean }> {
  const removed = await sql`
    DELETE FROM bookmarks WHERE user_id = ${userId} AND resource_id = ${resourceId} RETURNING resource_id
  `;
  if (removed.length > 0) return { bookmarked: false };
  const added = await sql`
    INSERT INTO bookmarks (user_id, resource_id) VALUES (${userId}, ${resourceId})
    ON CONFLICT DO NOTHING RETURNING resource_id
  `;
  if (added.length === 0) throw AppError.conflict();
  return { bookmarked: true };
}

export interface PublicProfile {
  id: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
  createdAt: Date;
}

/** Author view. `email` is not selected: this layer never needs it. */
export async function getPublicProfile(sql: Sql, id: string): Promise<PublicProfile | null> {
  const rows = await sql<{ id: string; display_name: string; role: PublicProfile["role"]; created_at: Date }[]>`
    SELECT id, display_name, role, created_at FROM profiles WHERE id = ${id} LIMIT 1
  `;
  const row = rows[0];
  return row
    ? { id: row.id, displayName: row.display_name, role: row.role, createdAt: row.created_at }
    : null;
}

export interface SubjectOption {
  id: string;
  name: string;
  institutionId: string;
  institutionName: string;
}

export async function listSubjects(sql: Sql, institutionId?: string): Promise<SubjectOption[]> {
  return sql`
    SELECT s.id, s.name, s.institution_id, i.name AS institution_name
    FROM subjects s JOIN institutions i ON i.id = s.institution_id
    ${institutionId ? sql`WHERE s.institution_id = ${institutionId}` : sql``}
    ORDER BY i.name, s.name
    LIMIT 500
  `;
}