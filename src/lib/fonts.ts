import { Host_Grotesk, IBM_Plex_Mono } from "next/font/google";

/**
 * Typography.
 *
 * Loaded through `next/font`, which downloads at build time and serves `.woff2`
 * from this origin: no request leaves the reader's browser for an external CDN.
 *
 *  - Display & Body (Host Grotesk): Modern, geometric, accessible grotesque
 *    with strong typographic hierarchy across headings, UI controls, and prose.
 *    Weights used: 400, 500, 600, 700.
 *  - Mono (IBM Plex Mono): formats, dates, sizes, identifiers and labels. It
 *    makes metadata read as an authoritative catalogue record.
 *
 * `display: "swap"` keeps text visible while a face loads.
 */

export const displayFont = Host_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display-face",
  preload: true,
});

export const bodyFont = Host_Grotesk({
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
