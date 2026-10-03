"use client";

/**
 * The root error boundary.
 *
 * This is the one file in the App Router that is *supposed* to render its own
 * `<html>` and `<body>`: it replaces the root layout when the layout itself fails.
 * That is exactly the mistake `error.tsx` used to make, which is why the two are
 * documented the other way round from each other.
 *
 * Styles are inline here on purpose. If the failure is in the root layout, the
 * stylesheet it imports may not have been applied, so this page cannot depend on
 * the design tokens being available — it has to look deliberate with nothing but
 * defaults.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "48px 24px",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          lineHeight: 1.6,
          color: "#17181c",
          background: "#faf7f2",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#7c8492",
            }}
          >
            EDU-SHARE
          </p>
          <h1 style={{ fontSize: 32, margin: "8px 0 16px" }}>Something went wrong</h1>
          <p style={{ color: "#555c68" }}>
            The application could not start rendering. This is a fault on the server rather than
            something you did, and no detail about it is shown here on purpose.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13 }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              fontSize: 15,
              color: "#fbf9f5",
              background: "#1d3b5c",
              border: "1px solid #16304c",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
