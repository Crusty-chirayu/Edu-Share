/**
 * Presentation-only formatting helpers.
 *
 * Kept in one module so that every surface renders a byte count or a date the same
 * way, and so that no component invents its own `toFixed` shortcut. All functions
 * are pure and take already-validated values — they never parse input from a
 * request.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** `1536` → `1.5 kB`. Binary units, because storage reports them that way. */
export function formatBytes(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const bytes = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["kB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}

/** ISO or `Date` → `12 Mar 2026`. Falls back to an em dash rather than "Invalid". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMAT.format(date);
}

/** File name → uppercase extension label (`report.PDF` → `PDF`). */
export function extensionLabel(fileName: string | null | undefined): string {
  if (!fileName) return "FILE";
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "FILE";
  return fileName
    .slice(dot + 1)
    .toUpperCase()
    .slice(0, 5);
}
