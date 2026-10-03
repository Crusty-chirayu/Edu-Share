import type { SVGProps } from "react";

/**
 * The icon set.
 *
 * One 24×24 grid, one stroke weight (1.75), round caps and joins, no fills
 * except where a state is genuinely binary (a filled bookmark means saved).
 * Every glyph is drawn from the same few primitives, which is what stops an
 * interface looking like it was assembled from three different icon packs.
 *
 * Icons are decorative by default: they are `aria-hidden` and the control that
 * contains them supplies the accessible name. Pass `title` only when the icon
 * is the entire message — a status dot, for instance.
 */

export type IconName =
  | "home"
  | "grid"
  | "bookmark"
  | "bookmarkOn"
  | "upload"
  | "user"
  | "search"
  | "filter"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "close"
  | "check"
  | "alert"
  | "info"
  | "file"
  | "download"
  | "pencil"
  | "trash"
  | "sun"
  | "moon"
  | "monitor"
  | "external"
  | "shield"
  | "building"
  | "book"
  | "link"
  | "plus"
  | "arrowRight"
  | "lock"
  | "layers";

const GLYPHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
    </>
  ),
  grid: (
    <>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </>
  ),
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  bookmarkOn: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" fill="currentColor" />,
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  ),
  chevronDown: <path d="M6.5 9.5 12 15l5.5-5.5" />,
  chevronLeft: <path d="M14.5 6.5 9 12l5.5 5.5" />,
  chevronRight: <path d="M9.5 6.5 15 12l-5.5 5.5" />,
  close: (
    <>
      <path d="M6.5 6.5l11 11" />
      <path d="M17.5 6.5l-11 11" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6v.01" />
    </>
  ),
  file: (
    <>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3.5V8h4.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 18.5h14" />
    </>
  ),
  pencil: (
    <>
      <path d="M5 19h3.5L19.5 8 16 4.5 5 15.5z" />
      <path d="M15 5.5 18.5 9" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9.5 7V5h5v2" />
      <path d="M6.5 7l1 12.5h9L17.5 7" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" />
      <path d="M5.4 5.4 7.1 7.1M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7" />
    </>
  ),
  moon: <path d="M20 14.6A8.6 8.6 0 0 1 9.4 4 8.6 8.6 0 1 0 20 14.6z" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M9 20h6" />
      <path d="M12 16.5V20" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 12 12" />
      <path d="M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 6 7.5h4.5" />
    </>
  ),
  shield: <path d="M12 3.5 19.5 6v6c0 4.2-3 7.1-7.5 8.5C7.5 19.1 4.5 16.2 4.5 12V6z" />,
  building: (
    <>
      <path d="M4.5 20.5V6.5l7-3v17" />
      <path d="M11.5 10.5h8v10" />
      <path d="M3 20.5h18" />
      <path d="M7.5 9v.01M7.5 13v.01M14.5 14h2M14.5 17.5h2" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5.5a2 2 0 0 1 2-2h13v14h-13a2 2 0 0 0-2 2z" />
      <path d="M19.5 17.5v3h-13" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 1 0-5.7l2-2a4 4 0 0 1 5.7 5.7l-1 1" />
      <path d="M14 10a4 4 0 0 1 0 5.7l-2 2A4 4 0 0 1 6.3 12l1-1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h13" />
      <path d="M13 6.5 18.5 12 13 17.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8z" />
      <path d="M3.5 12.5 12 17l8.5-4.5" />
      <path d="M3.5 16.5 12 21l8.5-4.5" />
    </>
  ),
};

const FILLED: ReadonlySet<IconName> = new Set<IconName>(["bookmarkOn"]);

export function Icon({
  name,
  size = 18,
  className,
  title,
  ...rest
}: { name: IconName; size?: number; title?: string } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const filled = FILLED.has(name);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {GLYPHS[name]}
    </svg>
  );
}
