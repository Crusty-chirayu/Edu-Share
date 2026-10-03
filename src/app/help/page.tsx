import type { Metadata } from "next";
import Link from "next/link";
import { CREATOR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help and support",
  description:
    "How to upload, why a file was refused, where private resources live, and what to do when a page reports a problem.",
};

interface Answer {
  readonly question: string;
  readonly body: React.ReactNode;
}

const FINDING: readonly Answer[] = [
  {
    question: "The library looks empty. Is something broken?",
    body: (
      <>
        Only if the page also says so. An empty library is a real, honest state: nothing has been
        uploaded that you are allowed to see. If the database were unreachable you would get a
        warning panel instead, with the reason. If you had been filtering, press <em>Clear</em> in
        the filter panel first â€” it is far more common to be filtered into nothing than to be
        looking at an empty campus.
      </>
    ),
  },
  {
    question: "A search returns nothing I expect, even though I know the file exists.",
    body: (
      <>
        Search matches words in the <strong>title</strong> and the <strong>description</strong>{" "}
        only; it does not read inside the file and it does not do fuzzy matching. Try a shorter
        fragment of the title, then widen the institution and subject filters back to their
        defaults.
      </>
    ),
  },
  {
    question: "A download link gives me a 404.",
    body: (
      <>
        Three things produce that response, deliberately: the resource is private and belongs to
        someone else, it has been deleted, or the link is stale. A missing row and a forbidden row
        are answered identically on purpose, so the endpoint cannot be used to discover which
        private resources exist.
      </>
    ),
  },
  {
    question: "Why can I not open another student's saved list?",
    body: (
      <>
        Bookmarks are private to the person who made them, in both directions. There is no URL that
        shows someone else&apos;s list, because the database never returns those rows to you.
      </>
    ),
  },
];

const UPLOADING: readonly Answer[] = [
  {
    question: "What can I upload?",
    body: (
      <>
        Files up to <strong>25 MB</strong>, in these formats: PDF, DOCX, PPTX, XLSX, PNG, JPG/JPEG,
        TXT, MD, CSV and ZIP. Anything else is refused by name, with the accepted list included in
        the message.
      </>
    ),
  },
  {
    question: "My PDF was refused even though the extension is right.",
    body: (
      <>
        The server checks the first bytes of the file, not the name and not the browser&apos;s
        declared type. A script or an archive renamed to <code>.pdf</code> is refused â€” and
        nothing is written to storage or to the database, so there is no half-created resource to
        clean up. If a genuine PDF is refused, it is probably a corrupt download.
      </>
    ),
  },
  {
    question: "Should I mark something public or private?",
    body: (
      <>
        <strong>Public</strong> means every member can read and download it.{" "}
        <strong>Private</strong> means only your account can, and it still appears on{" "}
        <Link href="/manage">My uploads</Link> so you never lose track of it. When in doubt, start
        private and change it later â€” visibility is a single field on the edit page.
      </>
    ),
  },
  {
    question: "I picked the wrong subject. Can I fix it?",
    body: (
      <>
        Yes. Open <Link href="/manage">My uploads</Link>, press <em>Edit</em> next to the resource,
        and change the title, description, subject or visibility. You can replace the file itself
        there too: drop a new one on <em>Replace file</em> and save â€” the old bytes are removed
        from storage when the new ones are stored, so the resource keeps exactly one file.
      </>
    ),
  },
];

const ACCOUNT: readonly Answer[] = [
  {
    question:
      "Sign-in says my email and password did not match, and I am sure the address is right.",
    body: (
      <>
        That single message covers both an unknown address and a wrong password, which stops the
        form being used to discover who has an account. On a Supabase-backed deployment you may also
        need to confirm your email address first; the sign-up response says so when that step is
        pending.
      </>
    ),
  },
  {
    question: 'Everything says "Dev identity". What does that mean?',
    body: (
      <>
        That you are signed in through the local development adapter, which exists so the
        application can be built and tested offline. It has no password, it ends when the server
        stops, and it is hard-blocked in production. It is labelled everywhere it appears, so it can
        never be mistaken for a real account.
      </>
    ),
  },
  {
    question: "How do I delete something I uploaded?",
    body: (
      <>
        Open the resource and press <em>Delete</em>. You are asked to confirm first, because the
        action removes both the database row and the stored file and cannot be undone. If the delete
        fails, the button says so â€” the resource has not gone anywhere.
      </>
    ),
  },
  {
    question: "I am signed in, but a page keeps sending me to the sign-in screen.",
    body: (
      <>
        Protected pages (<Link href="/upload">Upload</Link>, <Link href="/profile">Profile</Link>)
        redirect and remember where you were going, so you land back there after signing in. If the
        loop repeats, your session cookie is not being stored â€” check that cookies are enabled for
        this site.
      </>
    ),
  },
];

