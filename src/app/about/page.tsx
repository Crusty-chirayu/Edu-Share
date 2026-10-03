import type { Metadata } from "next";
import Link from "next/link";
import { CREATOR, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "What EDU-SHARE is, who it is for, how it works, and how it is built â€” with the constraints it accepts on purpose.",
};

const STEP = [
  {
    index: "01",
    title: "Sign in",
    body: "An email address and a display name are all the account needs. The display name is the only thing other students ever see next to a resource.",
  },
  {
    index: "02",
    title: "File it",
    body: "Every upload is placed in an institution and a subject. That pair is what makes the library searchable months later, when nobody remembers the file name.",
  },
  {
    index: "03",
    title: "Choose who sees it",
    body: "Public puts it in the campus library. Private keeps it to your own account. The choice is enforced by the database, not by the interface.",
  },
];

const AUDIENCE = [
  {
    title: "Students revising",
    body: "Find the week of notes you missed, or a worked example for the topic the textbook explains badly, without asking around a group chat.",
  },
  {
    title: "Students contributing",
    body: "Your notes only have to be useful once more to be worth sharing. Uploading takes a title, a subject and a file.",
  },
  {
    title: "Course staff",
    body: "A place for the material you are already allowed to distribute, under one folder per subject instead of five different chat threads.",
  },
  {
    title: "Anyone evaluating this",
    body: "The whole application is built in the open with a stated threat model, a tested migration path and no invented metrics.",
  },
];

const PRINCIPLE = [
  {
    mark: "Scope",
    title: "One job, done properly",
    body: "Find coursework, keep a reading list, share your own notes. There are no likes, no follower graphs, no recommendations and no feed to scroll.",
  },
  {
    mark: "Honesty",
    title: "Every number is real",
    body: "Counts, sizes and dates come from rows in the database. When the database is unreachable the interface says so instead of showing zero.",
  },
  {
    mark: "Privacy",
    title: "Private means private",
    body: "A private resource is filtered out by a row-level security policy, so it is invisible to every other account even if a query is written carelessly.",
  },
  {
    mark: "Access",
    title: "Keyboard first, colour never alone",
    body: "Every control is reachable and labelled, skip links come before the navigation, and a status is never signalled by colour without words.",
  },
];

/**
 * `/about` â€” the page the footer, the empty states and the policies all point at
 * when a reader asks "what is this, and why should I believe it?".
 *
 * The `id` values here are linked from the footer (`/about#how-it-works`,
 * `/about#who-it-is-for`, `/about#creator`), so they are part of the URL contract
 * rather than decoration.
 */
