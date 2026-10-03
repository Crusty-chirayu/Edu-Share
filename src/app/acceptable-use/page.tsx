import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell, type PolicySection } from "@/components/policy-shell";
import { CREATOR, requirePolicy } from "@/lib/site";

export const metadata: Metadata = {
  title: "Academic integrity",
  description:
    "What belongs in the EDU-SHARE library, what must never be uploaded, what the server refuses automatically, and what happens when something is reported.",
};

const POLICY = requirePolicy("/acceptable-use");

const SECTIONS: readonly PolicySection[] = [
  { id: "principle", title: "The principle" },
  { id: "belongs", title: "What belongs here" },
  { id: "does-not-belong", title: "What must not be uploaded" },
  { id: "integrity", title: "Using the library without cheating" },
  { id: "enforced", title: "What the server refuses automatically" },
  { id: "reporting", title: "Reporting something" },
  { id: "outcomes", title: "What happens next" },
  { id: "accountability", title: "Who is accountable" },
];

const BELONGS = [
  {
    title: "Your own lecture notes",
    body: "Typed or handwritten notes you made yourself. They are the single most useful thing on a site like this, and you already own them.",
  },
  {
    title: "Your own summaries and revision sheets",
    body: "Condensed topic summaries, formula sheets, worked examples you wrote out, and annotated solution walkthroughs.",
  },
  {
    title: "Material you are free to distribute",
    body: "Handouts, slides and problem sheets your department publishes openly, or that its licence allows you to pass on.",
  },
  {
    title: "Past papers that have been released",
    body: "Papers your institution has formally released for revision, with any embargo period finished.",
  },
];

const PROHIBITED: readonly { title: string; body: string }[] = [
  {
    title: "Copyrighted textbooks, solution manuals or journal articles",
    body: "Scanning a chapter or sharing a PDF you bought is redistribution, and it is the most common reason material gets taken down.",
  },
  {
    title: "Assessment material that is not finished with",
    body: "Anything under embargo, anything still being sat, and anything a member of staff shared with one cohort in confidence.",
  },
  {
    title: "Another person's work, uploaded without consent",
    body: "A lab partner's report, a group project, or a friend's notes are theirs to publish, not yours.",
  },
  {
    title: "Completed coursework offered as something to submit",
    body: "A model answer for an assignment that is still being marked turns a study resource into a plagiarism service.",
  },
  {
    title: "Personal data about anyone else",
    body: "Names, student numbers, grades, medical notes, contact details or group photographs â€” including in a file name, a title or a description.",
  },
  {
    title: "Anything illegal, hateful, or designed to harm",
    body: "That includes malware: the server inspects the bytes of every upload and refuses files whose contents do not match their declared format.",
  },
  {
    title: "Impersonation",
    body: "Do not publish under a display name that pretends to be a member of staff or another student.",
  },
];

const INTEGRITY: readonly string[] = [
  "Reading someone else's notes, or a worked example, is normal study behaviour. It is what a library is for.",
  "Submitting that material as your own work is not. Whether your institution calls it plagiarism, collusion or contract cheating, those regulations apply to anything you download here.",
  "Attribute what you use. Every resource carries an author, a subject and a date on its page, so citing it takes ten seconds.",
  "You remain responsible for what you submit. This site cannot know what your assessment permits, and it does not try to guess.",
];

const ENFORCED: readonly { title: string; body: string }[] = [
  {
    title: "Size",
    body: "Files above 25 MB are refused outright, before anything is written.",
  },
  {
    title: "Format",
    body: "Only PDF, DOCX, PPTX, XLSX, PNG, JPG/JPEG, TXT, MD, CSV and ZIP are accepted. Anything else is refused by extension, and the message lists what is allowed.",
  },
  {
    title: "Content agreement",
    body: "The first bytes of the file are inspected. A document that claims to be a PDF but contains something else is refused, so a disguised executable cannot reach storage wearing a .pdf extension.",
  },
  {
    title: "Ownership",
    body: 'Editing or deleting a resource you do not own is refused by a database policy, not by the interface. Another member\'s edit page answers "not found" rather than "forbidden", so it cannot be used to discover what exists.',
  },
];

