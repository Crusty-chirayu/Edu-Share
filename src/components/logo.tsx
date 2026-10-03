import type { CSSProperties } from "react";

/**
 * The EDU-SHARE Brand Mark: "THE PASSED PAGE"
 *
 * Geometric symbol:
 * Two overlapping rounded document sheets, the rear sheet offset up-right,
 * drawn so that the negative space forms a clean, modern letter 'E'.
 * At the meeting junction, a warm amber node signifies knowledge handed from
 * one student to another.
 *
 * Uses `currentColor` for maximum theme adaptability, with a styled accent node.
 */

export type LogoSize = "sm" | "md" | "lg" | "xl";
export type LogoVariant = "mark" | "wordmark" | "full" | "mono";

const PX: Record<LogoSize, number> = { sm: 20, md: 24, lg: 32, xl: 40 };

/** The custom hyphen echoing the amber transfer node */
export function LinkHyphen({ size = 12 }: { size?: number | undefined }) {
  return (
    <svg
      className="brandmark__link"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="6" width="6.5" height="2" rx="0.5" fill="currentColor" />
      <circle cx="11" cy="7" r="1.75" fill="var(--c-accent, currentColor)" />
    </svg>
  );
}

/**
 * LogoMark: The standalone geometric symbol.
 */
export function LogoMark({
  size = "md",
  className,
  style,
  title,
}: {
  size?: LogoSize | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  title?: string | undefined;
}) {
  const px = PX[size];
  return (
    <svg
      className={className ? `brandmark__glyph ${className}` : "brandmark__glyph"}
      style={style}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {/* Rear sheet: offset up-right */}
      <path
        d="M10 4.5h7.5A1.5 1.5 0 0 1 19 6v9.5a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 15.5V6A1.5 1.5 0 0 1 10 4.5z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Front sheet: with geometric E negative space */}
      <path
        d="M5.5 7.5h8A1.5 1.5 0 0 1 15 9v1.2H9v1.6h4.5v1.4H9v1.6h6V19a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 19V9a1.5 1.5 0 0 1 1.5-1.5z"
        fill="currentColor"
      />
      {/* The Passed Page Amber Node */}
      <circle
        className="brandmark__node"
        cx="14.5"
        cy="12.5"
        r="1.6"
        fill="var(--c-accent, currentColor)"
      />
    </svg>
  );
}

/**
 * LogoLoader: The amber node travels smoothly between the sheets.
 * Frozen at rest under `prefers-reduced-motion`.
 */
export function LogoLoader({
  size = "lg",
  label = "Loading",
}: {
  size?: LogoSize | undefined;
  label?: string | undefined;
}) {
  const px = PX[size];
  return (
    <span className="logo-loader" role="status">
      <span className="vh">{label}</span>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M10 4.5h7.5A1.5 1.5 0 0 1 19 6v9.5a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 15.5V6A1.5 1.5 0 0 1 10 4.5z"
          fill="currentColor"
          opacity="0.3"
        />
        <path
          d="M5.5 7.5h8A1.5 1.5 0 0 1 15 9v1.2H9v1.6h4.5v1.4H9v1.6h6V19a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 19V9a1.5 1.5 0 0 1 1.5-1.5z"
          fill="currentColor"
          opacity="0.8"
        />
        <circle
          className="logo-loader__node"
          cx="14.5"
          cy="12.5"
          r="1.8"
          fill="var(--c-accent, currentColor)"
        />
      </svg>
    </span>
  );
}

/**
 * Full Brand Lockup: Symbol + Display Wordmark.
 */
export function Logo({
  variant = "full",
  size = "md",
  className,
}: {
  variant?: LogoVariant | undefined;
  size?: LogoSize | undefined;
  className?: string | undefined;
}) {
  const glyph = <LogoMark size={size} className="brandmark__glyph" />;
  const word = (
    <>
      <span className="brandmark__word" aria-hidden="true">
        EDU
        <LinkHyphen size={size === "sm" ? 10 : size === "lg" ? 14 : size === "xl" ? 16 : 12} />
        SHARE
      </span>
      <span className="vh">EDU-SHARE</span>
    </>
  );

  const wrapperClass = className ? `brandmark ${className}` : "brandmark";

  if (variant === "mark" || variant === "mono") {
    return <LogoMark size={size} className={className} title="EDU-SHARE" />;
  }
  if (variant === "wordmark") {
    return <span className={wrapperClass}>{word}</span>;
  }
  return (
    <span className={wrapperClass}>
      {glyph}
      {word}
    </span>
  );
}
