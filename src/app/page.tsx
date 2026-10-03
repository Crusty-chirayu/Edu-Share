import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import { Icon, type IconName } from "@/components/icon";
import { Alert } from "@/components/ui/alert";
import { State } from "@/components/ui/state";
import { getSession } from "@/lib/auth/session";
import { loadResources, toSearchParams } from "@/lib/catalog";

/**
 * The landing page.
 *
 * Three constraints hold this file together, and each is asserted end to end:
 *
 *  1. There is exactly **one** `<h1>`. The hero owns it; every other section is
 *     a level-2 heading.
 *  2. There is exactly **one** link whose accessible name contains "browse the
 *     library" — the hero action. Anything else that points at the library
 *     says something else ("Open the library"), so that locator stays
 *     unambiguous.
 *  3. Every figure shown is real. The count under "Recently added" is the total
 *     the server reported, and when the database is unreachable the page says
 *     so rather than rendering zero, which would be indistinguishable from an
 *     empty library.
 *
 * Nothing here is a claim the product cannot support: no invented user counts,
 * no testimonials, no partner logos, and no "AI" anything.
 */

const FACTS: readonly { icon: IconName; text: string }[] = [
  { icon: "building", text: "Filed by institution and subject" },
  { icon: "lock", text: "Private is enforced by the database" },
  { icon: "shield", text: "No analytics, no advertising, no third-party scripts" },
];

const CAN_DO: readonly {
  icon: IconName;
  title: string;
  body: string;
  href: string;
  cta: string;
}[] = [
  {
    icon: "search",
    title: "Find the week you missed",
    body: "Search by keyword, then narrow to an institution or a subject. Only the filters the library actually has are offered — nothing is a decoration.",
    href: "/browse",
    cta: "Search the library",
  },
  {
    icon: "bookmark",
    title: "Keep a reading list",
    body: "Save anything worth coming back to. Your saved list is private in both directions: you cannot see anyone else's, and nobody can see yours.",
    href: "/saved",
    cta: "See your shelf",
  },
  {
    icon: "upload",
    title: "Put your notes back in",
    body: "Upload takes a title, a file and a visibility. Start private and open it up later — the choice is one field on the edit form.",
    href: "/upload",
    cta: "Upload a resource",
  },
];

const STEPS: readonly { index: string; title: string; body: string }[] = [
  {
    index: "01",
    title: "Find it",
    body: "Search the title and the description, then filter down to your institution or subject. One file, in the place the next person will look for it.",
  },
  {
    index: "02",
    title: "Save it",
    body: "One press puts a resource on your private shelf. The count next to a resource is how many people have done the same.",
  },
  {
    index: "03",
    title: "Share it",
    body: "Titles and descriptions are what make a file findable, so they matter more than the filename. Choose public or private, and change your mind whenever.",
  },
];

const TYPES: readonly { label: string; note: string }[] = [
  { label: "Lecture notes", note: "Typed or handwritten, from a lecture or a series" },
  { label: "Summaries", note: "Topic condensations and formula sheets" },
  { label: "Past papers", note: "Released papers, embargoes finished" },
  { label: "Handouts", note: "Material your department distributes openly" },
  { label: "Worked problems", note: "Solution walkthroughs you wrote yourself" },
  { label: "Lab reports", note: "Methods, readings, results" },
];

const TRUST: readonly { mark: string; title: string; body: string }[] = [
  {
    mark: "Privacy",
    title: "Private means private",
    body: "Visibility is a database policy, not an interface trick. A private file is invisible to every other account even if a query forgets to filter for it.",
  },
  {
    mark: "Integrity",
    title: "Files are checked before they are stored",
    body: "Size, declared type and the file's actual leading bytes. A script renamed to .pdf is refused before anything is written.",
  },
  {
    mark: "Honesty",
    title: "Every number is real",
    body: "Counts, sizes and dates come from rows in the database. When it cannot be reached, the page says so instead of showing an empty library.",
  },
  {
    mark: "No tracking",
    title: "Nothing is watching",
    body: "No analytics, no advertising, no third-party fonts. The only cookies keep you signed in.",
  },
];

