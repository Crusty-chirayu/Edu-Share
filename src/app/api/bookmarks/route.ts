import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError, readJsonBody } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { toggleBookmark } from "@/db/resources";
import { bookmarkRequestSchema, parseOrThrow } from "@/lib/validation";

/**
 * `POST /api/bookmarks` — save if absent, remove if present.
 *
 * The toggle runs inside `withIdentity`, and `toggleBookmark` checks *visibility*
 * before it writes anything, so a caller cannot bookmark a resource they cannot
 * read. `POST` rather than `PUT` because the operation is a toggle: the request
 * carries no target state, and a retry after a dropped response converges instead of
 * flipping twice.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { resourceId } = parseOrThrow(bookmarkRequestSchema, await readJsonBody(request));
    const result = await withIdentity(session.profileId, (tx) =>
      toggleBookmark(tx, session.profileId, resourceId),
    );
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
