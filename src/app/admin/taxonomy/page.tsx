import Link from "next/link";
import { redirect } from "next/navigation";
import { TaxonomyClient } from "@/components/admin/taxonomy-client";
import { requireSession } from "@/lib/auth/session";
import { loadTaxonomy } from "@/lib/catalog";

export const metadata = {
  title: "Academic Taxonomy — EDU-SHARE Admin",
  description: "Manage institutions, departments, and course subjects.",
};

export default async function AdminTaxonomyPage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect("/auth?next=/admin/taxonomy");
  }

  if (session.role !== "admin") {
    return (
      <div
        className="container"
        style={{ padding: "var(--space-12) var(--space-4)", maxWidth: 640 }}
      >
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
          <h1 style={{ fontSize: "var(--fs-h2)", marginBottom: "var(--space-3)" }}>
            Access Restricted
          </h1>
          <p style={{ color: "var(--c-ink-2)", marginBottom: "var(--space-6)" }}>
            This interface requires verified Administrator privilege. Your current account role is{" "}
            <strong>{session.role}</strong>.
          </p>
          <Link href="/" className="btn btn--primary">
            Return to Library
          </Link>
        </div>
      </div>
    );
  }

  const taxonomy = await loadTaxonomy();
  const institutions = taxonomy.ok ? taxonomy.data.institutions : [];
  const subjects = taxonomy.ok ? taxonomy.data.subjects : [];

  return <TaxonomyClient initialInstitutions={institutions} initialSubjects={subjects} />;
}
