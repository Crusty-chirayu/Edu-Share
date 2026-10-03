import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fontClassNames } from "@/lib/fonts";
import { SITE } from "@/lib/site";

/**
 * The document shell.
 *
 * Two details here are load-bearing:
 *
 *  1. **The theme script.** It runs before first paint, reads the stored
 *     preference (defaulting to the operating system) and writes `data-theme`
 *     on `<html>`. Without it, a dark-mode reader sees a white flash on every
 *     navigation — the most common theming bug there is, and the reason the
 *     attribute is set by markup rather than by a React effect.
 *  2. **`suppressHydrationWarning` on `<html>`.** The server cannot know the
 *     reader's theme, so that one attribute legitimately differs from the
 *     server-rendered markup. The suppression is scoped to that element;
 *     nothing else in this document is allowed to diverge.
 *
 * The single `main` landmark lives here, so no page and no error boundary
 * renders a second one.
 */

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Palette-matched chrome colours; SG-4 allows no token import here because
  // `viewport` is serialized metadata, so the two source values from
  // globals.css (--c-canvas light/dark) are repeated with an override note.
  themeColor: [
    // eslint-disable-next-line no-restricted-syntax -- see above.
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    // eslint-disable-next-line no-restricted-syntax -- see above.
    { media: "(prefers-color-scheme: dark)", color: "#0e1216" },
  ],
};

/** One synchronous read, before anything is painted. */
const THEME_SCRIPT = `(function(){try{var k="edu-share-theme";var p=window.localStorage.getItem(k);if(p!=="light"&&p!=="dark"){p="system";}var t=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-theme-pref",p);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="page">
          <SiteHeader />
          <main id="main" className="page__body">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
