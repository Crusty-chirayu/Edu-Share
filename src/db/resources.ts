import { guarded, run, type Sql } from "@/db/query";
import { AppError } from "@/lib/errors";
import {
  buildBookmarkDeleteQuery,
  buildBookmarkInsertQuery,
  buildBookmarkVisibilityQuery,
  buildListInstitutionsQuery,
  buildListSubjectsQuery,
  buildReportInsertQuery,
  buildResourceDeleteQuery,
  buildResourceDetailQuery,
  buildResourceFileQuery,
  buildResourceInsertQuery,
  buildResourceListQuery,
  buildResourceUpdateQuery,
} from "@/lib/sql";
import type {
  ResourceCreateInput,
  ResourceType,
  ResourceUpdateInput,
  SearchParams,
} from "@/lib/validation";

/**
 * Data-access layer for the resource lifecycle.
 *
 * Rules this file exists to enforce:
 *  - every value reaches PostgreSQL as a **bound parameter**. Query text is built
 *    only by the pure builders in `src/lib/sql.ts`, which emit `$1, $2, …` plus a
 *    matching values array; nothing here concatenates a runtime value into SQL, and
 *    tagged templates are not used for any query that carries input;
 *  - identity is a **server-derived** profile id passed in by the caller, never a
 *    value read from a request body or query string;
 *  - `withIdentity` sets the transaction-local `app.user_id`, so migration 0002's
 *    RLS policies decide row visibility even when the connection role could
 *    otherwise bypass them;
 *  - driver errors never escape: they become `AppError.database()`, whose message is
 *    a fixed sentence containing no relation, value or DSN;
 *  - a private resource is unreachable through the public listing at all — the
 *    visibility predicate is part of the query, not a post-filter.
 */

export type { Sql };

export interface ResourceListItem {
  id: string;
  title: string;
  description: string | null;
  visibility: "public" | "private";
  resourceType: ResourceType;
  downloadCount: number;
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
  resource_type: string;
  download_count: string | number;
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

/** Maps a database row onto the API shape used by pages and components. */
function toItem(row: ResourceRow): ResourceListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    resourceType: (row.resource_type as ResourceType) ?? "other",
    downloadCount: Number(row.download_count ?? 0),
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    fileMimeType: row.file_mime_type,
    hasFile: row.file_name !== null,
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
  options: {
    viewerId: string | null;
    mine?: boolean;
    saved?: boolean;
    visibility?: "public" | "private";
  } = { viewerId: null },
): Promise<ResourcePage> {
  const empty: ResourcePage = {
    items: [],
    total: 0,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: 0,
  };
  // Owner-only (or saved-only) with an anonymous caller: there is nothing to ask for.
  if (options.mine && !options.viewerId) return empty;
  if (options.saved && !options.viewerId) return empty;

  return guarded(async () => {
    const { list, count } = buildResourceListQuery(params, {
      ...(options.mine === true ? { mine: true } : {}),
      ...(options.saved === true ? { saved: true } : {}),
      ...(options.visibility ? { visibility: options.visibility } : {}),
    });
    const countRows = await run<{ total: string }[]>(sql, count);
    const total = Number(countRows[0]?.total ?? 0);
    const rows = await run<ResourceRow[]>(sql, list);
    return {
      items: rows.map(toItem),
      total,
      page: params.page,
      pageSize: params.pageSize,
      pageCount: Math.ceil(total / params.pageSize),
    };
  });
}

/** Applies the public-visibility predicate, so a private row is `null`, not 403. */
export async function getResource(sql: Sql, id: string): Promise<ResourceListItem | null> {
  return guarded(async () => {
    const rows = await run<ResourceRow[]>(sql, buildResourceDetailQuery(id));
    const row = rows[0];
    return row ? toItem(row) : null;
  });
}

export interface ResourceFileRow {
  fileKey: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: string | null;
  ownerId: string;
}

/** File metadata for the authorised download/redirect decision. */
export async function getResourceFile(sql: Sql, id: string): Promise<ResourceFileRow | null> {
  return guarded(async () => {
    const rows = await run<
      {
        file_key: string | null;
        file_name: string | null;
        file_mime_type: string | null;
        file_size_bytes: string | null;
        owner_id: string;
      }[]
    >(sql, buildResourceFileQuery(id));
    const row = rows[0];
    return row
      ? {
          fileKey: row.file_key,
          fileName: row.file_name,
          fileMimeType: row.file_mime_type,
          fileSizeBytes: row.file_size_bytes,
          ownerId: row.owner_id,
        }
      : null;
  });
}

