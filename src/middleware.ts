import { NextResponse, type NextRequest } from "next/server";

/**
 * Baseline security headers.
 *
 * Authentication is **not** enforced here, and deliberately so: middleware runs on
 * the edge runtime and cannot reach the database or the session store, so a check
 * placed here would be a check that can be bypassed by any request that does not
 * match the matcher. Every protected page and every mutating route handler calls
 * `requireSession()` (or `getSession()`) server-side instead — see
 * `src/lib/auth/session.ts`.
 *
 * This file's job is the header baseline, applied to every response including the
 * health probe. `X-Frame-Options: DENY` rather than a CSP `frame-ancestors`, so
 * the protection does not depend on a CSP that is not set yet.
 */
export function middleware(_request: NextRequest): NextResponse {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  // No feature on this site needs these, and denying them by default keeps a
  // future dependency from silently asking for a camera or a location.
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  // HSTS is only meaningful over TLS, and setting it on a plain-HTTP local dev
  // server would poison the browser's cache for that host. Sent in production only.
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