export default async function HomePage() {
  const session = await getSession();
  const params = toSearchParams({ pageSize: "6" });
  const recent = await loadResources(session?.profileId ?? null, params);

  return (
    <div className="home">
      {/* Hero section */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__inner">
          <div className="hero__content">
            <p className="hero__eyebrow">Academic Resource Exchange</p>
            <h1 id="hero-title" className="hero__title">
              Find the notes. Share the knowledge.
            </h1>
            <p className="hero__lead">
              An open, student-first library of lecture notes, summaries, past papers and study
              guides organized by institution and subject.
            </p>

            <div className="hero__actions">
              <Link href="/browse" className="btn btn--primary btn--lg">
                Browse the library
              </Link>
              <Link
                href={session ? "/upload" : "/auth?next=/upload"}
                className="btn btn--secondary btn--lg"
              >
                {session ? "Upload resources" : "Sign in to contribute"}
              </Link>
            </div>

            <ul className="hero__facts" role="list">
              {FACTS.map((fact) => (
                <li key={fact.text} className="hero__fact">
                  <Icon name={fact.icon} size={16} />
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Recently shared */}
      <section className="section" aria-labelledby="recent-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Fresh material</p>
              <h2 id="recent-title">Recently shared</h2>
            </div>
            {recent.ok && recent.data.total > 0 ? (
              <span className="result-count">
                {recent.data.total} {recent.data.total === 1 ? "resource" : "resources"} in library
              </span>
            ) : null}
          </div>

          {!recent.ok ? (
            <Alert tone="warning" title="Library temporarily unavailable">
              {recent.message}
            </Alert>
          ) : recent.data.items.length === 0 ? (
            <State
              icon="file"
              title="Nothing here yet"
              actions={
                <Link
                  href={session ? "/upload" : "/auth?next=/upload"}
                  className="btn btn--primary"
                >
                  {session ? "Upload the first resource" : "Sign in to upload"}
                </Link>
              }
            >
              No resources have been shared with the library yet. Share your lecture notes or study
              guides to get things started.
            </State>
          ) : (
            <ul className="resource-list">
              {recent.data.items.map((item) => (
                <ResourceCard key={item.id} item={item} canSave={Boolean(session)} />
              ))}
            </ul>
          )}

          {recent.ok && recent.data.items.length > 0 ? (
            <div className="center-actions" style={{ marginTop: "var(--space-6)" }}>
              <Link href="/browse" className="btn btn--secondary">
                Explore all resources
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* How it works */}
      <section className="section section--alt" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Process</p>
              <h2 id="how-title">How it works</h2>
            </div>
          </div>

          <div className="grid-3">
            {STEPS.map((step) => (
              <div key={step.index} className="card step-card">
                <span className="step-card__index">{step.index}</span>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core workflows */}
      <section className="section" aria-labelledby="features-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Workflows</p>
              <h2 id="features-title">Built for your semester</h2>
            </div>
          </div>

          <div className="grid-3">
            {CAN_DO.map((item) => (
              <div key={item.title} className="card feature-card">
                <Icon name={item.icon} size={24} className="feature-card__icon" />
                <h3 className="feature-card__title">{item.title}</h3>
                <p className="feature-card__body">{item.body}</p>
                <Link href={item.href} className="feature-card__link">
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource formats */}
      <section className="section section--alt" aria-labelledby="formats-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Coverage</p>
              <h2 id="formats-title">What students share</h2>
            </div>
          </div>

          <div className="grid-3">
            {TYPES.map((t) => (
              <div key={t.label} className="card type-card">
                <h3 className="type-card__label">{t.label}</h3>
                <p className="type-card__note">{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & principles */}
      <section className="section" aria-labelledby="trust-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Guarantees</p>
              <h2 id="trust-title">Built on trust</h2>
            </div>
          </div>

          <div className="grid-3">
            {TRUST.map((item) => (
              <div key={item.mark} className="card trust-card">
                <span className="trust-card__badge">{item.mark}</span>
                <h3 className="trust-card__title">{item.title}</h3>
                <p className="trust-card__body">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
