"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main role="alert">
          <h1>Something went wrong</h1>
          <p>EDU-SHARE hit an unexpected error. No details are shown here by design.</p>
          {process.env["NODE_ENV"] !== "production" && <pre>{error.message}</pre>}
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
