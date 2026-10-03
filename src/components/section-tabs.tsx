import Link from "next/link";

/**
 * The three views of the library listing, as index tabs.
 *
 * Links rather than buttons: each view is a URL that can be shared, bookmarked
 * and opened in a new tab, and the active one is marked with `aria-current`
 * rather than only with colour.
 */

export type SectionKey = "library" | "mine" | "saved" | "home";

const SECTIONS: readonly { key: SectionKey; href: string; label: string }[] = [
  { key: "library", href: "/browse", label: "Library" },
  { key: "mine", href: "/manage", label: "My uploads" },
  { key: "saved", href: "/saved", label: "Saved" },
];

export function SectionTabs({ active }: { active: SectionKey }) {
  return (
    <nav className="tabs" aria-label="Resource views">
      {SECTIONS.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          className="tab"
          aria-current={section.key === active ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
