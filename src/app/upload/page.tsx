import { redirect } from "next/navigation";
import { ResourceForm } from "@/components/resource-form";
import { getSession } from "@/lib/auth/session";
import { loadTaxonomy } from "@/lib/catalog";

export const metadata = {
  title: "Upload a resource",
  description: "Share notes, summaries, past papers and study materials.",
};

export default async function UploadPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?next=/upload");
  }

  const taxonomy = await loadTaxonomy();
  const subjects = taxonomy.ok ? taxonomy.data.subjects : [];

  return (
    <div className="container">
      <div className="section-head">
        <div>
          <p className="eyebrow">Contribute</p>
          <h1>Upload a resource</h1>
        </div>
      </div>

      <div className="upload-layout">
        <div className="upload-main">
          <ResourceForm mode="create" subjects={subjects} />
        </div>

        <aside className="upload-guide" aria-label="Upload guidance">
          <div className="card">
            <h2 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--space-3)" }}>
              Upload checklist
            </h2>
            <div
              className="stack stack--tight"
              style={{ fontSize: "var(--fs-body-sm)", color: "var(--c-ink-2)" }}
            >
              <p>
                <strong>Format &amp; size:</strong> PDF, DOCX, PPTX, XLSX, TXT, MD, CSV, PNG, JPG,
                or ZIP up to 25&nbsp;MB.
              </p>
              <p>
                <strong>Content verification:</strong> The server checks real file headers (magic
                bytes), not just file extensions.
              </p>
              <p>
                <strong>Visibility options:</strong> Public materials appear in library search.
                Private materials are visible only to you under My Uploads.
              </p>
              <p>
                <strong>Academic integrity:</strong> Share only materials you authored or have
                permission to distribute.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
