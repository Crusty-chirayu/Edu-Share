import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, jsonError, jsonMessageError, readJsonBody } from "@/lib/api";
import { applyCookieChanges, BufferedCookieStore } from "@/lib/auth/cookies";
import {
  createDevSession,
  destroyDevSession,
  DEV_AUTH_COOKIE,
  isDevAuthEnabled,
} from "@/lib/auth/development";
import {
  isSupabaseAuthConfigured,
  signInWithPassword,
  signOutWithStore,
  signUpWithPassword,
} from "@/lib/auth/supabase-server";
import { devSignInSchema, parseOrThrow, signInSchema, signUpSchema } from "@/lib/validation";

/**
 * The two authentication endpoints, shared by both identity providers.
 *
 * Credentials and messages are handled according to two rules that apply equally to
 * Supabase and the development adapter:
 *
 *  - **No enumeration.** An unknown email and a wrong password produce the same
 *    sentence and the same status, so the endpoint cannot be used to discover which
 *    addresses are registered.
 *  - **Same-origin only.** A browser posts same-origin forms without an `Origin`
 *    header, but a cross-origin `fetch` includes it — so a present-but-mismatched
 *    Origin is a hard rejection.
 *
 * On success the buffered cookie writes are replayed onto the response. Nothing is
 * written to `cookies()` directly, so a handler can never produce a partial session.
 */

const DEV_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type AuthIntent = "sign-in" | "sign-up";

export async function handleAuthPost(
  request: NextRequest,
  intent: AuthIntent,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const store = new BufferedCookieStore(request.cookies.getAll());

    if (isSupabaseAuthConfigured()) {
      if (intent === "sign-up") {
        const input = parseOrThrow(signUpSchema, body);
        const outcome = await signUpWithPassword(store, input);
        return finishSupabaseAuth(store, outcome);
      }
      const input = parseOrThrow(signInSchema, body);
      const outcome = await signInWithPassword(store, input);
      return finishSupabaseAuth(store, outcome);
    }

    // Supabase is not configured, so the development adapter is the only provider.
    // This branch is reached only after the check above, which keeps this endpoint's
    // provider order identical to `getSession()`: **Supabase always wins**. When the
    // two disagreed — a deployment with both configured — sign-in would mint a
    // development session while every later request took the Supabase path, found no
    // token, and answered 401. The user was told they were signed in and was not.
    if (isDevAuthEnabled()) {
      // The development adapter treats sign-in and sign-up as the same operation:
      // there is no credential to verify and no account to create, and the UI says so.
      const input = parseOrThrow(devSignInSchema, body);
      const { token } = createDevSession(input);
      const response = NextResponse.json({
        ok: true,
        message: `Signed in as ${input.displayName} using the development identity adapter.`,
        redirectTo: "/",
        mode: "development",
      });
      store.set(DEV_AUTH_COOKIE, token, { maxAge: DEV_SESSION_MAX_AGE_SECONDS });
      applyCookieChanges(store.drain(), response);
      return response;
    }

    // Neither provider is available: say so plainly instead of pretending to sign in.
    return jsonMessageError(
      503,
      "unavailable",
      "Authentication is not configured on this deployment. Set the Supabase URL and anon key, " +
        "or set EDU_SHARE_DEV_AUTH=1 to use the development identity adapter locally.",
    );
  } catch (error) {
    return jsonError(error);
  }
}

function finishSupabaseAuth(
  store: BufferedCookieStore,
  outcome: Awaited<ReturnType<typeof signInWithPassword>>,
): NextResponse {
  const response = outcome.ok
    ? NextResponse.json({
        ok: true,
        message: outcome.message,
        // Email confirmation may have left the user without a session; the client
        // decides where to go from `hasSession`, it is never guessed server-side.
        hasSession: outcome.hasSession,
        redirectTo: outcome.hasSession ? "/" : "/",
        mode: "supabase",
      })
    : jsonMessageError(
        outcome.message.includes("not configured") ? 503 : 401,
        outcome.message.includes("not configured") ? "unavailable" : "unauthorized",
        outcome.message,
      );
  applyCookieChanges(store.drain(), response);
  return response;
}

/**
 * Signs out of both providers. Supabase's remote sign-out is best effort: the local
 * cookies are cleared unconditionally, so a network failure never leaves the browser
 * holding a session the server has already abandoned.
 */
export async function handleSignOut(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const store = new BufferedCookieStore(request.cookies.getAll());
    await signOutWithStore(store);
    destroyDevSession(store.get(DEV_AUTH_COOKIE));
    store.remove(DEV_AUTH_COOKIE);

    const response = NextResponse.json({
      ok: true,
      message: "Signed out.",
      redirectTo: "/",
    });
    applyCookieChanges(store.drain(), response);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
