import { getPublicProfile, type PublicProfile } from "@/db/profiles";
import { withIdentity, type Sql } from "@/db/query";
import {
  getResource,
  listInstitutions,
  listResources,
  listSubjects,
  type InstitutionOption,
  type ResourceListItem,
  type ResourcePage,
  type SubjectOption,
} from "@/db/resources";
import { parseOrNull, searchParamsSchema, type SearchParams } from "@/lib/validation";

/**
 * Server-side read helpers with an explicit failure channel.
 *
 * A page must never render a stack trace or a crash boundary because PostgreSQL is
 * down. Every helper here returns a discriminated result so a page can render a
 * banner with an actionable sentence instead — and so no driver detail can escape
 * through a React error boundary.
 */

export const DB_UNREACHABLE_MESSAGE =
  "The database is not reachable. Start PostgreSQL (docker compose up -d), run npm run db:migrate, then reload.";

export type LoadResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * Raw URL search params → a validated `SearchParams`, **never throwing**.
 *
 * A malformed query string (`?page=banana`) must degrade to the default page rather
 * than crash a render: `parseOrNull` returns `null` and the literal `{}` parses to
 * the schema's defaults, which cannot fail because every field there has one.
 * Repeat keys collapse to the first value, which is what a browser sends anyway.
 */
export function toSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    flat[key] = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  }
  return parseOrNull(searchParamsSchema, flat) ?? searchParamsSchema.parse({});
}

async function read<T>(
  viewerId: string | null,
  fn: (sql: Sql) => Promise<T>,
): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await withIdentity(viewerId, fn) };
  } catch {
    // `withIdentity` maps driver failures onto `AppError.database()`. Anything that
    // escapes this boundary is treated as "not reachable" rather than being rendered.
    return { ok: false, message: DB_UNREACHABLE_MESSAGE };
  }
}

export async function loadResources(
  viewerId: string | null,
  params: SearchParams,
  options: { mine?: boolean; saved?: boolean; visibility?: "public" | "private" } = {},
): Promise<LoadResult<ResourcePage>> {
  return read(viewerId, (sql) =>
    listResources(sql, params, {
      viewerId,
      ...(options.mine === true ? { mine: true } : {}),
      ...(options.saved === true ? { saved: true } : {}),
      ...(options.visibility ? { visibility: options.visibility } : {}),
    }),
  );
}

export async function loadResource(
  viewerId: string | null,
  id: string,
): Promise<LoadResult<ResourceListItem | null>> {
  return read(viewerId, (sql) => getResource(sql, id));
}

export async function loadTaxonomy(): Promise<
  LoadResult<{ subjects: SubjectOption[]; institutions: InstitutionOption[] }>
> {
  return read(null, async (sql) => {
    const [subjects, institutions] = await Promise.all([listSubjects(sql), listInstitutions(sql)]);
    return { subjects, institutions };
  });
}

export async function loadPublicProfile(id: string): Promise<LoadResult<PublicProfile | null>> {
  return read(null, (sql) => getPublicProfile(sql, id));
}
