import { extensionLabel } from "@/lib/format";

/**
 * Maps a resource's file format onto the design system's margin-rule colour.
 *
 * ## Why this is format and not category
 *
 * `docs/UI-UX-DESIGN-SYSTEM.md` §6.5 colours the rule by *category* ("Lecture notes",
 * "Previous-year papers", …). The M4 schema has no `category` column — categories are
 * named in the document but are not yet a controlled vocabulary in the database — so
 * colouring by category would mean inventing the value in the client.
 *
 * This module therefore colours the rule by **file format**, which is real data the
 * row already carries, and the format label is always rendered as text next to it.
 * The colour is never the only signal (§6.6 rule 1), and nothing here claims a
 * category the schema cannot express.
 */

export interface FormatTone {
  /** CSS custom property name for the rule colour. */
  varName: string;
  /** The text label rendered beside the rule. */
  label: string;
}

const TONES: Record<string, FormatTone> = {
  pdf: { varName: "--cat-lecture", label: "PDF" },
  docx: { varName: "--cat-assignment", label: "DOCX" },
  doc: { varName: "--cat-assignment", label: "DOC" },
  pptx: { varName: "--cat-papers", label: "PPTX" },
  ppt: { varName: "--cat-papers", label: "PPT" },
  xlsx: { varName: "--cat-practice", label: "XLSX" },
  csv: { varName: "--cat-practice", label: "CSV" },
  zip: { varName: "--cat-lab", label: "ZIP" },
  png: { varName: "--cat-study", label: "PNG" },
  jpg: { varName: "--cat-study", label: "JPG" },
  jpeg: { varName: "--cat-study", label: "JPG" },
  txt: { varName: "--cat-reference", label: "TXT" },
  md: { varName: "--cat-reference", label: "MD" },
};

const FALLBACK: FormatTone = { varName: "--cat-default", label: "FILE" };

export function formatTone(fileName: string | null | undefined): FormatTone {
  if (!fileName) return FALLBACK;
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return FALLBACK;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return TONES[ext] ?? { varName: FALLBACK.varName, label: extensionLabel(fileName) };
}
