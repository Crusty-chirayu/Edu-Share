import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteResourceButton } from "@/components/delete-resource-button";
import { Icon } from "@/components/icon";
import { ReportDialog } from "@/components/report-dialog";
import { ResourceCard } from "@/components/resource-card";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { getSession } from "@/lib/auth/session";
import { loadResource, loadResources, toSearchParams } from "@/lib/catalog";
import type { ResourceListItem } from "@/db/resources";
import { formatTone } from "@/lib/category";
import { formatBytes, formatDate } from "@/lib/format";
import { parseOrNull, resourceIdSchema } from "@/lib/validation";

type PageProps = { params: Promise<{ id: string }> };

const TYPE_LABELS: Record<string, string> = {
  lecture_notes: "Lecture notes",
  study_notes: "Study notes",
  past_paper: "Past paper",
  summary: "Summary",
  lab_material: "Lab material",
  assignment: "Assignment",
  reference: "Reference",
  other: "Course material",
};

export default async function ResourceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const resourceId = parseOrNull(resourceIdSchema, id);
  if (!resourceId) notFound();

  const session = await getSession();
  const viewerId = session?.profileId ?? null;
  const result = await loadResource(viewerId, resourceId);

  if (!result.ok) {
    return (
      <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
        <div className="alert alert--warning" role="status">
          <span className="alert__title">Resource unavailable</span>
          <span>{result.message}</span>
        </div>
      </div>
    );
  }

  const item = result.data;
  if (!item) notFound();

  const tone = formatTone(item.fileName);
  const isOwner = viewerId !== null && viewerId === item.ownerId;
  const typeLabel = TYPE_LABELS[item.resourceType] ?? "Course material";

  const formatBadgeClass =
    tone.label === "PDF"
      ? "badge--pdf"
      : ["DOCX", "DOC", "TXT", "MD"].includes(tone.label)
        ? "badge--doc"
        : ["PPTX", "PPT"].includes(tone.label)
          ? "badge--slides"
          : ["XLSX", "CSV"].includes(tone.label)
            ? "badge--sheets"
            : ["ZIP"].includes(tone.label)
              ? "badge--archive"
              : "badge--role";

  // Related resources in the same subject
  let relatedItems: ResourceListItem[] = [];
  if (item.subjectId) {
    const relatedResult = await loadResources(
      viewerId,
      toSearchParams({ subjectId: item.subjectId, pageSize: "4" }),
    );
    if (relatedResult.ok) {
      relatedItems = relatedResult.data.items.filter((r) => r.id !== item.id).slice(0, 3);
    }
  }

  return (
    <div
      className="container detail-container"
      style={{ maxWidth: 920, paddingBottom: "var(--space-12)" }}
    >
      {/* Breadcrumbs */}
      <nav
        className="chips"
        aria-label="Academic context"
        style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-4)" }}
      >
        <Link href="/browse" className="chip">
          ← Browse library
        </Link>
        {item.institutionName ? (
          <span className="chip" style={{ cursor: "default" }}>
            {item.institutionName}
          </span>
        ) : null}
        {item.subjectName ? (
          <span className="chip chip--active" style={{ cursor: "default" }}>
            {item.subjectName}
          </span>
        ) : null}
      </nav>

      {/* Header section with single H1 */}
      <div className="section-head" style={{ alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div style={{ flex: 1 }}>
          <div className="cluster" style={{ marginBottom: "var(--space-2)" }}>
            <span className={`badge ${formatBadgeClass}`}>{tone.label}</span>
            <span className="badge badge--role">{typeLabel}</span>
            {item.visibility === "private" ? (
              <span className="badge badge--private">Private · Owner only</span>
            ) : (
              <span className="badge badge--public">Public library</span>
            )}
          </div>
          <h1 style={{ wordBreak: "break-word" }}>{item.title}</h1>
        </div>
      </div>

      {/* Primary Actions Cluster */}
      <div
        className="actions-cluster"
        style={{
          marginTop: "var(--space-4)",
          marginBottom: "var(--space-6)",
          paddingBottom: "var(--space-6)",
          borderBottom: "1px solid var(--c-border)",
        }}
      >
        {item.hasFile ? (
          <a
            className="btn btn--primary btn--lg"
            href={`/api/resources/${item.id}/download`}
            download
          >
            <Icon name="download" size={18} />
            Download ({formatBytes(item.fileSizeBytes)})
          </a>
        ) : null}

        {session ? (
          <SaveButton resourceId={item.id} initialSaved={item.bookmarked} />
        ) : (
          <Link href={`/auth?next=/resources/${item.id}`} className="btn btn--secondary">
            <Icon name="bookmark" size={16} />
            Sign in to save
          </Link>
        )}

        <ShareButton title={item.title} isPrivate={item.visibility === "private"} />

        <ReportDialog resourceId={item.id} isAuthenticated={Boolean(session)} />

        {isOwner ? (
          <div className="cluster" style={{ marginLeft: "auto" }}>
            <Link href={`/manage/${item.id}`} className="btn btn--secondary btn--sm">
              <Icon name="pencil" size={14} />
              Edit
            </Link>
            <DeleteResourceButton
              resourceId={item.id}
              resourceTitle={item.title}
              saveCount={item.bookmarkCount}
            />
          </div>
        ) : null}
      </div>

      {/* Main Content & Metadata Grid */}
      <div className="detail-layout">
        <div className="detail-main">
          {item.description ? (
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h2 className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
                Overview
              </h2>
              <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{item.description}</p>
            </div>
          ) : null}

          {/* Document Preview Area (Honest preview panel) */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h2 className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
              File Preview
            </h2>
            <div
              style={{
                backgroundColor: "var(--c-surface-sunken)",
                border: "1px dashed var(--c-border-strong)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-8) var(--space-4)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <Icon name="file" size={36} style={{ color: "var(--c-brand)" }} />
              <div>
                <p style={{ fontWeight: 600, color: "var(--c-ink)" }}>
                  {item.fileName ?? "Resource Document"}
                </p>
                <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--c-ink-3)" }}>
                  {item.hasFile
                    ? `${formatBytes(item.fileSizeBytes)} · Direct inspection verified`
                    : "No file attached"}
                </p>
              </div>
              {item.hasFile ? (
                <a
                  href={`/api/resources/${item.id}/download`}
                  className="btn btn--secondary btn--sm"
                  style={{ marginTop: "var(--space-2)" }}
                >
                  <Icon name="download" size={14} />
                  Open / Download File
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Sidebar Metadata */}
        <aside className="detail-sidebar">
          <div className="detail-card">
            <h2 className="eyebrow" style={{ marginBottom: "var(--space-4)" }}>
              Academic Metadata
            </h2>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-item__label">Contributor</span>
                <span className="meta-item__val">
                  {item.ownerName}
                  {isOwner ? " (you)" : ""}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-item__label">Format</span>
                <span className="meta-item__val">{tone.label}</span>
              </div>

              {item.hasFile && item.fileSizeBytes ? (
                <div className="meta-item">
                  <span className="meta-item__label">Size</span>
                  <span className="meta-item__val mono">{formatBytes(item.fileSizeBytes)}</span>
                </div>
              ) : null}

              {item.fileMimeType ? (
                <div className="meta-item">
                  <span className="meta-item__label">MIME type</span>
                  <span className="meta-item__val mono">{item.fileMimeType}</span>
                </div>
              ) : null}

              <div className="meta-item">
                <span className="meta-item__label">Subject</span>
                <span className="meta-item__val">{item.subjectName ?? "—"}</span>
              </div>

              <div className="meta-item">
                <span className="meta-item__label">Institution</span>
                <span className="meta-item__val">{item.institutionName ?? "—"}</span>
              </div>

              <div className="meta-item">
                <span className="meta-item__label">Added</span>
                <span className="meta-item__val">{formatDate(item.createdAt)}</span>
              </div>

              <div className="meta-item">
                <span className="meta-item__label">Last Updated</span>
                <span className="meta-item__val">{formatDate(item.updatedAt)}</span>
              </div>

              <div className="meta-item">
                <span className="meta-item__label">Saves</span>
                <span className="meta-item__val">{item.bookmarkCount}</span>
              </div>

              <div className="meta-item">
                <span className="meta-item__label">Downloads</span>
                <span className="meta-item__val">{item.downloadCount}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* More in this subject */}
      {relatedItems.length > 0 ? (
        <section
          className="section"
          style={{ marginTop: "var(--space-10)", borderTop: "1px solid var(--c-border)" }}
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">Related Coursework</p>
              <h2>More in {item.subjectName}</h2>
            </div>
            <Link href={`/browse?subjectId=${item.subjectId}`} className="btn btn--ghost btn--sm">
              See all →
            </Link>
          </div>
          <ul className="resource-list">
            {relatedItems.map((rel) => (
              <ResourceCard key={rel.id} item={rel} canSave={Boolean(session)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
