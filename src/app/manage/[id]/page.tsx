import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteResourceButton } from "@/components/delete-resource-button";
import { ResourceForm } from "@/components/resource-form";
import { getSession } from "@/lib/auth/session";
import { loadResource, loadTaxonomy } from "@/lib/catalog";
import { parseOrNull, resourceIdSchema } from "@/lib/validation";

type PageProps = { params: Promise<{ id: string }> };

export default async function ManageResourcePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect(`/auth?next=/manage/${(await params).id}`);

  const { id } = await params;
  const resourceId = parseOrNull(resourceIdSchema, id);
  if (!resourceId) notFound();

  const [result, taxonomy] = await Promise.all([
    loadResource(session.profileId, resourceId),
    loadTaxonomy(),
  ]);

  if (!result.ok) {
    return (
      <div className="container">
        <div className="alert alert--warning" role="status">
          <span className="alert__title">Resource unavailable</span>
          <span>{result.message}</span>
        </div>
      </div>
    );
  }

  const item = result.data;
  if (!item || item.ownerId !== session.profileId) notFound();

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <nav className="chips" aria-label="Back" style={{ marginBottom: "var(--space-4)" }}>
        <Link href="/manage" className="chip">
          ← My uploads
        </Link>
      </nav>

      <div className="section-head">
        <div>
          <p className="eyebrow">My uploads</p>
          <h1>Edit resource</h1>
        </div>
        <Link href={`/resources/${item.id}`} className="btn btn--ghost btn--sm">
          View
        </Link>
      </div>

      <ResourceForm
        mode="edit"
        subjects={taxonomy.ok ? taxonomy.data.subjects : []}
        initial={{
          id: item.id,
          title: item.title,
          description: item.description ?? "",
          subjectId: item.subjectId ?? "",
          resourceType: item.resourceType,
          visibility: item.visibility,
          fileName: item.fileName,
        }}
      />

      <div
        className="card"
        style={{
          marginTop: "var(--space-8)",
          borderColor: "var(--c-danger)",
          background: "var(--c-surface)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--fs-h3)",
            color: "var(--c-danger)",
            marginBottom: "var(--space-2)",
          }}
        >
          Danger zone
        </h2>
        <p
          style={{
            color: "var(--c-ink-2)",
            marginBottom: "var(--space-4)",
            fontSize: "var(--fs-body-sm)",
          }}
        >
          Permanently delete this resource and its associated file. This action cannot be undone.
        </p>
        <DeleteResourceButton
          resourceId={item.id}
          resourceTitle={item.title}
          saveCount={item.bookmarkCount}
        />
      </div>
    </div>
  );
}
