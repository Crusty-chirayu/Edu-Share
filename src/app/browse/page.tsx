import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import { SectionTabs } from "@/components/section-tabs";
import { RESOURCE_TYPE_LABELS } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { loadResources, loadTaxonomy, toSearchParams } from "@/lib/catalog";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Labels for the sort options, so the applied-filter summary can name the order. */
const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * `/browse` — the library listing.
 *
 * The filter form is a plain `GET` to the same URL: filtering works with JavaScript
 * disabled, survives a reload, and shares as a URL, which is the whole point of a
 * search page. Validation happens server-side in `toSearchParams`, so a nonsense
 * query string degrades to defaults instead of erroring.
 */
export default async function BrowsePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = toSearchParams(raw);
  const session = await getSession();
  const viewerId = session?.profileId ?? null;

  const [page, taxonomy] = await Promise.all([loadResources(viewerId, params), loadTaxonomy()]);

  const current: Record<string, string> = {
    q: params.q ?? "",
    subjectId: params.subjectId ?? "",
    institutionId: params.institutionId ?? "",
    resourceType: params.resourceType ?? "",
    sort: params.sort,
  };

  const allSubjects = taxonomy.ok ? taxonomy.data.subjects : [];
  const institutions = taxonomy.ok ? taxonomy.data.institutions : [];

  const subjects = allSubjects.filter(
    (subject) => !current.institutionId || subject.institutionId === current.institutionId,
  );

  const applied: string[] = [];
  if (current.q) applied.push(`keyword “${current.q}”`);
  const institutionName = institutions.find((item) => item.id === current.institutionId)?.name;
  if (institutionName) applied.push(institutionName);
  const subjectName = allSubjects.find((item) => item.id === current.subjectId)?.name;
  if (subjectName) applied.push(subjectName);
  if (current.resourceType) {
    applied.push(RESOURCE_TYPE_LABELS[current.resourceType] ?? current.resourceType);
  }
  if (params.sort !== "newest") {
    applied.push(SORT_LABELS[params.sort] ?? params.sort);
  }

  const hasContentFilters = Boolean(
    current.q || current.institutionId || current.subjectId || current.resourceType,
  );

  return (
    <div className="container">
      <div className="section-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Browse resources</h1>
        </div>
        <span className="result-count">
          {page.ok ? `${page.data.total} ${page.data.total === 1 ? "resource" : "resources"}` : "—"}
        </span>
      </div>

      <SectionTabs active="library" />

      {!taxonomy.ok ? (
        <div
          className="alert alert--warning"
          role="status"
          style={{ marginBottom: "var(--space-4)" }}
        >
          <span className="alert__title">Filters unavailable</span>
          <span>{taxonomy.message}</span>
        </div>
      ) : null}

      <div className="browse">
        <aside className="filters" aria-label="Filters">
          <p className="filters__head">Refine</p>
          <form method="get" action="/browse" className="stack">
            <div className="field">
              <label className="label" htmlFor="q">
                Search
              </label>
              <input
                className="input"
                id="q"
                name="q"
                type="search"
                defaultValue={current.q}
                placeholder="Title, topic, or keyword"
                maxLength={120}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="institutionId">
                Institution
              </label>
              <select
                className="select"
                id="institutionId"
                name="institutionId"
                defaultValue={current.institutionId}
              >
                <option value="">All institutions</option>
                {taxonomy.ok
                  ? taxonomy.data.institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}
                      </option>
                    ))
                  : null}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="subjectId">
                Subject
              </label>
              <select
                className="select"
                id="subjectId"
                name="subjectId"
                defaultValue={current.subjectId}
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="resourceType">
                Resource type
              </label>
              <select
                className="select"
                id="resourceType"
                name="resourceType"
                defaultValue={current.resourceType}
              >
                <option value="">All types</option>
                <option value="lecture_notes">Lecture notes</option>
                <option value="study_notes">Study notes</option>
                <option value="past_paper">Past paper</option>
                <option value="summary">Summary</option>
                <option value="lab_material">Lab material</option>
                <option value="assignment">Assignment</option>
                <option value="reference">Reference</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="sort">
                Sort
              </label>
              <select className="select" id="sort" name="sort" defaultValue={current.sort}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>

            <button type="submit" className="btn btn--primary btn--block">
              Apply filters
            </button>
            <Link href="/browse" className="btn btn--ghost btn--block">
              Clear
            </Link>
            {taxonomy.ok && institutions.length === 0 && allSubjects.length === 0 ? (
              <p className="hint" role="status">
                No institutions or subjects have been catalogued yet, so those two filters have
                nothing to offer. Keyword search and sort still cover everything.
              </p>
            ) : null}
          </form>
        </aside>

        <section>
          {/* Keeps the heading outline at h1 → h2 → h3 (§19.6): card titles are h3. */}
          <h2 className="visually-hidden">Results</h2>
          {applied.length > 0 ? (
            <div
              className="chips"
              role="region"
              aria-label="Active filters"
              style={{ marginBottom: "var(--space-4)", alignItems: "center" }}
            >
              {current.q ? (
                <Link
                  href={`/browse${buildQuery({ ...current, q: undefined })}`}
                  className="chip chip--active"
                  aria-label={`Remove filter: keyword ${current.q}`}
                >
                  <span>Keyword: “{current.q}”</span>
                  <span aria-hidden="true" style={{ marginLeft: "4px" }}>
                    ×
                  </span>
                </Link>
              ) : null}
              {institutionName ? (
                <Link
                  href={`/browse${buildQuery({ ...current, institutionId: undefined, subjectId: undefined })}`}
                  className="chip chip--active"
                  aria-label={`Remove filter: institution ${institutionName}`}
                >
                  <span>{institutionName}</span>
                  <span aria-hidden="true" style={{ marginLeft: "4px" }}>
                    ×
                  </span>
                </Link>
              ) : null}
              {subjectName ? (
                <Link
                  href={`/browse${buildQuery({ ...current, subjectId: undefined })}`}
                  className="chip chip--active"
                  aria-label={`Remove filter: subject ${subjectName}`}
                >
                  <span>{subjectName}</span>
                  <span aria-hidden="true" style={{ marginLeft: "4px" }}>
                    ×
                  </span>
                </Link>
              ) : null}
              {current.resourceType ? (
                <Link
                  href={`/browse${buildQuery({ ...current, resourceType: undefined })}`}
                  className="chip chip--active"
                  aria-label={`Remove filter: type ${RESOURCE_TYPE_LABELS[current.resourceType] ?? current.resourceType}`}
                >
                  <span>{RESOURCE_TYPE_LABELS[current.resourceType] ?? current.resourceType}</span>
                  <span aria-hidden="true" style={{ marginLeft: "4px" }}>
                    ×
                  </span>
                </Link>
              ) : null}
              <Link href="/browse" className="btn btn--ghost btn--sm">
                Clear all
              </Link>
            </div>
          ) : null}

          {!page.ok ? (
            <div className="alert alert--warning" role="status">
              <span className="alert__title">Library temporarily unavailable</span>
              <span>{page.message}</span>
            </div>
          ) : page.data.items.length === 0 && !hasContentFilters ? (
            /* §13.0 first use: say what the screen will contain and offer the one
               action that fills it — never blame filters that were never applied. */
            <div className="empty">
              <p className="empty__title">Nothing here yet</p>
              <p className="empty__body">
                No resources have been shared with the library yet. Upload the notes from your last
                lecture and they will appear here.
              </p>
              <Link href={session ? "/upload" : "/auth?next=/upload"} className="btn btn--accent">
                {session ? "Upload the first one" : "Create an account to upload"}
              </Link>
            </div>
          ) : page.data.items.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No matches</p>
              <p className="empty__body">
                {applied.length > 0
                  ? `Nothing matched ${applied.join(" · ")}.`
                  : "Nothing matched the filters you chose."}{" "}
                Try a broader search, or clear the filters to see everything the campus has shared.
              </p>
              <Link href="/browse" className="btn btn--secondary">
                Clear filters
              </Link>
            </div>
          ) : (
            <ul className="resource-list">
              {page.data.items.map((item) => (
                <ResourceCard key={item.id} item={item} canSave={Boolean(session)} />
              ))}
            </ul>
          )}

          {page.ok && page.data.pageCount > 1 ? (
            <nav className="pagination" aria-label="Pagination">
              {params.page > 1 ? (
                <Link
                  className="btn btn--secondary btn--sm"
                  href={`/browse${buildQuery({ ...current, page: String(params.page - 1) })}`}
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="result-count">
                Page {page.data.page} of {page.data.pageCount}
              </span>
              {params.page < page.data.pageCount ? (
                <Link
                  className="btn btn--secondary btn--sm"
                  href={`/browse${buildQuery({ ...current, page: String(params.page + 1) })}`}
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
