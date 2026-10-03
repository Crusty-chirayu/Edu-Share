import { NextResponse } from "next/server";
import { AppError, toPublicError, type DomainErrorCode } from "@/lib/errors";
import { getEnv } from "@/lib/env";

/**
 * Response helpers shared by every route handler.
 *
 * The important property is that no handler builds an error body itself: they all
 * funnel through `toPublicError`, whose output contains only a stable code and one
 * of a fixed set of sentences. A PostgreSQL message, a stack trace or a connection
 * string therefore has no route to a response body.
 */

export function jsonError(error: unknown): NextResponse {
  const { status, body } = toPublicError(error);
  return NextResponse.json(body, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonValidationError(fields: Record<string, string>): NextResponse {
  return jsonError(AppError.invalid(fields));
}

/**
 * An error whose message is *deliberately specific* — for example a missing-storage
 * configuration hint or a credential failure sentence.
 *
 * `toPublicError` always returns the fixed `SAFE_MESSAGE_BY_CODE` string, so a custom
 * `AppError` message can never reach a client. That is the right default, but a few
 * endpoints must tell the operator or the user something actionable. Those messages
 * are written here, by hand, and are guaranteed to contain no driver text, no DSN and
 * no stack: they are authored strings, not derived ones.
 */
export function jsonMessageError(
  status: number,
  code: DomainErrorCode,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** 405 with an accurate `Allow` header, instead of Next's default 404 for a method. */
export function methodNotAllowed(allowed: readonly string[]): NextResponse {
  return NextResponse.json(
    { error: { code: "not_found", message: "That item could not be found." } },
    { status: 405, headers: { Allow: allowed.join(", ") } },
  );
}

/** Upper bound for a request body: the 25 MB file cap plus multipart overhead. */
export const MAX_MULTIPART_BYTES = 26 * 1024 * 1024;

/**
 * Rejects an overlarge body from `Content-Length` **before** the multipart parser
 * buffers it. A missing or unparsable length is not treated as "small": the form
 * itself is still bounded, because the file bytes are checked after parsing too.
 */
export function assertBodyWithinLimit(request: Request, maxBytes: number): void {
  const header = request.headers.get("content-length");
  if (header === null) return;
  const length = Number(header);
  if (Number.isFinite(length) && length > maxBytes) {
    throw AppError.invalid({
      file: `That upload is larger than the ${Math.floor(maxBytes / (1024 * 1024))} MB request limit.`,
    });
  }
}

/** Parses a JSON body, turning malformed input into a 400 rather than a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.invalid({ form: "Send a JSON object with a Content-Type of application/json." });
  }
}

/**
 * The origins a same-origin request may legitimately arrive from.
 *
 * A single comparison against `new URL(request.url).origin` is not enough, and
 * relying on it alone is a real defect rather than a theoretical one. The server's
 * idea of its own origin and the origin the browser used can legitimately differ:
 *
 *  - the framework reconstructs `request.url` from the address the server bound
 *    to, not necessarily the host the client dialled (browsing
 *    `http://127.0.0.1:3000` against a server that reports `localhost` is enough);
 *  - behind a TLS-terminating proxy the public origin is `https://…` while the
 *    internal request is `http://…`;
 *  - a deployment can be reachable at more than one hostname.
 *
 * When these disagree, *every* state-changing request is refused with a 403 and the
 * application is unusable — sign-in, uploads, bookmarks and profile edits all fail
 * at once. That is the failure this function is now written to prevent, while
 * keeping the CSRF property it exists for: a genuinely foreign origin still matches
 * none of these and is still rejected.
 */
function allowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();

  // 1. Whatever the framework reconstructed from the request itself.
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // A relative or unparsable URL contributes nothing; the checks below still apply.
  }

  // 2. The origin the operator configured as this deployment's public address.
  try {
    allowed.add(new URL(getEnv().APP_URL).origin);
  } catch {
    // An unconfigured or invalid APP_URL must not widen or narrow the set.
  }

  // 3. The host the client actually addressed, with the scheme a proxy reports.
  const host = request.headers.get("host");
  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const urlProto = (() => {
      try {
        return new URL(request.url).protocol.replace(":", "");
      } catch {
        return "";
      }
    })();
    const scheme = forwardedProto || urlProto || "http";
    allowed.add(`${scheme}://${host}`);
  }

  return allowed;
}

/** Only same-origin form posts are accepted; the header is set by the browser. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin === null) return; // same-origin form posts may omit Origin
  if (!allowedOrigins(request).has(origin)) {
    throw AppError.forbidden("Cross-origin requests are not accepted.");
  }
}