/**
 * `/acceptable-use`.
 *
 * This is the document that decides what the library is *for*, so it is written as
 * a list of decisions rather than as a list of adjectives. Where a rule can be
 * enforced by the software, it says so and names the check; where it can only be
 * enforced by people, it says that instead of implying an automated guarantee.
 */
export default function AcceptableUsePage() {
  return (
    <PolicyShell
      eyebrow="Policy"
      title={POLICY.title}
      summary={POLICY.summary}
      reviewed={POLICY.reviewed}
      sections={SECTIONS}
    >
      <h2 id="principle">The principle</h2>
      <p>
        Share what you made, or what you are allowed to pass on. Do not share what belongs to
        someone else, what someone trusted you with, or anything that would let a classmate claim
        work that is not theirs. Everything below is a consequence of that one sentence.
      </p>

      <h2 id="belongs">What belongs here</h2>
      <div className="grid-2">
        {BELONGS.map((item) => (
          <article className="feature" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <h2 id="does-not-belong">What must not be uploaded</h2>
      <ul>
        {PROHIBITED.map((item) => (
          <li key={item.title}>
            <strong>{item.title}.</strong> {item.body}
          </li>
        ))}
      </ul>

      <h2 id="integrity">Using the library without cheating</h2>
      <ul>
        {INTEGRITY.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2 id="enforced">What the server refuses automatically</h2>
      <p>
        Part of this policy is checked by the software rather than by a person. These rules are
        applied to every upload before anything is written to storage or to the database:
      </p>
      <ul>
        {ENFORCED.map((item) => (
          <li key={item.title}>
            <strong>{item.title}.</strong> {item.body}
          </li>
        ))}
      </ul>
      <p className="note">
        What the software cannot check: whether a PDF is a textbook you scanned, whether notes were
        uploaded with their author&apos;s agreement, or whether an assessment window has closed.
        Those are rules this page exists to state, and they are upheld by the people using the
        library rather than by code â€” which is exactly why reporting matters.
      </p>

      <h2 id="reporting">Reporting something</h2>
      <p>
        This build has no report button, and adding a control that did nothing would be worse than
        not having one. The route that works today is the source repository: open an issue naming
        the resource, its title and its author as shown on its page, and say what the problem is â€”
        your own work uploaded without consent, an embargoed paper, a scanned textbook, personal
        data, or something unsafe.
      </p>
      <p>
        If you are the author of material that has been uploaded without your permission, say so in
        the same place. The resource URL is enough to locate the exact row.
      </p>
      <p className="note">
        <a
          href="https://github.com/Crusty-chirayu/Edu-Share"
          rel="noreferrer noopener"
          target="_blank"
        >
          Open an issue on the source repository
        </a>{" "}
        â€” the link opens in a new tab.
      </p>

      <h2 id="outcomes">What happens next</h2>
      <ol>
        <li>
          <strong>The resource is removed.</strong> Deleting it removes the database row and the
          stored file together, so a takedown is complete rather than nominal.
        </li>
        <li>
          <strong>The reason is recorded and given to the uploader,</strong> because removing
          material without explanation teaches nobody anything.
        </li>
        <li>
          <strong>Repeat cases end access.</strong> The <Link href="/terms">terms of use</Link>{" "}
          describe withdrawal of access; a first honest mistake is treated as a mistake, and a
          pattern is not.
        </li>
        <li>
          <strong>Serious cases are escalated</strong> to the relevant institution, which is the
          body with the authority to act on a student misconduct matter â€” this site has no such
          authority.
        </li>
      </ol>

      <h2 id="accountability">Who is accountable</h2>
      <p>
        This is an independent project, not an institution: it has no moderation team, no legal
        department and no ability to adjudicate a plagiarism case. What it can do is remove
        material, record why, and state the rules in public. It is operated and maintained by{" "}
        <span className="credit__name">{CREATOR.name}</span>.
      </p>
      <p>
        The obligations on users are in the <Link href="/terms">terms of use</Link>; what is stored
        about you is in the <Link href="/privacy">privacy notice</Link>; and the day-to-day
        behaviour of the product is explained in <Link href="/help">help and support</Link>.
      </p>
    </PolicyShell>
  );
}
