import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Breadcrumbs, drawn from the real hierarchy: the library, then the
 * institution and subject a resource is filed under, then the resource.
 *
 * A crumb is only rendered when its target exists as a filter the API actually
 * understands (`?institutionId=`, `?subjectId=`), so every crumb goes
 * somewhere real. The last item is text, not a link to the page you are on.
 */

export interface Crumb {
  label: string;
  href?: string;
}

export function Crumbs({
  items,
  label = "Breadcrumb",
}: {
  items: readonly Crumb[];
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav className="crumbs" aria-label={label}>
      {items.map((crumb, index) => {
        const last = index === items.length - 1;
        return (
          <span className="cluster" key={`${crumb.label}-${index}`} style={{ gap: "var(--sp-2)" }}>
            {index > 0 ? <Icon className="crumbs__sep" name="chevronRight" size={13} /> : null}
            {crumb.href && !last ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span
                className={last ? "crumbs__here" : undefined}
                aria-current={last ? "page" : undefined}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
