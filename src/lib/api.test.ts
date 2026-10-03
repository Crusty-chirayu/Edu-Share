import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertBodyWithinLimit,
  assertSameOrigin,
  jsonError,
  jsonValidationError,
  methodNotAllowed,
  MAX_MULTIPART_BYTES,
  readJsonBody,
} from "@/lib/api";
import { __setTestEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

/**
 * `assertSameOrigin` is the CSRF boundary for every state-changing endpoint, and
 * it had no unit test at all before the defect this file now pins.
 *
 * The defect: it compared the browser's `Origin` against
 * `new URL(request.url).origin` only. On this machine that made a completely
 * legitimate sign-in fail with 403, because the server reported `localhost` while
 * the browser had dialled `127.0.0.1`. The same mismatch occurs behind any
 * TLS-terminating proxy. The fix accepts a small, explicit set of legitimate
 * origins — and these tests exist to prove that set stays small.
 */

const BASE_ENV = {
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/edushare",
  APP_URL: "http://127.0.0.1:3000",
  NODE_ENV: "test",
  LOG_LEVEL: "error",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  EDU_SHARE_DEV_AUTH: "0",
  EDU_SHARE_LOCAL_STORAGE: "0",
} as const;

let restore: (() => void) | null = null;

beforeEach(() => {
  restore = __setTestEnv({ ...BASE_ENV });
});

afterEach(() => {
  restore?.();
  restore = null;
});

/** Builds a minimal request with the given URL, Origin and Host. */
function requestWith(options: {
  url: string;
  origin?: string;
  host?: string;
  forwardedProto?: string;
}): Request {
  const headers = new Headers();
  if (options.origin !== undefined) headers.set("origin", options.origin);
  if (options.host !== undefined) headers.set("host", options.host);
  if (options.forwardedProto !== undefined) {
    headers.set("x-forwarded-proto", options.forwardedProto);
  }
  return new Request(options.url, { method: "POST", headers });
}

describe("assertSameOrigin", () => {
  it("accepts a request with no Origin header (same-origin form posts)", () => {
    expect(() =>
      assertSameOrigin(requestWith({ url: "http://127.0.0.1:3000/api/bookmarks" })),
    ).not.toThrow();
  });

  it("accepts the exact origin the server reconstructed", () => {
    expect(() =>
      assertSameOrigin(
        requestWith({
          url: "http://localhost:3000/api/bookmarks",
          origin: "http://localhost:3000",
        }),
      ),
    ).not.toThrow();
  });

  it("REGRESSION: accepts a browser origin that differs from the reconstructed url", () => {
    // The failure that made the whole application unusable locally: the browser
    // used 127.0.0.1 while the server reported localhost.
    expect(() =>
      assertSameOrigin(
        requestWith({
          url: "http://localhost:3000/api/auth/sign-in",
          origin: "http://127.0.0.1:3000",
          host: "127.0.0.1:3000",
        }),
      ),
    ).not.toThrow();
  });

  it("REGRESSION: accepts the public origin behind a TLS-terminating proxy", () => {
    // The internal request is http, the browser saw https, and the proxy said so.
    expect(() =>
      assertSameOrigin(
        requestWith({
          url: "http://internal.local/api/bookmarks",
          origin: "https://edu-share.example",
          host: "edu-share.example",
          forwardedProto: "https",
        }),
      ),
    ).not.toThrow();
  });

  it("REGRESSION: accepts the configured APP_URL origin", () => {
    // A deployment whose public origin differs from the host the process binds
    // to: only APP_URL says which origin is really legitimate.
    restore?.();
    restore = __setTestEnv({ ...BASE_ENV, APP_URL: "https://configured.example" });

    expect(() =>
      assertSameOrigin(
        requestWith({
          url: "http://internal.local/api/profile",
          origin: "https://configured.example",
          host: "internal.local",
        }),
      ),
    ).not.toThrow();
  });

  it("still rejects a genuinely foreign origin", () => {
    expect(() =>
      assertSameOrigin(
        requestWith({
          url: "http://127.0.0.1:3000/api/bookmarks",
          origin: "https://evil.example",
          host: "127.0.0.1:3000",
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects an attacker who spoofs only the scheme", () => {
    // `https://127.0.0.1:3000` is not a listed origin, even though the host is.
    expect(() =>
      assertSameOrigin(
        requestWith({
          url: "http://127.0.0.1:3000/api/bookmarks",
          origin: "https://127.0.0.1:3000",
          host: "127.0.0.1:3000",
        }),
      ),
    ).toThrow(AppError);
  });

  it("rejects foreign origins that merely look similar", () => {
    for (const origin of [
      "http://127.0.0.1:3001", // different port
      "http://127.0.0.1.evil.example", // suffix trick
      "http://evil.example",
    ]) {
      expect(() =>
        assertSameOrigin(
          requestWith({
            url: "http://127.0.0.1:3000/api/bookmarks",
            origin,
            host: "127.0.0.1:3000",
          }),
        ),
      ).toThrow(AppError);
    }
  });
});

describe("assertBodyWithinLimit", () => {
  it("rejects a body larger than the cap before it is buffered", () => {
    const request = new Request("http://127.0.0.1:3000/api/resources", {
      method: "POST",
      headers: { "content-length": String(MAX_MULTIPART_BYTES + 1) },
    });
    expect(() => assertBodyWithinLimit(request, MAX_MULTIPART_BYTES)).toThrow(AppError);
  });

  it("accepts a body within the cap", () => {
    const request = new Request("http://127.0.0.1:3000/api/resources", {
      method: "POST",
      headers: { "content-length": "1024" },
    });
    expect(() => assertBodyWithinLimit(request, MAX_MULTIPART_BYTES)).not.toThrow();
  });

  it("treats a missing Content-Length as not-yet-known, not as small", () => {
    // The multipart parser is still bounded afterwards, so this is safe.
    const request = new Request("http://127.0.0.1:3000/api/resources", { method: "POST" });
    expect(() => assertBodyWithinLimit(request, MAX_MULTIPART_BYTES)).not.toThrow();
  });
});

describe("readJsonBody", () => {
  it("turns a malformed body into a validation error, not a 500", async () => {
    const request = new Request("http://127.0.0.1:3000/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    await expect(readJsonBody(request)).rejects.toThrow(AppError);
  });
});

describe("error responses", () => {
  it("never leak internals from an unknown error", async () => {
    const response = jsonError(new Error("connection to postgres://user:pw@host/db failed"));
    const text = JSON.stringify(await response.json()).toLowerCase();

    expect(text).not.toContain("postgres://");
    expect(text).not.toContain("pw@");
  });

  it("carry field errors for forms to render inline", async () => {
    const response = jsonValidationError({ title: "Title is required." });
    const body = (await response.json()) as {
      error: { code: string; fields: Record<string, string> };
    };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("invalid_input");
    expect(body.error.fields["title"]).toBe("Title is required.");
  });

  it("return 405 with an accurate Allow header for a wrong method", () => {
    const response = methodNotAllowed(["GET", "DELETE"]);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, DELETE");
  });
});
