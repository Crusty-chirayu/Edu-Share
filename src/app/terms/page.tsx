import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell, type PolicySection } from "@/components/policy-shell";
import { SITE, requirePolicy } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "What you agree to when you read, save or upload material on EDU-SHARE, and what the project commits to in return.",
};

const POLICY = requirePolicy("/terms");

const SECTIONS: readonly PolicySection[] = [
  { id: "agreement", title: "The agreement" },
  { id: "accounts", title: "Accounts" },
  { id: "your-content", title: "What you upload" },
  { id: "other-peoples-work", title: "Other people's work" },
  { id: "not-allowed", title: "Not allowed here" },
  { id: "availability", title: "Availability and warranty" },
  { id: "ending", title: "Ending access" },
  { id: "changes", title: "Changes to these terms" },
];

/**
 * `/terms`.
 *
 * Written to be checkable rather than impressive: every obligation stated here
 * corresponds to something the software does or refuses to do, and the page says
 * plainly that it is not lawyer-drafted. A student project pretending to have a
 * legal department is a claim a reader can spot immediately.
 */
export default function TermsPage() {
  return (
    <PolicyShell
      eyebrow="Policy"
      title={POLICY.title}
      summary={POLICY.summary}
      reviewed={POLICY.reviewed}
      sections={SECTIONS}
    >
      <h2 id="agreement">The agreement</h2>
      <p>
        {SITE.name} is an academic resource-sharing service. By creating an account or using the
        library you accept these terms. If you do not accept them, do not create an account â€” the{" "}
        <Link href="/browse">public library</Link> can be read without one.
      </p>
      <p className="note">
        Plain-language disclosure: this document was written by the project&apos;s author, not by a
        lawyer, and it has not been reviewed by one. It describes how the software behaves and what
        is expected of the people using it. It is not legal advice, and it does not create rights
        beyond those the software and the applicable law already give you.
      </p>

      <h2 id="accounts">Accounts</h2>
      <ul>
        <li>
          You need an account to upload, to save something, or to see anything marked private. One
          display name and one email address are required; nothing else is collected.
        </li>
        <li>
          The <strong>display name</strong> is shown to other members next to anything you publish.
          Do not use it to impersonate someone else, and do not put personal information in it that
          you would not want on a noticeboard.
        </li>
        <li>
          You are responsible for what happens through your account. There is no email-based
          password reset in this build, so keep your credentials to yourself and sign out on a
          shared machine.
        </li>
        <li>
          A single account belongs to a single person. Do not share credentials to get around an
          access limit, because there is no access limit to get around â€” the library is open to
          every member.
        </li>
      </ul>

      <h2 id="your-content">What you upload</h2>
      <p>
        <strong>You keep ownership of everything you upload.</strong> The project does not claim
        copyright over your notes, and it does not sell, sublicense or publish them anywhere except
        at the visibility level you chose.
      </p>
      <p>In exchange, you grant the service the narrow permission it needs to do its job:</p>
      <ul>
        <li>
          to <strong>store a copy</strong> of the file in the deployment&apos;s object storage;
        </li>
        <li>
          to <strong>serve that copy</strong> to you, and â€” when the resource is marked public â€”
          to other signed-in members, on request;
        </li>
        <li>
          to <strong>display the metadata</strong> you entered (title, description, subject,
          institution, size, date) in listings and on the detail page.
        </li>
      </ul>
      <p>
        That permission ends when the resource is deleted. Deletion removes the database row and the
        stored file together; <Link href="/help">help and support</Link> explains what you see if a
        delete fails.
      </p>
      <p>You confirm, for anything you upload, that:</p>
      <ul>
        <li>it is your own work, or you have permission to share it;</li>
        <li>
          it contains no personal data about anyone else that they would not expect to be shared;
        </li>
        <li>
          it is accurate about its own format â€” the server checks the bytes as well as the name,
          and refuses honest mistakes alongside disguised ones.
        </li>
      </ul>

      <h2 id="other-peoples-work">Other people&apos;s work</h2>
      <ul>
        <li>
          Material you read here was written by another student or member of staff. Reading it does
          not transfer any right in it to you.
        </li>
        <li>
          You may download a copy for your own study. You may not re-upload it elsewhere, sell it,
          or publish it under your own name.
        </li>
        <li>
          Citing a resource in your own work is normal academic practice â€” follow your
          institution&apos;s rules for how a study resource should be attributed.
        </li>
        <li>
          If you believe something here infringes your rights or was shared without permission, the{" "}
          <Link href="/acceptable-use">academic integrity policy</Link> describes what happens next.
        </li>
      </ul>

      <h2 id="not-allowed">Not allowed here</h2>
      <p>
        The prohibited list is short and it lives in one place so it cannot drift: see{" "}
        <Link href="/acceptable-use">Academic integrity and acceptable use</Link> for what must not
        be uploaded, what the server refuses automatically, and what happens when something is
        reported.
      </p>

      <h2 id="availability">Availability and warranty</h2>
      <p>
        This is an independent academic project, provided <strong>as it is</strong>. There is no
        service-level agreement, no uptime commitment and no guarantee that a file will still be
        available next semester. The software is honest about failure â€” a page that cannot reach
        the database says so instead of pretending the library is empty â€” but it cannot promise to
        be reachable.
      </p>
      <ul>
        <li>
          Keep your own copy of anything you cannot afford to lose. The library is a convenience,
          not a backup.
        </li>
        <li>
          The service may change, be suspended, or be taken down â€” for example if a hosting grant
          ends. Where such a change would affect stored material, it is announced on this site.
        </li>
        <li>
          To the extent the law allows, no warranty is given and no liability is accepted for
          indirect or consequential loss arising from the use of this service.
        </li>
      </ul>

      <h2 id="ending">Ending access</h2>
      <ul>
        <li>
          You can stop using the service at any time and delete your own material from{" "}
          <Link href="/manage">My uploads</Link>.
        </li>
        <li>
          Access may be withdrawn if these terms are broken, and material may be removed if it is
          unlawful, infringing, or unsafe to keep. Where a removal affects you, the reason is given.
        </li>
        <li>
          Deleting a resource is final. There is no recovery, no recycle bin and no soft delete: the
          row and the bytes are removed together.
        </li>
      </ul>

      <h2 id="changes">Changes to these terms</h2>
      <p>
        The <strong>Last reviewed</strong> date at the top of this page is the day the text was last
        checked against the software, and it is bumped whenever the text changes. Because there is
        no mailing list, substantive changes are announced on this site rather than by email.
      </p>
      <p>
        Related documents: the <Link href="/privacy">privacy notice</Link> describes exactly which
        values are stored, and <Link href="/help">help and support</Link> explains the behaviour you
        will see day to day.
      </p>
    </PolicyShell>
  );
}
