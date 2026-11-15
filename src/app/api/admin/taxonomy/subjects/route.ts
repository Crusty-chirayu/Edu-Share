import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { createSubject } from "@/db/taxonomy";
import { parseOrThrow, subjectCreateSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.role !== "admin") {
      return jsonError(AppError.forbidden("Administrator privilege required"));
    }

    const body = await request.json().catch(() => ({}));
    const input = parseOrThrow(subjectCreateSchema, body);

    const subject = await withIdentity(session.profileId, (sql) => createSubject(sql, input));

    return NextResponse.json({ ok: true, data: subject }, { status: 201 });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
