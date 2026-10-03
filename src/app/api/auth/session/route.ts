import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * `GET /api/auth/session` — a lightweight, read-only view of the current session.
 *
 * Pages get their session data from Server Components; this endpoint exists for
 * client components that need to *retry* after a mutation (a save button deciding
 * whether to redirect to sign-in) without re-rendering the whole tree. It returns
 * only fields the client already legitimately knows.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({
    authenticated: true,
    displayName: session.displayName,
    role: session.role,
    mode: session.mode,
    isDevelopmentIdentity: session.isDevelopmentIdentity,
  });
}
