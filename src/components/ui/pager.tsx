import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Offset pagination, matching what the API actually supports: `page` and
 * `pageSize`, with an exact total. No "load more", no cursor the endpoint
 * cannot honour, no infinite scroll that hides how much is behind it.
 *
 * The links are real URLs, so a page of results can be shared, bookmarked and
 * opened in a new tab — and it works with JavaScript disabled.
 */

export function Pager({
  page,
  pageCount,
  hrefForPage,
  label = "Pagination",
}: {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pager" aria-label={label}>
      {page > 1 ? (
        <Link className="btn btn--secondary btn--sm" href={hrefForPage(page - 1)} rel="prev">
          <Icon name="chevronLeft" size={15} />
          Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="pager__status">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link className="btn btn--secondary btn--sm" href={hrefForPage(page + 1)} rel="next">
          Next
          <Icon name="chevronRight" size={15} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
