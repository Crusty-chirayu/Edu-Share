import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { executeModerationDecision } from "@/db/moderation";
import { parseOrThrow, moderationDecisionSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.role !== "admin") {
      return jsonError(AppError.forbidden("Administrator privilege required"));
    }

    const { id: reportId } = await params;
    const body = await request.json().catch(() => ({}));
    const input = parseOrThrow(moderationDecisionSchema, body);
    const resourceId = typeof body.resourceId === "string" ? body.resourceId : null;

    if (!resourceId) {
      return jsonError(
        AppError.invalid({ resourceId: "resourceId is required to execute moderation action" }),
      );
    }

    await withIdentity(session.profileId, (sql) =>
      executeModerationDecision(sql, {
        moderatorId: session.profileId,
        resourceId,
        reportId,
        action: input.action,
        reason: input.reason,
      }),
    );

    return NextResponse.json({ ok: true, action: input.action });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
