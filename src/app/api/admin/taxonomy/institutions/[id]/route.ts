import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { updateInstitution } from "@/db/taxonomy";
import { parseOrThrow, institutionCreateSchema } from "@/lib/validation";
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
    const input = parseOrThrow(institutionCreateSchema, body);

    const institution = await withIdentity(session.profileId, (sql) =>
      updateInstitution(sql, id, input.name),
    );

    return NextResponse.json({ ok: true, data: institution });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
