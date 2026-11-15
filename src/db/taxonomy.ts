import { guarded, run, type Sql } from "@/db/query";
import {
  buildInstitutionInsertQuery,
  buildInstitutionUpdateQuery,
  buildSubjectDeleteQuery,
  buildSubjectInsertQuery,
  buildSubjectUpdateQuery,
} from "@/lib/sql";
import { AppError } from "@/lib/errors";

export interface InstitutionRow {
  id: string;
  name: string;
  createdAt: Date;
}

export interface SubjectAdminRow {
  id: string;
  institutionId: string;
  name: string;
  code: string | null;
  department: string | null;
  semester: number | null;
  createdAt?: Date;
}

export async function createInstitution(sql: Sql, name: string): Promise<InstitutionRow> {
  const query = buildInstitutionInsertQuery(name);
  const rows = await guarded(async () => run<InstitutionRow[]>(sql, query));
  const row = rows[0];
  if (!row) throw AppError.database("Failed to create institution");
  return row;
}

export async function updateInstitution(
  sql: Sql,
  id: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const query = buildInstitutionUpdateQuery(id, name);
  const rows = await guarded(async () => run<{ id: string; name: string }[]>(sql, query));
  const row = rows[0];
  if (!row) throw AppError.notFound("Institution not found");
  return row;
}

export async function createSubject(
  sql: Sql,
  input: {
    institutionId: string;
    name: string;
    code?: string | null | undefined;
    department?: string | null | undefined;
    semester?: number | null | undefined;
  },
): Promise<SubjectAdminRow> {
  const query = buildSubjectInsertQuery(input);
  const rows = await guarded(async () => run<SubjectAdminRow[]>(sql, query));
  const row = rows[0];
  if (!row) throw AppError.database("Failed to create subject");
  return row;
}

export async function updateSubject(
  sql: Sql,
  id: string,
  input: {
    name?: string | undefined;
    code?: string | null | undefined;
    department?: string | null | undefined;
    semester?: number | null | undefined;
  },
): Promise<SubjectAdminRow> {
  const query = buildSubjectUpdateQuery(id, input);
  const rows = await guarded(async () => run<SubjectAdminRow[]>(sql, query));
  const row = rows[0];
  if (!row) throw AppError.notFound("Subject not found");
  return row;
}

export async function deleteSubject(sql: Sql, id: string): Promise<void> {
  const checkQuery = {
    text: `SELECT s.id, (SELECT count(*)::text FROM resources r WHERE r.subject_id = s.id) AS resource_count
    FROM subjects s
    WHERE s.id = $1::uuid`,
    values: [id],
  };
  const existing = await guarded(async () =>
    run<{ id: string; resource_count: string }[]>(sql, checkQuery),
  );
  if (existing.length === 0) {
    throw AppError.notFound("Subject not found");
  }
  if (Number(existing[0]?.resource_count ?? 0) > 0) {
    throw AppError.conflict("Cannot delete subject with attached resources");
  }

  const query = buildSubjectDeleteQuery(id);
  await guarded(async () => run<{ id: string }[]>(sql, query));
}
