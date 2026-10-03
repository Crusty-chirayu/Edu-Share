/**
 * Provider precedence at the authentication endpoints.
 *
 * ## The defect this file exists for
 *
 * `getSession()` resolves identity in a documented order: **Supabase first**, falling
 * back to the development adapter only when Supabase is not configured. The auth
 * endpoints used to check the development adapter *first*. In a deployment with both
 * configured â€” a `.env` holding Supabase credentials plus `EDU_SHARE_DEV_AUTH=1`, which
 * is the normal shape of a local machine â€” that disagreement produced:
 *
 *   1. `POST /api/auth/sign-in` returned **200** and set a valid session cookie,
 *   2. every later request took the Supabase path, found no Supabase token, and
 *      answered **401**,
 *   3. no profile row was ever created.
 *
 * The user was told they were signed in and was not, with nothing to explain it.
 *
 * These tests pin the endpoints to the same order the session uses, and make **no
 * network call**: a Supabase-configured case is detected by which schema validates the
 * body, which fails locally before any provider is contacted.
 */
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { handleAuthPost, handleSignOut } from "@/lib/auth/endpoints";
import { __setTestEnv } from "@/lib/env";

const SUPABASE_URL = "https://acceptancefixture.supabase.co";
const SUPABASE_KEY = "sb_publishable_acceptance_fixture_only";

function setEnv(supabase: boolean, devAuth: boolean): () => void {
  return __setTestEnv({
    DATABASE_URL: "postgres://user:pass@127.0.0.1:5432/edushare",
    APP_URL: "http://127.0.0.1:3000",
    // The development adapter is refused under NODE_ENV=test by design, so a test
    // that enables it has to declare the environment it is pretending to be.
    NODE_ENV: "development",
    LOG_LEVEL: "error",
    NEXT_PUBLIC_SUPABASE_URL: supabase ? SUPABASE_URL : "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase ? SUPABASE_KEY : "",
    SUPABASE_STORAGE_BUCKET: "",
    EDU_SHARE_DEV_AUTH: devAuth ? "1" : "0",
    EDU_SHARE_LOCAL_STORAGE: "0",
  });
}

function signIn(body: unknown, origin?: string): NextRequest {
  const request = new NextRequest("http://127.0.0.1:3000/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (origin) request.headers.set("origin", origin);
  return request;
}

/** Cookie names the response sets, with values discarded. */
function cookieNames(response: Response): string[] {
  return response.headers
    .getSetCookie()
    .map((raw) => (raw.split("=")[0] ?? "").trim())
    .filter((name) => name !== "");
}

let restore: () => void = () => {};
afterEach(() => {
  restore();
  restore = () => {};
});

describe("auth endpoint provider precedence", () => {
  it("uses the development adapter when Supabase is not configured", async () => {
    restore = setEnv(false, true);
    const response = await handleAuthPost(
      signIn({ email: "student@example.invalid", displayName: "Student" }),
      "sign-in",
    );

    expect(response.status).toBe(200);
    expect(cookieNames(response)).toContain("edu-share-dev-session");
    expect(((await response.json()) as { mode: string }).mode).toBe("development");
  });

  it("sets the session cookie as HttpOnly and opaque", async () => {
    restore = setEnv(false, true);
    const response = await handleAuthPost(
      signIn({ email: "student@example.invalid", displayName: "Student" }),
      "sign-in",
    );
    const cookie = response.headers
      .getSetCookie()
      .find((c) => c.startsWith("edu-share-dev-session"));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    // The cookie carries a token, never the identity behind it.
    expect(cookie).not.toContain("student@example.invalid");
  });

  it("prefers Supabase when both providers are configured", async () => {
    // The regression. With Supabase configured the endpoint must use the Supabase
    // schema, which requires a password â€” so a payload shaped for the development
    // adapter is rejected, with no network call: the request never reaches a provider.
    restore = setEnv(true, true);
    const response = await handleAuthPost(
      signIn({ email: "student@example.invalid", displayName: "Student" }),
      "sign-in",
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { fields: Record<string, string> } };
    expect(body.error.fields["password"]).toBeTruthy();
    // The symptom of the original bug: a development cookie minted anyway.
    expect(cookieNames(response)).not.toContain("edu-share-dev-session");
  });

  it("answers two different unknown accounts identically", async () => {
    // Non-enumeration, at the layer that can be checked without a network call: two
    // distinct addresses that are both unknown must produce byte-identical responses.
    // A deployment that says "no such account" for one and "wrong password" for the
    // other is an account-enumeration oracle, and that difference shows up here.
    restore = setEnv(true, true);
    const first = await handleAuthPost(signIn({ email: "nobody@example.invalid" }), "sign-in");
    const second = await handleAuthPost(
      signIn({ email: "somebody-else@example.invalid" }),
      "sign-in",
    );

    expect(first.status).toBe(second.status);
    expect(await first.text()).toBe(await second.text());
  });

  it("reports an unconfigured deployment rather than pretending to sign in", async () => {
    restore = setEnv(false, false);
    const response = await handleAuthPost(
      signIn({ email: "student@example.invalid", displayName: "Student" }),
      "sign-in",
    );
    expect(response.status).toBe(503);
    expect(cookieNames(response)).toHaveLength(0);
  });

  it("rejects a cross-origin sign-in", async () => {
    restore = setEnv(false, true);
    const response = await handleAuthPost(
      signIn({ email: "student@example.invalid", displayName: "Student" }, "https://evil.example"),
      "sign-in",
    );
    expect(response.status).toBe(403);
    expect(cookieNames(response)).toHaveLength(0);
  });

  it("clears the session on sign-out, and refuses a cross-origin sign-out", async () => {
    restore = setEnv(false, true);
    const request = new NextRequest("http://127.0.0.1:3000/api/auth/sign-out", {
      method: "POST",
      body: "{}",
    });
    const response = await handleSignOut(request);
    expect(response.status).toBe(200);
    const cookie = response.headers
      .getSetCookie()
      .find((c) => c.startsWith("edu-share-dev-session"));
    // Removal is an expired cookie, not an omission: the browser must be told.
    expect(cookie).toBeTruthy();
    expect(cookie).toMatch(/Max-Age=0/i);

    const foreign = new NextRequest("http://127.0.0.1:3000/api/auth/sign-out", {
      method: "POST",
      body: "{}",
    });
    foreign.headers.set("origin", "https://evil.example");
    expect((await handleSignOut(foreign)).status).toBe(403);
  });
});
