import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { listModerationActions } from "@/db/moderation";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.role !== "admin") {
      return jsonError(AppError.forbidden("Administrator privilege required"));
    }

    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resourceId") || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);

    const logs = await withIdentity(session.profileId, (sql) =>
      listModerationActions(sql, resourceId, limit),
    );

    return NextResponse.json({ data: logs });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
