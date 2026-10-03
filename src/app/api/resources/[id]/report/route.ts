import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError, readJsonBody } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { reportResource } from "@/db/resources";
import { parseOrThrow, reportCreateSchema, resourceIdSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * `POST /api/resources/:id/report` (M0007)
 *
 * Records an academic integrity or copyright report against a visible resource.
 *
 * Security:
 *  - `assertSameOrigin` CSRF protection
 *  - Authenticated sessions only (`requireSession`)
 *  - Bounded input fields (`reportCreateSchema`)
 *  - Unique (reporter_id, resource_id) to prevent duplicate spam
 *  - Runs inside `withIdentity` enforcing RLS policies
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await context.params;
    const resourceId = parseOrThrow(resourceIdSchema, id);
    const body = parseOrThrow(reportCreateSchema, await readJsonBody(request));

    const result = await withIdentity(session.profileId, (tx) =>
      reportResource(tx, {
        resourceId,
        reporterId: session.profileId,
        category: body.category,
        details: body.details,
      }),
    );

    return NextResponse.json({ ok: true, id: result.id, status: result.status }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
