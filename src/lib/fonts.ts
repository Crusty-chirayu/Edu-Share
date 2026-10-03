import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

/**
 * Typography.
 *
 * Three faces, all loaded through `next/font`, which downloads them at build
 * time and serves the `.woff2` from this origin: no request ever leaves the
 * reader's browser for a font, which is what the privacy notice promises and
 * what the previous stylesheet only pretended to do — it named three families
 * that no `@font-face` ever fetched, so the product silently rendered in the
 * system default.
 *
 *  - Display (Space Grotesk): the wordmark, headlines and figures. Geometric,
 *    slightly angular, and not a face any dashboard template ships with.
 *  - Body (IBM Plex Sans): a humanist face with an academic, institutional
 *    register. Chosen over the usual neutral grotesque on purpose.
 *  - Mono (IBM Plex Mono): formats, dates, sizes, identifiers and labels. It
 *    makes metadata read as a catalogue record rather than as decoration.
 *
 * `display: "swap"` keeps text visible while a face loads, and the `variable`
 * names are the ones `globals.css` reads.
 */

export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display-face",
  preload: true,
});

export const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body-face",
  preload: true,
});

export const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-face",
  preload: false,
});

export const fontClassNames = [displayFont.variable, bodyFont.variable, monoFont.variable].join(
  " ",
);
