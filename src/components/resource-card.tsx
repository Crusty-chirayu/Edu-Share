import Link from "next/link";
import type { ResourceListItem } from "@/db/resources";
import { Icon } from "@/components/icon";
import { SaveButton } from "@/components/save-button";
import { Badge, FormatTag, TypeBadge } from "@/components/ui/badge";
import { formatTone } from "@/lib/category";
import { formatBytes, formatDate } from "@/lib/format";

export function ResourceCard({
  item,
  canSave,
  canManage = false,
  saved = false,
}: {
  item: ResourceListItem;
  canSave: boolean;
  canManage?: boolean;
  /** The listing is the saved shelf itself, so saving is already settled. */
  saved?: boolean;
}) {
  const tone = formatTone(item.fileName);
  const taxonomy = [item.institutionName, item.subjectName].filter((value): value is string =>
    Boolean(value),
  );

  return (
    <li
      className="record"
      style={
        { ["--fmt" as keyof React.CSSProperties]: `var(${tone.varName})` } as React.CSSProperties
      }
    >
      <div className="record__head">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: 1 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            {item.resourceType && item.resourceType !== "other" ? (
              <TypeBadge type={item.resourceType} />
            ) : null}
            {item.visibility === "private" ? <Badge tone="private">Private</Badge> : null}
          </div>
          <h3 className="record__title">
            <Link href={`/resources/${item.id}`}>{item.title}</Link>
          </h3>
        </div>
        <FormatTag fileName={item.fileName} />
      </div>

      {item.description ? <p className="record__desc">{item.description}</p> : null}

      {taxonomy.length > 0 ? (
        <p className="crumbs">
          <Icon className="crumbs__sep" name="building" size={13} />
          <span>{taxonomy.join(" › ")}</span>
        </p>
      ) : (
        <p className="crumbs">
          <Icon className="crumbs__sep" name="building" size={13} />
          <span>Not filed under a subject yet</span>
        </p>
      )}

      <div className="record__foot">
        <p className="record__meta">
          <span>
            <strong>{item.ownerName}</strong>
          </span>
          <span className="mono">{formatDate(item.createdAt)}</span>
          {item.hasFile ? <span className="mono">{formatBytes(item.fileSizeBytes)}</span> : null}
          <span className="mono">
            {item.bookmarkCount} {item.bookmarkCount === 1 ? "save" : "saves"}
          </span>
          {item.downloadCount > 0 ? (
            <span className="mono">
              {item.downloadCount} {item.downloadCount === 1 ? "download" : "downloads"}
            </span>
          ) : null}
        </p>

        <div className="record__actions">
          <Link className="btn btn--secondary btn--sm" href={`/resources/${item.id}`}>
            Open
            <Icon name="arrowRight" size={15} />
          </Link>
          {canSave && !saved ? (
            <SaveButton resourceId={item.id} initialSaved={item.bookmarked} />
          ) : null}
          {canManage ? (
            <Link className="btn btn--ghost btn--sm" href={`/manage/${item.id}`}>
              Edit
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
