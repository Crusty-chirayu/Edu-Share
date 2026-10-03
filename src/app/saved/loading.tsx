import { ListSkeleton } from "@/components/list-skeleton";
import { SectionTabs } from "@/components/section-tabs";

/**
 * Streaming placeholder for `/saved` — the caller's private reading list.
 *
 * Heading as a bar, not an `<h1>`: see `browse/loading.tsx` for why.
 */
export default function SavedLoading() {
  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head__title">
          <p className="eyebrow">Reading list</p>
          <span className="skeleton-line skeleton-line--title" aria-hidden="true" />
        </div>
      </div>
      <SectionTabs active="saved" />
      <div style={{ marginTop: "var(--space-5)" }}>
        <ListSkeleton label="Loading your saved list" rows={3} />
      </div>
    </div>
  );
}
