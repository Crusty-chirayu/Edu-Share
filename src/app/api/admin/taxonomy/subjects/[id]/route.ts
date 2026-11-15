import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { deleteSubject, updateSubject } from "@/db/taxonomy";
import { parseOrThrow, subjectUpdateSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.role !== "admin") {
      return jsonError(AppError.forbidden("Administrator privilege required"));
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = parseOrThrow(subjectUpdateSchema, body);

    const subject = await withIdentity(session.profileId, (sql) => updateSubject(sql, id, input));

    return NextResponse.json({ ok: true, data: subject });
  } catch (error: unknown) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.role !== "admin") {
      return jsonError(AppError.forbidden("Administrator privilege required"));
    }

    const { id } = await params;
    await withIdentity(session.profileId, (sql) => deleteSubject(sql, id));

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
