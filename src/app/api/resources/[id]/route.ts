import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  assertBodyWithinLimit,
  assertSameOrigin,
  jsonError,
  jsonMessageError,
  MAX_MULTIPART_BYTES,
  readJsonBody,
} from "@/lib/api";
import { BufferedCookieStore } from "@/lib/auth/cookies";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { deleteResource, updateResource } from "@/db/resources";
import { getStorage, storageUnavailableReason, type StorageProvider } from "@/lib/storage";
import { acceptUpload, readUploadedFile } from "@/lib/uploads";
import {
  parseOrThrow,
  resourceIdSchema,
  resourceUpdateSchema,
  type FileMetadata,
  type ResourceUpdateInput,
} from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/** `null`/absent means "do not touch this field"; `""` means "clear it". */
function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * `PATCH /api/resources/:id` — metadata edit, and optionally a replacement file.
 *
 * Accepts either JSON (metadata only) or multipart (metadata plus a new file), which
 * lets one form submit both without inventing a second endpoint. The id is parsed as
 * a UUID before it reaches a builder, and ownership is decided by RLS inside
 * `withIdentity` — not by anything in this file. A non-owner updates zero rows and
 * receives the same 404 a missing id does, so the endpoint cannot be used to probe
 * for the existence of someone else's resource.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const store = new BufferedCookieStore(request.cookies.getAll());
  let pendingKey: string | null = null;
  let storage: StorageProvider | null = null;
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const resourceId = parseOrThrow(resourceIdSchema, id);
    const session = await requireSession();

    const contentType = request.headers.get("content-type") ?? "";
    let input: ResourceUpdateInput;
    let uploadedBytes: Uint8Array | null = null;
    let file: FileMetadata | undefined;

    if (contentType.includes("multipart/form-data")) {
      assertBodyWithinLimit(request, MAX_MULTIPART_BYTES);
      const form = await request.formData();
      const entry = form.get("file");
      if (entry instanceof File && entry.size > 0) {
        const bytes = await readUploadedFile(entry);
        if (bytes) {
          uploadedBytes = bytes;
          file = acceptUpload(
            { fileName: entry.name, declaredType: entry.type, bytes },
            session.profileId,
          );
        }
      }
      input = parseOrThrow(resourceUpdateSchema, {
        title: asString(form.get("title")),
        description: asString(form.get("description")),
        subjectId: asString(form.get("subjectId")),
        visibility: asString(form.get("visibility")),
        file,
      });
    } else {
      input = parseOrThrow(resourceUpdateSchema, await readJsonBody(request));
    }

    // The object is written before the row is updated: if the update then fails, the
    // freshly written object is removed again and no row ever referenced it. The
    // reverse order would leave a row pointing at bytes that were never stored.
    if (file && uploadedBytes) {
      storage = getStorage(store);
      if (!storage) {
        return jsonMessageError(
          503,
          "unavailable",
          storageUnavailableReason() ?? "Storage is not configured.",
        );
      }
      await storage.put(file.key, uploadedBytes, file.mimeType);
      pendingKey = file.key;
    }

    const { item, replacedFileKey } = await withIdentity(session.profileId, (tx) =>
      updateResource(tx, resourceId, session.profileId, input),
    );

    pendingKey = null;
    if (replacedFileKey && storage) await storage.remove(replacedFileKey);

    return NextResponse.json({ resource: item });
  } catch (error) {
    if (pendingKey && storage) await storage.remove(pendingKey);
    return jsonError(error);
  }
}

/**
 * `DELETE /api/resources/:id` — owner-only, storage cleanup afterwards.
 *
 * The row goes first. If the object delete then fails, the row is already gone, so
 * the failure mode is an unreachable object (wasted space) rather than a reachable
 * resource whose owner believes it is deleted. That is the safer direction.
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const store = new BufferedCookieStore(request.cookies.getAll());
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const resourceId = parseOrThrow(resourceIdSchema, id);
    const session = await requireSession();

    const { fileKey } = await withIdentity(session.profileId, (tx) =>
      deleteResource(tx, resourceId, session.profileId),
    );

    if (fileKey) {
      const storage = getStorage(store);
      if (storage) await storage.remove(fileKey);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