export async function createResource(
  sql: Sql,
  ownerId: string,
  input: ResourceCreateInput,
): Promise<ResourceListItem> {
  return guarded(async () => {
    const rows = await run<{ id: string }[]>(sql, buildResourceInsertQuery(ownerId, input));
    const created = rows[0];
    if (!created) throw AppError.database();
    const item = await getResource(sql, created.id);
    if (!item) throw AppError.database();
    return item;
  });
}

/**
 * Partial update, owner-only. A non-owner (or a missing id) updates zero rows and
 * receives the same 404 â€” the existence of another user's private resource is not
 * this caller's business.
 *
 * Returns the previous `file_key` when the file was replaced, so the caller can
 * delete the now-orphaned object.
 */
export async function updateResource(
  sql: Sql,
  id: string,
  ownerId: string,
  input: ResourceUpdateInput,
): Promise<{ item: ResourceListItem; replacedFileKey: string | null }> {
  return guarded(async () => {
    const before = await run<{ file_key: string | null }[]>(sql, buildResourceFileQuery(id));
    const previousKey = before[0]?.file_key ?? null;

    const rows = await run<{ id: string }[]>(sql, buildResourceUpdateQuery(id, ownerId, input));
    if (rows.length === 0) throw AppError.notFound();

    const item = await getResource(sql, id);
    if (!item) throw AppError.notFound();
    const replacedFileKey = input.file && previousKey !== input.file.key ? previousKey : null;
    return { item, replacedFileKey };
  });
}

/** Owner-only delete. Returns the storage key (if any) for compensating cleanup. */
export async function deleteResource(
  sql: Sql,
  id: string,
  ownerId: string,
): Promise<{ fileKey: string | null }> {
  return guarded(async () => {
    const rows = await run<{ id: string; file_key: string | null }[]>(
      sql,
      buildResourceDeleteQuery(id, ownerId),
    );
    const row = rows[0];
    if (!row) throw AppError.notFound();
    return { fileKey: row.file_key };
  });
}

/**
 * Save if absent, remove if present. The visibility check runs first, so a caller
 * cannot bookmark a resource they cannot read.
 */
export async function toggleBookmark(
  sql: Sql,
  userId: string,
  resourceId: string,
): Promise<{ bookmarked: boolean }> {
  return guarded(async () => {
    const visible = await run<{ one: number }[]>(
      sql,
      buildBookmarkVisibilityQuery(resourceId, userId),
    );
    if (visible.length === 0) throw AppError.notFound();

    const removed = await run<{ resource_id: string }[]>(
      sql,
      buildBookmarkDeleteQuery(userId, resourceId),
    );
    if (removed.length > 0) return { bookmarked: false };

    const added = await run<{ resource_id: string }[]>(
      sql,
      buildBookmarkInsertQuery(userId, resourceId),
    );
    if (added.length === 0) throw AppError.conflict();
    return { bookmarked: true };
  });
}

/* ------------------------------------------------------------------ *
 * Taxonomy
 * ------------------------------------------------------------------ */

export interface SubjectOption {
  id: string;
  name: string;
  code?: string | null;
  department?: string | null;
  semester?: number | null;
  institutionId: string;
  institutionName: string;
}

export async function listSubjects(sql: Sql, institutionId?: string): Promise<SubjectOption[]> {
  return guarded(async () => {
    const rows = await run<
      {
        id: string;
        name: string;
        code: string | null;
        department: string | null;
        semester: number | null;
        institution_id: string;
        institution_name: string;
      }[]
    >(sql, buildListSubjectsQuery(institutionId));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      department: row.department,
      semester: row.semester,
      institutionId: row.institution_id,
      institutionName: row.institution_name,
    }));
  });
}

/* ------------------------------------------------------------------ *
 * Reports (M0007)
 * ------------------------------------------------------------------ */

export async function reportResource(
  sql: Sql,
  params: {
    resourceId: string;
    reporterId: string;
    category: string;
    details?: string | null | undefined;
  },
): Promise<{ id: string; status: string }> {
  return guarded(async () => {
    const rows = await run<{ id: string; status: string }[]>(
      sql,
      buildReportInsertQuery(
        params.resourceId,
        params.reporterId,
        params.category,
        params.details ?? null,
      ),
    );
    const row = rows[0];
    if (!row) throw AppError.notFound();
    return { id: row.id, status: row.status };
  });
}

export interface InstitutionOption {
  id: string;
  name: string;
  subjectCount: number;
}

export async function listInstitutions(sql: Sql): Promise<InstitutionOption[]> {
  return guarded(async () => {
    const rows = await run<{ id: string; name: string; subject_count: string }[]>(
      sql,
      buildListInstitutionsQuery(),
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      subjectCount: Number(row.subject_count),
    }));
  });
}
