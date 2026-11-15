import { guarded, run, type Sql } from "@/db/query";
import {
  buildAdminResourceDeleteQuery,
  buildListModerationActionsQuery,
  buildListReportsQuery,
  buildModerationActionInsertQuery,
  buildReportResolveQuery,
  buildResourceVisibilitySetQuery,
  type ModerationActionRow,
  type ReportListItem,
} from "@/lib/sql";
import { AppError } from "@/lib/errors";
import type { ModerationActionType } from "@/lib/validation";

export interface ReportPage {
  items: ReportListItem[];
  total: number;
}

interface ReportDbRow {
  id: string;
  resource_id: string;
  resource_title: string;
  resource_visibility: "public" | "private";
  file_name: string | null;
  reporter_id: string;
  reporter_name: string;
  category: string;
  details: string | null;
  status: "open" | "reviewed" | "resolved" | "dismissed";
  resolution_note: string | null;
  resolved_at: Date | null;
  created_at: Date;
}

export async function listReports(
  sql: Sql,
  filter: { status?: string | undefined; category?: string | undefined } = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
): Promise<ReportPage> {
  const { list, count } = buildListReportsQuery(filter, pagination);
  const [rows, countRows] = await Promise.all([
    run<ReportDbRow[]>(sql, list),
    run<{ total: string }[]>(sql, count),
  ]);

  const items: ReportListItem[] = rows.map((r) => ({
    id: r.id,
    resourceId: r.resource_id,
    resourceTitle: r.resource_title,
    resourceVisibility: r.resource_visibility,
    fileName: r.file_name,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name,
    category: r.category,
    details: r.details,
    status: r.status,
    resolutionNote: r.resolution_note,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
  }));

  const total = Number(countRows[0]?.total ?? 0);
  return { items, total };
}

export async function resolveReport(
  sql: Sql,
  moderatorId: string,
  reportId: string,
  status: "resolved" | "dismissed",
  resolutionNote?: string,
): Promise<void> {
  const query = buildReportResolveQuery(reportId, moderatorId, status, resolutionNote);
  await guarded(async () => {
    const updated = await run<{ id: string }[]>(sql, query);
    if (updated.length === 0) {
      throw AppError.notFound("Report not found");
    }
  });
}

export async function executeModerationDecision(
  sql: Sql,
  params: {
    moderatorId: string;
    resourceId: string;
    reportId: string | null;
    action: ModerationActionType;
    reason: string;
  },
): Promise<void> {
  await guarded(async () => {
    // 1. Resolve the report first if one was specified
    if (params.reportId) {
      const reportStatus = params.action === "dismiss" ? "dismissed" : "resolved";
      const repQuery = buildReportResolveQuery(
        params.reportId,
        params.moderatorId,
        reportStatus,
        params.reason,
      );
      const repUpdated = await run<{ id: string }[]>(sql, repQuery);
      if (repUpdated.length === 0) {
        throw AppError.notFound("Report not found");
      }
    }

    // 2. Act on the resource if action is hide or restore
    if (params.action === "hide") {
      const visQuery = buildResourceVisibilitySetQuery(params.resourceId, "private");
      const visUpdated = await run<{ id: string }[]>(sql, visQuery);
      if (visUpdated.length === 0) {
        throw AppError.notFound("Resource not found");
      }
    } else if (params.action === "restore") {
      const visQuery = buildResourceVisibilitySetQuery(params.resourceId, "public");
      const visUpdated = await run<{ id: string }[]>(sql, visQuery);
      if (visUpdated.length === 0) {
        throw AppError.notFound("Resource not found");
      }
    }

    // 3. Record audit entry in moderation_actions
    const auditQuery = buildModerationActionInsertQuery(
      params.moderatorId,
      params.resourceId,
      params.reportId,
      params.action,
      params.reason,
    );
    await run(sql, auditQuery);

    // 4. If action is delete, remove the resource after audit log is recorded
    if (params.action === "delete") {
      const delQuery = buildAdminResourceDeleteQuery(params.resourceId);
      const delResult = await run<{ id: string; file_key: string | null }[]>(sql, delQuery);
      if (delResult.length === 0) {
        throw AppError.notFound("Resource not found");
      }
    }
  });
}

export async function listModerationActions(
  sql: Sql,
  resourceId?: string,
  limit: number = 50,
): Promise<ModerationActionRow[]> {
  const query = buildListModerationActionsQuery(resourceId, limit);
  return guarded(async () => run<ModerationActionRow[]>(sql, query));
}