const TROUBLE: readonly Answer[] = [
  {
    question: '"Library temporarily unavailable" â€” what now?',
    body: (
      <>
        The application could not reach the database, and it says so rather than showing an empty
        page that would be indistinguishable from a genuinely empty library. Reload in a moment; if
        it persists, the same condition is visible at <Link href="/api/health">service health</Link>{" "}
        as <code>&quot;status&quot;:&quot;degraded&quot;</code>.
      </>
    ),
  },
  {
    question: '"Something went wrong" â€” where is the detail?',
    body: (
      <>
        Withheld on purpose. Error pages never render a stack trace, a driver message or a
        connection string, because those would be visible to any visitor who triggered them. The
        detail is written to the server log instead.
      </>
    ),
  },
  {
    question: "Can I force a light or dark theme?",
    body: (
      <>
        Not yet. The palette follows your operating system&apos;s preference, and there is no
        toggle, because a half-working theme control is worse than an honest one. Contrast is
        checked against the same tokens in both themes.
      </>
    ),
  },
  {
    question: "Is there an API I can use?",
    body: (
      <>
        The application has its own JSON endpoints under <code>/api</code>, but they are built for
        this interface rather than as a published public API: there is no version guarantee, no key
        management and no rate limiting. Treat them as internal until a documented API ships.
      </>
    ),
  },
];

/** The four groups, in the order a new user meets them. */
const GROUPS: readonly { id: string; title: string; lede: string; items: readonly Answer[] }[] = [
  {
    id: "finding",
    title: "Finding material",
    lede: "Filtering, searching, and what a 404 actually means.",
    items: FINDING,
  },
  {
    id: "uploading",
    title: "Uploading and editing",
    lede: "What is accepted, what is refused, and how to change your mind about visibility.",
    items: UPLOADING,
  },
  {
    id: "account",
    title: "Accounts and sessions",
    lede: "Signing in, the development adapter, and removing what you have published.",
    items: ACCOUNT,
  },
  {
    id: "trouble",
    title: "When something looks wrong",
    lede: "Reading the messages the application shows on purpose.",
    items: TROUBLE,
  },
];

const FACTS = [
  { figure: "25 MB", label: "Maximum size of a single uploaded file" },
  { figure: "10", label: "Accepted file formats, checked by content as well as name" },
  { figure: "2", label: "Visibility settings: the whole campus, or only you" },
  { figure: "0", label: "Analytics scripts, advertising, or third-party trackers" },
];
/**
 * `/help` â€” the support surface.
 *
 * There is no support inbox, so this page does the work a support inbox would:
 * it explains the messages the product is allowed to show, in the order a user
 * meets them, and it is honest about which behaviour is intentional. Every claim
 * here matches the code: the 25 MB cap and the format list come from
 * `src/lib/validation.ts`, and the 404-for-a-forbidden-resource rule comes from
 * the download route.
 */
export default function HelpPage() {
  return (
    <div className="shell">
      <div className="pagehead">
        <div className="pagehead__title">
          <p className="sec__eyebrow">Support</p>
          <h1>Help and support</h1>
          <p className="lede">
            Short, specific answers. If a message you have seen is not explained below, it is a real
            problem â€” the fourth group covers what the application is allowed to tell you, and
            why.
          </p>
        </div>
        <div className="btn-group">
          <Link href="/browse" className="btn btn--primary btn--sm">
            Open the library
          </Link>
          <Link href="/about" className="btn btn--secondary btn--sm">
            About the project
          </Link>
        </div>
      </div>

      <div className="stack">
        <div className="grid-4">
          {FACTS.map((fact) => (
            <div className="stat" key={fact.label}>
              <span className="stat__figure">{fact.figure}</span>
              <span className="stat__label">{fact.label}</span>
            </div>
          ))}
        </div>

        <div className="toc">
          <p className="toc__title">Jump to</p>
          <ol>
            {GROUPS.map((group) => (
              <li key={group.id}>
                <a href={`#${group.id}`}>{group.title}</a>
              </li>
            ))}
          </ol>
        </div>

        {GROUPS.map((group) => (
          <section key={group.id} id={group.id}>
            <div className="sec__title">
              <h2>{group.title}</h2>
              <p className="sec__lede">{group.lede}</p>
            </div>
            <div className="faq">
              {group.items.map((item) => (
                <article className="faq__item" key={item.question}>
                  <h3 className="faq__q">{item.question}</h3>
                  <p className="faq__a">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section id="still-stuck">
          <div className="sec__title">
            <h2>Still stuck</h2>
          </div>
          <div className="prose">
            <p>
              There is no support address for this deployment, and inventing one would be worse than
              saying so. The route that does work: open an issue on the source repository with the
              page you were on, what you expected, and what happened â€” plus the message the page
              displayed, if the resource was unavailable.
            </p>
            <p className="note">
              Concerns about a specific upload, its authorship or its permitted use are handled
              through the <Link href="/acceptable-use">academic integrity</Link> policy rather than
              as a bug report.
            </p>
          </div>
          <div className="cta" style={{ marginTop: "var(--space-5)" }}>
            <div className="cta__actions">
              <a
                className="btn btn--primary"
                href="https://github.com/Crusty-chirayu/Edu-Share"
                rel="noreferrer noopener"
                target="_blank"
              >
                Source repository
                <span className="vh"> (opens in a new tab)</span>
              </a>
              <Link href="/privacy" className="btn btn--secondary">
                Privacy notice
              </Link>
              <Link href="/terms" className="btn btn--secondary">
                Terms of use
              </Link>
            </div>
            <p className="note">
              Maintained by <span className="credit__name">{CREATOR.name}</span>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
