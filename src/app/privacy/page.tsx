import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell, type PolicySection } from "@/components/policy-shell";
import { requirePolicy } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "The exact values EDU-SHARE stores, who can read each one, which cookies exist, and how deletion works.",
};

const POLICY = requirePolicy("/privacy");

const SECTIONS: readonly PolicySection[] = [
  { id: "summary", title: "In one paragraph" },
  { id: "stored", title: "What is stored" },
  { id: "never", title: "What is never collected" },
  { id: "visibility", title: "Who can read what" },
  { id: "cookies", title: "Cookies" },
  { id: "location", title: "Where the data lives" },
  { id: "logs", title: "Server logs" },
  { id: "control", title: "Your controls" },
  { id: "changes", title: "Changes to this notice" },
];

const STORED: readonly { name: string; detail: string }[] = [
  {
    name: "Account identity",
    detail:
      "A profile row with a generated id, your display name, your email address, a role, and the id of the authentication user it belongs to. The display name and the role are the only parts another member can ever see.",
  },
  {
    name: "Resource metadata",
    detail:
      "For each upload: the title, the description, the institution and subject it was filed under, its visibility, who owns it, and when it was created and last changed.",
  },
  {
    name: "File metadata",
    detail:
      "The file name you supplied, its size, and the type your browser declared. The stored object is named with a key generated on the server, so your file name is not part of any path.",
  },
  {
    name: "The file itself",
    detail:
      "The bytes you uploaded, exactly as uploaded, in the deployment's object storage. Nothing inspects or rewrites the contents.",
  },
  {
    name: "Your saved list",
    detail:
      "Which resource ids you have marked as saved, linked to your profile id. Nobody else can read this list, and it is never exposed as a count against your profile.",
  },
];

const NEVER: readonly string[] = [
  "No analytics, advertising or marketing technology of any kind.",
  "No third-party script, font, image or embed is loaded by any page.",
  "No location, camera, microphone or payment access â€” those are denied at the header level for the whole site.",
  "No tracking of which pages you read, when, or for how long.",
  "No IP-address log written by the application.",
  "No profiling, scoring or behavioural inference.",
];

const VISIBILITY: readonly { title: string; body: string }[] = [
  {
    title: "Your email address",
    body: "You, and the server. It is explicitly excluded from the view other members can read, so it cannot leak through a listing.",
  },
  {
    title: "Your display name, role and join date",
    body: "Shown to other members beside the resources you publish.",
  },
  {
    title: "A public resource",
    body: "Any visitor who can read the library, signed in or not.",
  },
  {
    title: "A private resource",
    body: "You alone. It is invisible to every other account, including staff accounts.",
  },
  {
    title: "Your saved list",
    body: "You alone, in both directions: nobody can see what you saved, and you cannot see what anyone else saved.",
  },
];

/**
 * `/privacy`.
 *
 * Every sentence here is checkable against the schema in `docs/SCHEMA.md` and the
 * cookie code in `src/lib/auth/`. That is deliberate: a privacy notice describing a
 * hypothetical future system is worthless, so this page describes the columns and
 * cookies that exist today, and says so where a capability is simply absent.
 */
