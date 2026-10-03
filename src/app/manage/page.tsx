import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import { SectionTabs } from "@/components/section-tabs";
import { requireSession } from "@/lib/auth/session";
import { loadResources, toSearchParams } from "@/lib/catalog";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/manage` — the contributor's own uploads, including their private rows.
 *
 * Visibility here comes from the `mine` predicate (the transaction's identity), never
 * from an id in the query string, so this page cannot be pointed at someone else's
 * content.
 */
export default async function ManagePage({ searchParams }: PageProps) {
  const session = await requireSession().catch(() => null);
  const rawParams = await searchParams;
  const params = toSearchParams(rawParams);
  const visibilityParam =
    rawParams.visibility === "public" || rawParams.visibility === "private"
      ? rawParams.visibility
      : undefined;

  if (!session) {
    return (
      <div className="container">
        <div className="section-head">
          <div>
            <p className="eyebrow">Contribution</p>
            <h1>My uploads</h1>
          </div>
        </div>
        <SectionTabs active="mine" />
        <div className="empty" style={{ marginTop: "var(--space-5)" }}>
          <p className="empty__title">Sign in to see your uploads</p>
          <p className="empty__body">
            Your uploads and their visibility live behind your account, so this page needs you
            signed in.
          </p>
          <Link href="/auth" className="btn btn--primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const page = await loadResources(session.profileId, params, {
    mine: true,
    ...(visibilityParam ? { visibility: visibilityParam } : {}),
  });

  return (
    <div className="container">
      <div className="section-head">
        <div>
          <p className="eyebrow">Contribution</p>
          <h1>My uploads</h1>
        </div>
        <div className="hero__actions">
          <span className="result-count">
            {page.ok
              ? `${page.data.total} ${page.data.total === 1 ? "resource" : "resources"}`
              : "—"}
          </span>
          <Link href="/upload" className="btn btn--accent btn--sm">
            Upload
          </Link>
        </div>
      </div>

      <SectionTabs active="mine" />

      <div style={{ marginTop: "var(--space-5)" }}>
        <nav
          className="chips"
          aria-label="Filter by visibility"
          style={{ marginBottom: "var(--space-4)" }}
        >
          <Link
            href="/manage"
            className={`chip ${!visibilityParam ? "chip--active" : ""}`}
            aria-current={!visibilityParam ? "page" : undefined}
          >
            All
          </Link>
          <Link
            href="/manage?visibility=public"
            className={`chip ${visibilityParam === "public" ? "chip--active" : ""}`}
            aria-current={visibilityParam === "public" ? "page" : undefined}
          >
            Public
          </Link>
          <Link
            href="/manage?visibility=private"
            className={`chip ${visibilityParam === "private" ? "chip--active" : ""}`}
            aria-current={visibilityParam === "private" ? "page" : undefined}
          >
            Private
          </Link>
        </nav>

        {/* Keeps the heading outline at h1 → h2 → h3 (§19.6): card titles are h3. */}
        <h2 className="visually-hidden">Your uploads</h2>
        {!page.ok ? (
          <div className="alert alert--warning" role="status">
            <span className="alert__title">Unavailable</span>
            <span>{page.message}</span>
          </div>
        ) : page.data.items.length === 0 ? (
          <div className="empty">
            <p className="empty__title">You have not uploaded anything yet</p>
            <p className="empty__body">
              Uploaded resources appear here with an Edit action and their current visibility, so
              you always know who can see them.
            </p>
            <Link href="/upload" className="btn btn--accent">
              Upload your first resource
            </Link>
          </div>
        ) : (
          <ul className="resource-list">
            {page.data.items.map((item) => (
              <ResourceCard key={item.id} item={item} canSave canManage />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
