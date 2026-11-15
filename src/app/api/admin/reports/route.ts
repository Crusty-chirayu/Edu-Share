import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { listReports } from "@/db/moderation";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.role !== "admin") {
      return jsonError(AppError.forbidden("Administrator privilege required"));
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const offset = (page - 1) * limit;

    const data = await withIdentity(session.profileId, (sql) =>
      listReports(sql, { status, category }, { limit, offset }),
    );

    return NextResponse.json({
      data: data.items,
      total: data.total,
      page,
      limit,
    });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
