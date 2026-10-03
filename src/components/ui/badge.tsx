import { Icon, type IconName } from "@/components/icon";
import { formatTone } from "@/lib/category";

/**
 * The small labelled facts that sit on a resource record: its format, its
 * visibility, whether the reader has saved it.
 *
 * `Badge` covers every case except format, because format carries a colour
 * that comes from real data (the file extension) rather than from the design.
 * Even there, the colour is a swatch *beside* the word, never a replacement
 * for it.
 */

export type BadgeTone = "neutral" | "private" | "public" | "saved" | "success" | "danger";

export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: React.ReactNode;
}) {
  const className = tone === "neutral" ? "badge" : `badge badge--${tone}`;
  return (
    <span className={className}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function FormatTag({ fileName }: { fileName: string | null | undefined }) {
  const tone = formatTone(fileName);
  return (
    <span
      className="filetag"
      style={
        { ["--fmt" as keyof React.CSSProperties]: `var(${tone.varName})` } as React.CSSProperties
      }
    >
      {tone.label}
    </span>
  );
}

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  lecture_notes: "Lecture notes",
  study_notes: "Study notes",
  past_paper: "Past paper",
  summary: "Summary",
  lab_material: "Lab material",
  assignment: "Assignment",
  reference: "Reference",
  other: "Resource",
};

export function TypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const label = RESOURCE_TYPE_LABELS[type] ?? "Resource";
  return <span className="badge badge--role">{label}</span>;
}
