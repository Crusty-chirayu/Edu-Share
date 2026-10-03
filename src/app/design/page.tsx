import type { Metadata } from "next";
import type { CSSProperties } from "react";
import type { ResourceListItem } from "@/db/resources";
import { ResourceCard } from "@/components/resource-card";
import { formatTone } from "@/lib/category";

export const metadata: Metadata = {
  title: "Design",
  description: "Reference catalogue of the primitives and tokens.",
};

const FORMATS = [
  "notes.pdf",
  "slides.pptx",
  "worksheet.docx",
  "data.xlsx",
  "photo.png",
  "readme.txt",
];

const SAMPLE_ITEM: ResourceListItem = {
  id: "00000000-0000-4000-8000-000000000000",
  title: "Operating Systems - Unit 3 notes",
  description: "Paging, segmentation and page-replacement policies with diagrams.",
  visibility: "public",
  resourceType: "lecture_notes",
  downloadCount: 42,
  fileName: "os-unit-3.pdf",
  fileSizeBytes: "245760",
  fileMimeType: "application/pdf",
  hasFile: true,
  createdAt: new Date("2026-03-12T09:30:00.000Z"),
  updatedAt: new Date("2026-03-12T09:30:00.000Z"),
  ownerId: "00000000-0000-4000-8000-000000000001",
  ownerName: "A contributor",
  subjectId: null,
  subjectName: "Operating Systems",
  institutionName: "Example University",
  bookmarkCount: 14,
  bookmarked: false,
};

const TOKENS = [
  ["--surface-canvas", "Canvas"],
  ["--surface-raised", "Raised"],
  ["--surface-sunken", "Sunken"],
  ["--text-primary", "Text"],
  ["--brand-solid", "Brand"],
  ["--accent-solid", "Accent"],
  ["--status-danger", "Danger"],
  ["--focus-ring", "Focus"],
];
export default function DesignPage() {
  return (
    <div className="container page">
      <div className="page-head">
        <div className="page-head__title">
          <p className="eyebrow">Design system</p>
          <h1>Primitive catalogue</h1>
          <p className="page-head__lede">Same tokens and classes the product screens use.</p>
        </div>
      </div>
      <section className="prose" aria-labelledby="tokens">
        <h2 id="tokens">Tokens</h2>
        <dl className="ledger">
          {TOKENS.map((row) => (
            <div key={row[0]}>
              <dt>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "0.875rem",
                    height: "0.875rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-strong)",
                    background: "var(" + row[0] + ")",
                    marginInlineEnd: "var(--space-2)",
                  }}
                />
                {row[1]}
              </dt>
              <dd className="mono">{row[0]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="prose" aria-labelledby="buttons">
        <h2 id="buttons">Buttons</h2>
        <div className="hero__actions">
          <button type="button" className="btn btn--primary">
            Primary
          </button>
          <button type="button" className="btn btn--secondary">
            Secondary
          </button>
          <button type="button" className="btn btn--accent">
            Accent
          </button>
          <button type="button" className="btn btn--danger">
            Danger
          </button>
          <button type="button" className="btn btn--ghost">
            Ghost
          </button>
        </div>
      </section>
      <section className="prose" aria-labelledby="listing">
        <h2 id="listing">Listing</h2>
        <div className="chips">
          {FORMATS.map((file) => {
            const tone = formatTone(file);
            const style = { "--cat": "var(" + tone.varName + ")" } as CSSProperties;
            return (
              <span className="chip" key={file} style={style}>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--cat, var(--cat-default))",
                  }}
                />
                {tone.label}
              </span>
            );
          })}
        </div>
        <ul className="resource-list">
          <ResourceCard item={SAMPLE_ITEM} canSave={false} />
        </ul>
      </section>
    </div>
  );
}
