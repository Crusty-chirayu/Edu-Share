"use client";

import Link from "next/link";
import { useEffect } from "react";
import { State } from "@/components/ui/state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client boundary failures in development
    if (process.env.NODE_ENV !== "production") {
      console.error("Root boundary caught an error:", error);
    }
  }, [error]);

  return (
    <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
      <State
        icon="alert"
        title="Something went wrong"
        tone="error"
        level={1}
        actions={
          <div
            className="actions-cluster"
            style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}
          >
            <button type="button" className="btn btn--primary" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="btn btn--secondary">
              Back to home
            </Link>
          </div>
        }
      >
        <p>
          An unexpected error occurred while loading this page. No personal details or stack traces
          are exposed.
        </p>
        {error.digest ? (
          <p
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem", opacity: 0.8 }}
          >
            Error reference: {error.digest}
          </p>
        ) : null}
      </State>
    </div>
  );
}
