import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  assertBodyWithinLimit,
  assertSameOrigin,
  jsonError,
  jsonMessageError,
  jsonValidationError,
  MAX_MULTIPART_BYTES,
} from "@/lib/api";
import { BufferedCookieStore } from "@/lib/auth/cookies";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { createResource } from "@/db/resources";
import { getStorage, storageUnavailableReason } from "@/lib/storage";
import { acceptUpload, readUploadedFile } from "@/lib/uploads";
import { parseOrThrow, resourceCreateSchema, type FileMetadata } from "@/lib/validation";

/**
 * `POST /api/resources` — create a resource, storing its file first.
 *
 * Order of operations is deliberate:
 *
 *  1. origin check, then `Content-Length` bound, then **session** — an anonymous
 *     caller is rejected before a single byte of the upload is buffered;
 *  2. the file is validated (size, declared type, sniffed content) and a
 *     server-generated storage key is minted;
 *  3. the object is written to storage;
 *  4. the row is inserted inside `withIdentity`, so RLS sees the caller as owner.
 *
 * If step 4 fails, the object written in step 3 is deleted again. A compensating
 * delete of an *uncommitted* row is cheap; a permanently orphaned object is not
 * discoverable, which is exactly why it must be cleaned up here rather than left
 * for a sweeper that does not exist.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const store = new BufferedCookieStore(request.cookies.getAll());
  try {
    assertSameOrigin(request);
    assertBodyWithinLimit(request, MAX_MULTIPART_BYTES);
    const session = await requireSession();

    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) {
      return jsonValidationError({ file: "Choose a file to upload." });
    }
    const bytes = await readUploadedFile(entry);
    if (!bytes) {
      return jsonValidationError({ file: "Choose a file to upload." });
    }

    const file: FileMetadata = acceptUpload(
      { fileName: entry.name, declaredType: entry.type, bytes },
      session.profileId,
    );

    const input = parseOrThrow(resourceCreateSchema, {
      title: form.get("title"),
      description: form.get("description") || null,
      subjectId: form.get("subjectId") || null,
      visibility: form.get("visibility") || "public",
      file,
    });

    const storage = getStorage(store);
    if (!storage) {
      return jsonMessageError(
        503,
        "unavailable",
        storageUnavailableReason() ?? "Storage is not configured.",
      );
    }

    await storage.put(file.key, bytes, file.mimeType);
    try {
      const item = await withIdentity(session.profileId, (tx) =>
        createResource(tx, session.profileId, input),
      );
      return NextResponse.json({ resource: item }, { status: 201 });
    } catch (error) {
      await storage.remove(file.key);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
