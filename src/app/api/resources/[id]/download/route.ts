import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, jsonMessageError } from "@/lib/api";
import { BufferedCookieStore } from "@/lib/auth/cookies";
import { getSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { getResourceFile } from "@/db/resources";
import { AppError } from "@/lib/errors";
import { getStorage, storageUnavailableReason } from "@/lib/storage";
import { parseOrThrow, resourceIdSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * `GET /api/resources/:id/download` — the single delivery path for file bytes.
 *
 * ## Authorisation
 *
 * The decision is made **before** any credential is issued:
 *
 *  1. the caller's profile id is derived from the session (or is `null` for an
 *     anonymous visitor) — never from the request;
 *  2. `getResourceFile` runs inside `withIdentity` and carries the same
 *     `RESOURCE_VISIBILITY_PREDICATE` as the listing, so a private resource that is
 *     not the caller's resolves to `null`;
 *  3. only then does the provider mint a signed URL or read the bytes.
 *
 * A missing row and a forbidden row are both `not_found`. Telling them apart would
 * turn the endpoint into an existence oracle for private resources.
 *
 * ## Delivery
 *
 * Supabase Storage answers with a short-lived signed URL (302). The local provider
 * streams the bytes directly. In both cases the response is `no-store` in the sense
 * that it carries `Cache-Control: private`, so a shared cache never retains a
 * credential or another user's file.
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const store = new BufferedCookieStore(request.cookies.getAll());
  try {
    const { id } = await context.params;
    const resourceId = parseOrThrow(resourceIdSchema, id);

    const session = await getSession();
    const viewerId = session?.profileId ?? null;

    const file = await withIdentity(viewerId, (tx) => getResourceFile(tx, resourceId));
    if (!file || !file.fileKey) throw AppError.notFound();

    // Increment download count non-blockingly (M0006)
    void withIdentity(viewerId, async (tx) => {
      await tx.unsafe("SELECT public.increment_resource_download($1::uuid)", [resourceId]);
    }).catch(() => {});

    const storage = getStorage(store);
    if (!storage) {
      return jsonMessageError(
        503,
        "unavailable",
        storageUnavailableReason() ?? "Storage is not configured.",
      );
    }

    const fileName = file.fileName ?? "download";
    const contentType = file.fileMimeType ?? "application/octet-stream";
    const target = await storage.download(file.fileKey, fileName, contentType);
    if (!target) throw AppError.notFound();

    if (target.kind === "redirect") {
      return NextResponse.redirect(target.url, {
        status: 302,
        headers: {
          // A signed URL is a credential: it must not be cached by a shared cache,
          // and must not leak via a Referer header on the destination.
          "Cache-Control": "private, max-age=30",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    return new NextResponse(target.bytes, {
      status: 200,
      headers: {
        "Content-Type": target.contentType,
        "Content-Length": String(target.bytes.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(target.fileName)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
        // Never let a browser sniff a text/plain response into script.
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
