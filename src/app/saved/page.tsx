import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import { SectionTabs } from "@/components/section-tabs";
import { getSession } from "@/lib/auth/session";
import { loadResources, toSearchParams } from "@/lib/catalog";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/saved` — the caller's bookmarked resources.
 *
 * The `saved` predicate is evaluated in SQL against `app_current_user_id()`, so this
 * is always *your* list; an anonymous visitor gets the signed-out state rather than a
 * public list of everyone's saves.
 */
export default async function SavedPage({ searchParams }: PageProps) {
  const session = await getSession();
  const params = toSearchParams(await searchParams);

  const header = (
    <div className="section-head">
      <div>
        <p className="eyebrow">Reading list</p>
        <h1>Saved</h1>
      </div>
      <span className="result-count">{session ? "Yours only" : "—"}</span>
    </div>
  );

  if (!session) {
    return (
      <div className="container">
        {header}
        <SectionTabs active="saved" />
        <div className="empty" style={{ marginTop: "var(--space-5)" }}>
          <p className="empty__title">Your saved list is private to you</p>
          <p className="empty__body">
            Save a resource from any listing and it will wait for you here. Sign in to start one.
          </p>
          <Link href="/auth" className="btn btn--primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const page = await loadResources(session.profileId, params, { saved: true });

  return (
    <div className="container">
      <div className="section-head">
        <div>
          <p className="eyebrow">Reading list</p>
          <h1>Saved</h1>
        </div>
        <span className="result-count">
          {page.ok ? `${page.data.total} ${page.data.total === 1 ? "resource" : "resources"}` : "—"}
        </span>
      </div>

      <SectionTabs active="saved" />

      <div style={{ marginTop: "var(--space-5)" }}>
        {/* Keeps the heading outline at h1 → h2 → h3 (§19.6): card titles are h3. */}
        <h2 className="visually-hidden">Saved resources</h2>
        {!page.ok ? (
          <div className="alert alert--warning" role="status">
            <span className="alert__title">Unavailable</span>
            <span>{page.message}</span>
          </div>
        ) : page.data.items.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nothing saved yet</p>
            <p className="empty__body">
              Press <strong>Save</strong> on any resource and it will show up here — a private list
              that nobody else can see.
            </p>
            <Link href="/browse" className="btn btn--primary">
              Find something useful
            </Link>
          </div>
        ) : (
          <ul className="resource-list">
            {page.data.items.map((item) => (
              <ResourceCard key={item.id} item={item} canSave />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
