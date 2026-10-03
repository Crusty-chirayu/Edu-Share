/**
 * Site-level constants: identity, creator attribution, and the content map.
 *
 * ## Why this is a module and not three copies of a string
 *
 * The footer, the about page and the policies all name the same person and the
 * same documents. Hard-coding those strings in each place is how a site ends up
 * with two different support addresses and a footer that links to a page you
 * renamed. Everything a reader can see about *who made this* and *where the
 * rules live* is declared once, here, and imported.
 *
 * ## What is deliberately absent
 *
 * No support email address and no analytics id. Neither exists in this
 * deployment, and inventing one would be a lie a reader could not check. Support
 * is routed to a page that explains the real channels (`/help`), and the only
 * external links are the creator's own profiles.
 */

export interface ExternalLink {
  readonly label: string;
  /** Absolute, `https:` and openable in a new tab. Asserted by `site.test.ts`. */
  readonly href: string;
}

export const SITE = {
  name: "EDU-SHARE",
  tagline: "Every subject. Every campus. The notes you actually need.",
  description:
    "A shared academic library: find coursework by institution and subject, save what you are revising, and publish your own notes with a visibility you choose.",
} as const;

/**
 * The creator. `role` is what he actually did on this project — designed the
 * interface and wrote the application — not a marketing title.
 */
export const CREATOR = {
  name: "Chirayu Babu Jaysawal",
  role: "Design and engineering",
  links: [
    { label: "GitHub", href: "https://github.com/Crusty-chirayu" },
    { label: "Portfolio", href: "https://portfolio-lac-kappa-49.vercel.app/" },
    { label: "Blog", href: "https://blog-me-mauve.vercel.app/" },
  ] as readonly ExternalLink[],
} as const;

export interface Policy {
  readonly href: string;
  readonly title: string;
  /** The one-sentence promise the page opens with. */
  readonly summary: string;
  /** ISO date of the last substantive edit, shown as a `Last reviewed` stamp. */
  readonly reviewed: string;
}

/**
 * The three policy documents, in the order they appear in the footer.
 * `reviewed` is a real date: the day the text was checked against the code, not
 * a decoration. Bump it whenever the text changes.
 */
export const POLICIES: readonly Policy[] = [
  {
    href: "/terms",
    title: "Terms of use",
    summary: "What you agree to when you upload, save or read something here.",
    reviewed: "2026-09-30",
  },
  {
    href: "/privacy",
    title: "Privacy notice",
    summary: "Exactly which values this deployment stores about you, and which it never sees.",
    reviewed: "2026-09-30",
  },
  {
    href: "/acceptable-use",
    title: "Academic integrity",
    summary: "What belongs in the library, what does not, and who is accountable for it.",
    reviewed: "2026-09-30",
  },
] as const;

/** Policy lookup by route, used by the footer and by the pages themselves. */
export function policyByHref(href: string): Policy | undefined {
  return POLICIES.find((policy) => policy.href === href);
}

/**
 * Policy lookup for the three page modules, which cannot render without their
 * own text.
 *
 * It throws rather than returning `undefined`, and it exists so those pages do not
 * need a non-null assertion — a policy page whose document is missing from
 * `POLICIES` is a wiring mistake, and a loud failure at render time is the only
 * version of that mistake anyone will notice.
 */
export function requirePolicy(href: string): Policy {
  const policy = policyByHref(href);
  if (!policy) {
    throw new Error(
      `No policy is registered for "${href}". Add it to POLICIES in src/lib/site.ts.`,
    );
  }
  return policy;
}
