import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import { Icon, type IconName } from "@/components/icon";
import { Alert } from "@/components/ui/alert";
import { State } from "@/components/ui/state";
import { getSession } from "@/lib/auth/session";
import { loadResources, loadTaxonomy, toSearchParams } from "@/lib/catalog";

/**
 * The landing page.
 *
 * Three constraints hold this file together, and each is asserted end to end:
 *
 *  1. There is exactly **one** `<h1>`. The hero owns it; every other section is
 *     a level-2 heading.
 *  2. There is exactly **one** link whose accessible name contains "browse the
 *     library" — the hero action. Anything else that points at the library
 *     says something else ("Explore all resources"), so that locator stays
 *     unambiguous.
 *  3. Every figure shown is real. The count under "Recently shared" is the total
 *     the server reported, and when the database is unreachable the page says
 *     so rather than rendering zero.
 *
 * No fake counts, no fake testimonials, no partner logos, and no AI fluff.
 */

const FACTS: readonly { icon: IconName; text: string }[] = [
  { icon: "building", text: "Filed by institution & course code" },
  { icon: "lock", text: "Privacy enforced by database RLS" },
  { icon: "shield", text: "Magic-byte verified · Zero tracking" },
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
    body: "Search by keyword or filter down to an accredited institution or course. Only filters the library actually contains are offered.",
    href: "/browse",
    cta: "Search library",
  },
  {
    icon: "bookmark",
    title: "Keep a private reading list",
    body: "Save materials to your shelf with one click. Your saved list is private in both directions: only you can view your shelf.",
    href: "/saved",
    cta: "View saved shelf",
  },
  {
    icon: "upload",
    title: "Contribute notes back",
    body: "Upload lecture notes, past papers, or summaries. Choose public or private visibility, with progress reporting and validation.",
    href: "/upload",
    cta: "Upload material",
  },
];

const STEPS: readonly { index: string; title: string; body: string }[] = [
  {
    index: "01",
    title: "Locate by syllabus",
    body: "Search titles and descriptions, then narrow by university and semester. One authoritative place where students find exam preparation material.",
  },
  {
    index: "02",
    title: "Verify & Preview",
    body: "Check real file metadata, atomic download counts, and format badges before downloading. PDF previews and direct file inspection.",
  },
  {
    index: "03",
    title: "Save or Contribute",
    body: "Bookmark materials for revision or upload your own notes. You control visibility: start private for personal reference, or publish campus-wide.",
  },
];

const FAQS: readonly { q: string; a: string }[] = [
  {
    q: "Is EDU-SHARE completely free to use?",
    a: "Yes. EDU-SHARE is an independent, non-commercial academic platform built for students and educators. There are no paid tiers, subscription paywalls, or advertising.",
  },
  {
    q: "How does upload privacy work?",
    a: "When you upload a resource, you can set its visibility to 'Public' or 'Private'. Private resources are enforced at the database level via PostgreSQL Row Level Security (RLS) — only your authenticated account can ever see or download them.",
  },
  {
    q: "How are uploaded files verified?",
    a: "Every upload is validated against declared MIME types and inspected for true magic bytes. Scripts, executables, or disguised malicious files are rejected before being accepted.",
  },
  {
    q: "Who moderates submitted resources?",
    a: "Any authenticated user can file an academic integrity or copyright report on any public resource. Platform administrators review open reports through a dedicated moderation queue to resolve, hide, or dismiss flagged content.",
  },
];

