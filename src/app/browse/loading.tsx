import { ListSkeleton } from "@/components/list-skeleton";

/**
 * Streaming placeholder for `/browse`.
 *
 * This is a route-level `loading.tsx`, so it renders the moment the navigation
 * starts rather than after the query returns — which matters here, because the
 * listing waits for the taxonomy and the page of results together.
 *
 * Note what is deliberately absent: an `<h1>`. The real page owns the one
 * heading, and a placeholder that also carried "Browse resources" would put two
 * elements with the same accessible name in the document for the length of the
 * swap. The title row is drawn as a bar instead, so the layout still does not
 * jump when the data lands.
 */
export default function BrowseLoading() {
  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head__title">
          <p className="eyebrow">Library</p>
          <span className="skeleton-line skeleton-line--title" aria-hidden="true" />
        </div>
      </div>
      <div className="browse">
        <aside className="filters" aria-hidden="true">
          <p className="filters__head">Refine</p>
          <div className="skeleton-block">
            <span className="skeleton-line skeleton-line--short" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
        </aside>
        <section>
          <ListSkeleton label="Loading the library" rows={4} />
        </section>
      </div>
    </div>
  );
}