export default function PrivacyPage() {
  return (
    <PolicyShell
      eyebrow="Policy"
      title={POLICY.title}
      summary={POLICY.summary}
      reviewed={POLICY.reviewed}
      sections={SECTIONS}
    >
      <h2 id="summary">In one paragraph</h2>
      <p>
        EDU-SHARE stores what it needs to give you an account and to serve the material you choose
        to share: your display name, your email address, and the files and metadata you upload.
        There is no analytics script, no advertising, no third-party tracker and no profiling.
        Private material is private by a database rule rather than by a promise, your saved list is
        readable only by you, and deleting a resource removes both its row and its stored file.
      </p>

      <h2 id="stored">What is stored</h2>
      <p>
        This is the complete list. If a value is not named here, the application does not collect
        it.
      </p>
      <dl className="ledger">
        {STORED.map((row) => (
          <div key={row.name}>
            <dt>{row.name}</dt>
            <dd>{row.detail}</dd>
          </div>
        ))}
      </dl>

      <h2 id="never">What is never collected</h2>
      <ul>
        {NEVER.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        One consequence is worth stating, because it sounds like a bug: there is no password-reset
        email and no account-recovery flow. Sending one would require a mail provider to hold your
        address, and this deployment has none.
      </p>

      <h2 id="visibility">Who can read what</h2>
      <p>
        Access is enforced by row-level security policies on the database tables themselves, so the
        rules hold even when a query forgets to filter:
      </p>
      <ul>
        {VISIBILITY.map((row) => (
          <li key={row.title}>
            <strong>{row.title}</strong> â€” {row.body}
          </li>
        ))}
      </ul>

      <h2 id="cookies">Cookies</h2>
      <p>
        There are no advertising or analytics cookies. The only cookies that exist are the ones that
        keep you signed in, and they are set only after you authenticate:
      </p>
      <ul>
        <li>
          <strong>Supabase-backed deployment</strong> â€” one or more cookies named{" "}
          <code>edu-share-auth-&lt;key&gt;-&lt;index&gt;</code>. A session is JSON and can exceed
          the size a single cookie allows, so the value is base64url-encoded and split into numbered
          chunks. Each is <strong>HttpOnly</strong>, <strong>SameSite=Lax</strong>, scoped to{" "}
          <code>/</code>, and expires after 30 days of being unused.
        </li>
        <li>
          <strong>Development adapter</strong> â€” a single cookie,{" "}
          <code>edu-share-dev-session</code>, holding a session id that is resolved server-side in
          memory. It exists only when the local development identity adapter is switched on, which
          is impossible in production.
        </li>
      </ul>
      <p>
        Because the session cookie is HttpOnly, page scripts cannot read it, which is what stops an
        injected script on the page from walking off with your session.
      </p>

      <h2 id="location">Where the data lives</h2>
      <ul>
        <li>
          <strong>PostgreSQL</strong> holds the tables described above. In a hosted deployment that
          database is provided by Supabase, which is therefore a processor of your data.
        </li>
        <li>
          <strong>Object storage</strong> holds the uploaded files. Locally this is a directory on
          the deployment host; in a hosted deployment it is Supabase Storage. Storage keys are
          generated by the server and are not guessable from a file name.
        </li>
        <li>
          <strong>Nothing else.</strong> There is no message queue, no search cluster, no data
          warehouse and no third-party API receiving your data.
        </li>
      </ul>

      <h2 id="logs">Server logs</h2>
      <p>
        The application writes short structured lines to the server log for warnings and errors â€”
        an event name and a reason, such as a failed session refresh. It never writes a password, a
        session token, a database connection string, or the contents of an uploaded file. Error
        responses returned to a browser deliberately contain no detail at all, so anything worth
        diagnosing is visible only to whoever operates the deployment.
      </p>

      <h2 id="control">Your controls</h2>
      <ul>
        <li>
          <strong>Delete a resource</strong> from its detail page, or from{" "}
          <Link href="/manage">My uploads</Link>. The row and the stored file are removed together
          and the action cannot be undone â€” there is no soft delete and no recycle bin.
        </li>
        <li>
          <strong>Change visibility</strong> at any time on the edit page. Switching a resource to
          private takes it out of the library immediately.
        </li>
        <li>
          <strong>Change your display name</strong> on the <Link href="/profile">profile page</Link>
          .
        </li>
        <li>
          <strong>End your session</strong> with the sign-out control. Together with the 30-day
          expiry on the session cookie, that is the extent of the account lifecycle in this build:
          there is no self-service account deletion, and requesting one goes through the{" "}
          <Link href="/help">support route</Link>.
        </li>
      </ul>

      <h2 id="changes">Changes to this notice</h2>
      <p>
        The <strong>Last reviewed</strong> date above is the day this text was last checked against
        the schema and the cookie code. Anything that changes what is stored changes this page in
        the same commit â€” the notice is not maintained separately from the software it describes.
      </p>
      <p>
        The <Link href="/terms">terms of use</Link> cover what you may upload, and{" "}
        <Link href="/acceptable-use">academic integrity</Link> covers what must never be uploaded.
      </p>
    </PolicyShell>
  );
}
