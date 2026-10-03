import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Crumbs } from "@/components/ui/crumbs";
import { formatDate } from "@/lib/format";
import { POLICIES } from "@/lib/site";

export interface PolicySection {
  readonly id: string;
  readonly title: string;
}

/**
 * The shared shell for `/terms`, `/privacy` and `/acceptable-use`.
 *
 * Three documents written at different times drift: one grows a contents list,
 * one forgets the review date, one links to the other two and one does not.
 * They are rendered from one component so the only thing that can differ
 * between them is the text.
 *
 * The "last reviewed" stamp is not decoration. `reviewed` is threaded in from
 * `src/lib/site.ts`, so there is one date in one place, and a reader can compare
 * it against the code it describes.
 */
export function PolicyShell({
  eyebrow,
  title,
  summary,
  reviewed,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  reviewed: string;
  sections: readonly PolicySection[];
  children: React.ReactNode;
}) {
  const others = POLICIES.filter((policy) => policy.title !== title);

  return (
    <div className="shell">
      <Crumbs
        items={[{ label: "EDU-SHARE home", href: "/" }, { label: "Policy" }, { label: title }]}
      />

      <div className="pagehead">
        <div className="pagehead__title">
          <p className="sec__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{summary}</p>
        </div>
        <p className="reviewed">
          <span>Last reviewed</span>
          <time dateTime={reviewed}>{formatDate(reviewed)}</time>
        </p>
      </div>

      <div className="stack">
        {sections.length > 0 ? (
          <nav className="toc" aria-label="On this page">
            <p className="toc__title">On this page</p>
            <ol>
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="prose">{children}</div>

        <Alert tone="info" title="The other two documents">
          <p>
            Every policy here describes what this software actually does. Where the code and the
            text disagree, the code is right and the text is the bug — please report it.
          </p>
          <p className="chip-row">
            {others.map((policy) => (
              <Link key={policy.href} className="chip" href={policy.href}>
                {policy.title}
              </Link>
            ))}
          </p>
        </Alert>
      </div>
    </div>
  );
}
