import { NextResponse, type NextRequest } from "next/server";

/**
 * M3 middleware — authentication boundary placeholder + security headers.
 * No sessions exist yet (M5 builds them). This sets the header baseline now
 * so every route, including the health probe, carries it from day one.
 */
export function middleware(_request: NextRequest): NextResponse {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
