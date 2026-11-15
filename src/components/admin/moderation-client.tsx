"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import type { ModerationActionRow, ReportListItem } from "@/lib/sql";

interface Props {
  initialReports: ReportListItem[];
  initialTotal: number;
}

export function ModerationClient({ initialReports, initialTotal }: Props) {
  const [reports, setReports] = useState<ReportListItem[]>(initialReports);
  const [total, setTotal] = useState(initialTotal);
  const [activeTab, setActiveTab] = useState<"open" | "resolved" | "dismissed" | "audit">("open");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal state
  const [activeReport, setActiveReport] = useState<ReportListItem | null>(null);
  const [actionType, setActionType] = useState<"dismiss" | "hide" | "restore" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<ModerationActionRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchReports = useCallback(async (status: string, category: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load reports queue.");
      }
      const data = await res.json();
      setReports(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/audit");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.data || []);
      }
    } catch {
      // Non-blocking for audit log fetch
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      void fetchAuditLogs();
    } else {
      void fetchReports(activeTab, selectedCategory);
    }
  }, [activeTab, selectedCategory, fetchReports, fetchAuditLogs]);

  async function handleExecuteDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!activeReport || !actionType || !reason.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${activeReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: reason.trim(),
          resourceId: activeReport.resourceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to execute moderation decision.");
      }

      // Close modal and refresh current queue
      setActiveReport(null);
      setActionType(null);
      setReason("");
      await fetchReports(activeTab, selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision execution failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: "var(--space-12)" }}>
      <div className="section-head">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Content Moderation Queue</h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Link href="/admin/taxonomy" className="btn btn--secondary btn--sm">
            Manage Taxonomy
          </Link>
          <span className="result-count">
            {total} {total === 1 ? "report" : "reports"}
          </span>
        </div>
      </div>

      {error ? (
        <Alert tone="warning" title="Moderation notice">
          {error}
        </Alert>
      ) : null}

      {/* Navigation Tabs */}
      <nav
        className="chips"
        aria-label="Moderation filters"
        style={{ marginBottom: "var(--space-6)" }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("open")}
          className={`chip ${activeTab === "open" ? "chip--active" : ""}`}
        >
          Open Reports {activeTab === "open" && `(${total})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resolved")}
          className={`chip ${activeTab === "resolved" ? "chip--active" : ""}`}
        >
          Resolved Reports {activeTab === "resolved" && `(${total})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dismissed")}
          className={`chip ${activeTab === "dismissed" ? "chip--active" : ""}`}
        >
          Dismissed {activeTab === "dismissed" && `(${total})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`chip ${activeTab === "audit" ? "chip--active" : ""}`}
        >
          Audit History
        </button>
      </nav>

      {activeTab !== "audit" && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginBottom: "var(--space-6)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "var(--fs-meta)", color: "var(--c-ink-3)", fontWeight: 600 }}>
            Category:
          </span>
          {["", "academic_integrity", "copyright", "spam", "incorrect_content", "other"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`chip ${selectedCategory === cat ? "chip--active" : ""}`}
                style={{ fontSize: "var(--fs-meta)", padding: "4px 10px" }}
              >
                {cat ? cat.replace("_", " ") : "All"}
              </button>
            ),
          )}
        </div>
      )}

      {loading ? (
        <div
          className="card"
          style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--c-ink-3)" }}
        >
          <p>Loading moderation queue...</p>
        </div>
      ) : activeTab === "audit" ? (
        <div>
          {auditLoading ? (
            <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
              Loading audit log...
            </div>
          ) : auditLogs.length === 0 ? (
            <div
              className="card"
              style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--c-ink-3)" }}
            >
              No moderation decisions recorded yet.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-body-sm)" }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--c-surface-sunken)",
                      borderBottom: "1px solid var(--c-border)",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "12px 16px" }}>Timestamp</th>
                    <th style={{ padding: "12px 16px" }}>Moderator</th>
                    <th style={{ padding: "12px 16px" }}>Action</th>
                    <th style={{ padding: "12px 16px" }}>Resource</th>
                    <th style={{ padding: "12px 16px" }}>Decision Note</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
                      <td
                        style={{
                          padding: "12px 16px",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--fs-meta)",
                        }}
                      >
                        {formatDate(log.createdAt)}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{log.moderatorName}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className={`badge ${log.action === "hide" ? "badge--pdf" : log.action === "restore" ? "badge--public" : "badge--role"}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          href={`/resources/${log.resourceId}`}
                          style={{ color: "var(--c-brand)", textDecoration: "none" }}
                        >
                          {log.resourceTitle}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--c-ink-2)" }}>
                        {log.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
          <Icon
            name="shield"
            size={32}
            style={{ color: "var(--c-brand)", marginBottom: "var(--space-3)" }}
          />
          <h2 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--space-2)" }}>
            No reports matching this filter
          </h2>
          <p style={{ color: "var(--c-ink-3)", fontSize: "var(--fs-body-sm)" }}>
            The moderation queue is clear. All reported materials have been reviewed and acted upon.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {reports.map((report) => (
            <div key={report.id} className="card" style={{ padding: "var(--space-5)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-4)",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <span className="badge badge--role" style={{ textTransform: "capitalize" }}>
                      {report.category.replace("_", " ")}
                    </span>
                    <span
                      className={`badge ${report.status === "open" ? "badge--slides" : report.status === "resolved" ? "badge--public" : "badge--role"}`}
                    >
                      {report.status}
                    </span>
                    {report.resourceVisibility === "private" ? (
                      <span className="badge badge--private">Hidden (Private)</span>
                    ) : (
                      <span className="badge badge--public">Live (Public)</span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "var(--fs-h3)", margin: "0 0 var(--space-1)" }}>
                    <Link
                      href={`/resources/${report.resourceId}`}
                      style={{ color: "var(--c-ink)", textDecoration: "none" }}
                    >
                      {report.resourceTitle}
                    </Link>
                  </h2>
                  <p style={{ fontSize: "var(--fs-meta)", color: "var(--c-ink-3)", margin: 0 }}>
                    Reported by <strong>{report.reporterName}</strong> on{" "}
                    {formatDate(report.createdAt)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <Link
                    href={`/resources/${report.resourceId}`}
                    className="btn btn--secondary btn--sm"
                  >
                    Inspect Resource
                  </Link>

                  {report.status === "open" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReport(report);
                          setActionType("hide");
                          setReason("Violates platform academic integrity/copyright standards.");
                        }}
                        className="btn btn--quiet-danger btn--sm"
                      >
                        Hide Resource
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReport(report);
                          setActionType("dismiss");
                          setReason("Reviewed: content compliant with guidelines.");
                        }}
                        className="btn btn--ghost btn--sm"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : report.resourceVisibility === "private" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReport(report);
                        setActionType("restore");
                        setReason("Reinstated after verification.");
                      }}
                      className="btn btn--secondary btn--sm"
                    >
                      Restore to Public
                    </button>
                  ) : null}
                </div>
              </div>

              {report.details ? (
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    padding: "var(--space-3)",
                    background: "var(--c-surface-sunken)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-body-sm)",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "var(--fs-meta)",
                      color: "var(--c-ink-3)",
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    Reporter Notes:
                  </strong>
                  {report.details}
                </div>
              ) : null}

              {report.resolutionNote ? (
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    padding: "var(--space-3)",
                    background: "var(--c-brand-tint)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-body-sm)",
                    color: "var(--c-brand)",
                  }}
                >
                  <strong style={{ fontSize: "var(--fs-meta)", display: "block", marginBottom: 2 }}>
                    Resolution Decision:
                  </strong>
                  {report.resolutionNote}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Decision Dialog Modal */}
      {activeReport && actionType ? (
        <dialog open className="dialog" style={{ display: "block" }}>
          <form onSubmit={handleExecuteDecision} className="dialog__body">
            <h2 className="dialog__title">
              {actionType === "hide"
                ? "Hide Resource from Public Library"
                : actionType === "dismiss"
                  ? "Dismiss Report"
                  : "Restore Resource to Public"}
            </h2>

            <p className="dialog__text">
              Target: <strong>{activeReport.resourceTitle}</strong>
              <br />
              Action:{" "}
              <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{actionType}</span>
            </p>

            <div className="field">
              <label htmlFor="decision-reason" className="label">
                Decision reason &amp; audit explanation:
              </label>
              <textarea
                id="decision-reason"
                required
                rows={3}
                className="textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the justification for this action..."
              />
            </div>

            <div className="dialog__actions" style={{ gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setActiveReport(null);
                  setActionType(null);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn--${actionType === "hide" ? "quiet-danger" : "primary"} btn--sm`}
                disabled={submitting || !reason.trim()}
              >
                {submitting ? "Executing..." : "Confirm & Record Decision"}
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}