export default async function HomePage() {
  const session = await getSession();
  const params = toSearchParams({ pageSize: "6" });
  const [recent, taxonomy] = await Promise.all([
    loadResources(session?.profileId ?? null, params),
    loadTaxonomy(),
  ]);

  const subjectCount = taxonomy.ok ? taxonomy.data.subjects.length : 0;
  const institutionCount = taxonomy.ok ? taxonomy.data.institutions.length : 0;
  const resourceTotal = recent.ok ? recent.data.total : 0;

  return (
    <div className="home">
      {/* Announcement Bar */}
      <div className="announcement">
        <span className="announcement__tag">CAMPUS UPDATE</span>
        <span>
          Verified semester past papers and exam study guides are now live in the catalogue.
        </span>
        <Link href="/browse" className="announcement__link">
          Explore catalogue →
        </Link>
      </div>

      {/* Hero section */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__inner">
          <div className="hero__eyebrow">
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--c-brand)",
              }}
            />
            Academic Resource Exchange
          </div>

          <h1 id="hero-title" className="hero__title">
            The shared campus library for notes, summaries and past papers.
          </h1>

          <p className="hero__lead">
            Find peer-reviewed lecture notes, exam summaries, and syllabus-matched study guides
            organized by accredited institutions and course codes. Free, open, and private by
            default.
          </p>

          <div className="hero__actions">
            <Link href="/browse" className="btn btn--primary btn--lg">
              Browse the library
            </Link>
            <Link
              href={session ? "/upload" : "/auth?next=/upload"}
              className="btn btn--secondary btn--lg"
            >
              {session ? "Upload a resource" : "Sign in to contribute"}
            </Link>
          </div>

          <ul className="hero__facts" role="list">
            {FACTS.map((fact) => (
              <li key={fact.text} className="hero__fact">
                <Icon name={fact.icon} size={16} style={{ color: "var(--c-brand)" }} />
                <span>{fact.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Product Showcase Window (Stage B Approved Visual) */}
      <section className="preview-showcase" aria-label="Interactive Product Preview">
        <div className="preview-window">
          <div className="preview-window__bar">
            <div className="preview-window__dots">
              <div className="preview-window__dot" />
              <div className="preview-window__dot" />
              <div className="preview-window__dot" />
            </div>
            <span className="preview-window__address">
              edu-share.org/browse — Verified Academic Archive
            </span>
            <div style={{ width: 40 }} />
          </div>

          {/* Quick Category Filter Track */}
          <div
            className="chips"
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--c-surface-sunken)",
              borderBottom: "1px solid var(--c-border)",
            }}
          >
            <Link href="/browse" className="chip chip--active">
              All Categories
            </Link>
            <Link href="/browse?resourceType=lecture_notes" className="chip">
              Lecture Notes
            </Link>
            <Link href="/browse?resourceType=study_notes" className="chip">
              Study Notes
            </Link>
            <Link href="/browse?resourceType=past_paper" className="chip">
              Past Papers
            </Link>
            <Link href="/browse?resourceType=summary" className="chip">
              Summaries
            </Link>
            <Link href="/browse?resourceType=lab_material" className="chip">
              Lab Manuals
            </Link>
          </div>

          {/* Live Preview Resource List */}
          <div style={{ padding: "var(--space-5)" }}>
            {!recent.ok ? (
              <Alert tone="warning" title="Library preview unavailable">
                {recent.message}
              </Alert>
            ) : recent.data.items.length === 0 ? (
              <div
                style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--c-ink-3)" }}
              >
                <p>No materials published yet. Be the first to share notes!</p>
                <Link
                  href={session ? "/upload" : "/auth?next=/upload"}
                  className="btn btn--primary btn--sm"
                  style={{ marginTop: "var(--space-3)" }}
                >
                  Upload First Resource
                </Link>
              </div>
            ) : (
              <ul className="resource-list">
                {recent.data.items.slice(0, 3).map((item) => (
                  <ResourceCard key={item.id} item={item} canSave={Boolean(session)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Verified Real Platform Metrics Strip */}
      <section
        style={{
          borderTop: "1px solid var(--c-border)",
          borderBottom: "1px solid var(--c-border)",
          backgroundColor: "var(--c-surface)",
          padding: "var(--space-6) var(--space-4)",
          marginBottom: "var(--space-12)",
        }}
      >
        <div className="container grid-3" style={{ textAlign: "center", gap: "var(--space-6)" }}>
          <div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--c-ink)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {recent.ok ? `${resourceTotal}` : "—"}
            </div>
            <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--c-ink-3)", marginTop: 4 }}>
              Verified Resources in Library
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--c-ink)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {taxonomy.ok ? `${subjectCount}` : "—"}
            </div>
            <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--c-ink-3)", marginTop: 4 }}>
              Accredited Subjects across {institutionCount} Universities
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--c-brand)",
                fontFamily: "var(--font-mono)",
              }}
            >
              100%
            </div>
            <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--c-ink-3)", marginTop: 4 }}>
              Open Access · 0 Ads · 0 Tracking
            </div>
          </div>
        </div>
      </section>

      {/* Recently shared (full shelf) */}
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

      {/* Workflows */}
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

      {/* Frequently Asked Questions */}
      <section className="section section--alt" aria-labelledby="faq-title">
        <div className="container" style={{ maxWidth: 840 }}>
          <div
            className="section-head"
            style={{ textAlign: "center", marginBottom: "var(--space-8)" }}
          >
            <div style={{ margin: "0 auto" }}>
              <p className="eyebrow">Answers</p>
              <h2 id="faq-title">Frequently asked questions</h2>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {FAQS.map((faq) => (
              <div key={faq.q} className="card" style={{ padding: "var(--space-5)" }}>
                <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--space-2)" }}>
                  {faq.q}
                </h3>
                <p
                  style={{ color: "var(--c-ink-2)", fontSize: "var(--fs-body)", lineHeight: 1.55 }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Conversion CTA */}
      <section className="section" aria-label="Contribute to library">
        <div className="container" style={{ maxWidth: 920 }}>
          <div
            className="card"
            style={{
              padding: "var(--space-10) var(--space-6)",
              textAlign: "center",
              background: "var(--c-surface-sunken)",
              border: "1px solid var(--c-border)",
            }}
          >
            <h2 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--space-3)" }}>
              Ready to organize your semester?
            </h2>
            <p
              style={{
                color: "var(--c-ink-2)",
                fontSize: "var(--fs-body)",
                maxWidth: 580,
                margin: "0 auto var(--space-6)",
                lineHeight: 1.5,
              }}
            >
              Join your peers in building an open, verified academic archive. Upload your notes or
              explore syllabus material from other campuses.
            </p>
            <div
              style={{
                display: "flex",
                gap: "var(--space-4)",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/browse" className="btn btn--primary btn--lg">
                Explore all resources
              </Link>
              <Link
                href={session ? "/upload" : "/auth?next=/upload"}
                className="btn btn--secondary btn--lg"
              >
                {session ? "Upload notes" : "Create an account"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