export default function AboutPage() {
  return (
    <div className="shell">
      <div className="pagehead">
        <div className="pagehead__title">
          <p className="sec__eyebrow">About</p>
          <h1>About EDU-SHARE</h1>
          <p className="lede">{SITE.description}</p>
        </div>
        <div className="btn-group">
          <Link href="/browse" className="btn btn--primary btn--sm">
            Open the library
          </Link>
          <Link href="/help" className="btn btn--secondary btn--sm">
            Help and support
          </Link>
        </div>
      </div>

      <div className="stack">
        <section className="prose">
          <h2 id="why">Why this exists</h2>
          <p>
            Coursework is produced once and needed many times. A set of lecture notes written in
            September is exactly what someone else needs in December, and today that usually travels
            through a group chat, a shared drive nobody can search, or not at all. The cost is not
            the file â€” it is the twenty minutes of asking around before you find it.
          </p>
          <p>
            EDU-SHARE is a small, deliberately boring answer to that: one library, filed by{" "}
            <strong>institution</strong> and <strong>subject</strong>, where the person who uploads
            something decides whether the campus or only they can see it.
          </p>
        </section>

        <section>
          <div className="sec__title">
            <h2 id="how-it-works">How it works</h2>
            <p className="sec__lede">
              Three steps, in the order you perform them. Nothing else is required to use the
              product.
            </p>
          </div>
          <ol className="step">
            {STEP.map((step) => (
              <li key={step.index}>
                <span className="step__num">{step.index}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="sec__title">
            <h2 id="who-it-is-for">Who it is for</h2>
            <p className="sec__lede">
              The product has one audience â€” people at a campus who need each other&apos;s
              material â€” and the interface is shaped around them rather than around a general
              audience.
            </p>
          </div>
          <div className="grid-2">
            {AUDIENCE.map((item) => (
              <article className="feature" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="sec__title">
            <h2 id="principles">What it will not compromise on</h2>
          </div>
          <div className="grid-2">
            {PRINCIPLE.map((item) => (
              <article className="feature" key={item.mark}>
                <span className="feature__mark">{item.mark}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="prose">
          <h2 id="how-it-is-built">How it is built</h2>
          <p>
            The application is a Next.js App Router project rendering on the server, with PostgreSQL
            as the only source of truth. Authorization is expressed as row-level security policies
            on the tables themselves, so a private resource stays private even if a query forgets to
            filter for it â€” the protection does not depend on the interface being careful.
          </p>
          <ul>
            <li>
              <strong>Identity</strong> is verified server-side on every request. A session cookie
              alone is never treated as proof of who the caller is.
            </li>
            <li>
              <strong>Uploads</strong> are validated three times: size, declared type, and the
              actual leading bytes of the file. A script renamed to <code>.pdf</code> is refused
              before anything is stored.
            </li>
            <li>
              <strong>Storage keys</strong> are generated on the server and are opaque, so a file
              name supplied by a browser can never become a path.
            </li>
            <li>
              <strong>Every page</strong> carries baseline security headers: content-type sniffing
              disabled, framing denied, a referrer policy, and camera, microphone, geolocation and
              payment denied outright.
            </li>
          </ul>
          <p>
            There is no analytics script, no advertising, no third-party tracker and no profiling.
            The only cookies are the ones that keep you signed in â€” which is why the{" "}
            <Link href="/privacy">privacy notice</Link> is short enough to read in full.
          </p>
        </section>

        <section className="band band--tint">
          <div className="band__inner">
            <div className="sec__title">
              <h2 id="creator">Who built it</h2>
            </div>
            <div className="cta">
              <div className="cta__text">
                <p>
                  EDU-SHARE was designed and built by{" "}
                  <span className="credit__name">{CREATOR.name}</span> â€” {CREATOR.role}.
                </p>
                <p className="note">
                  The design system, the database policies and the test suites are part of the same
                  work. If you want to check any claim on this page, the source is public.
                </p>
              </div>
              <div className="cta__actions">
                {CREATOR.links.map((link) => (
                  <a
                    key={link.href}
                    className="btn btn--secondary"
                    href={link.href}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {link.label}
                    <span className="vh"> (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="prose">
          <h2 id="limits">Known limits, stated plainly</h2>
          <p>
            A product page that only lists strengths is not worth reading. These are the real
            boundaries of the current build:
          </p>
          <ul>
            <li>
              The library is only as good as what has been uploaded â€” an empty subject is a
              genuine empty state, not a loading bug.
            </li>
            <li>
              Search matches keywords against the title and description. It is not a full-text
              index, and it does not read inside the files.
            </li>
            <li>
              An unexpected server failure shows a generic message. The detail is withheld from the
              browser on purpose, so it has to be read from the server log.
            </li>
            <li>
              There is no moderation queue and no report button yet; intellectual-property and
              integrity concerns go through the{" "}
              <Link href="/acceptable-use">academic integrity</Link> route instead.
            </li>
          </ul>
        </section>

        <div className="toc">
          <p className="toc__title">Where to go next</p>
          <ol>
            <li>
              <Link href="/browse">Browse the library</Link>
            </li>
            <li>
              <Link href="/upload">Upload a resource</Link>
            </li>
            <li>
              <Link href="/terms">Terms of use</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy notice</Link>
            </li>
            <li>
              <Link href="/acceptable-use">Academic integrity</Link>
            </li>
            <li>
              <Link href="/help">Help and support</Link>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
