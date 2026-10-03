/**
 * Where to send the browser after a successful sign-in.
 *
 * ## Why this is not simply `redirectTo ?? next`
 *
 * Both identity providers answer a successful sign-in with `redirectTo: "/"`, so
 * preferring the server's value made the `next` parameter dead code: a visitor who
 * followed a protected link to `/auth?next=/upload` was returned to the home page
 * after signing in instead of to the page they actually asked for.
 *
 * The deep link is therefore preferred — but only after being validated here. The
 * auth page already reduces `next` to a same-site relative path, and this repeats
 * that check rather than trusting it, because the redirect happens in the browser
 * and a `//evil.example` value would be an open redirect. The endpoint's
 * `redirectTo` remains the fallback, and is itself checked: a compromised or
 * misconfigured endpoint must not be able to send the browser off-site through
 * the fallback either.
 *
 * This lives in `lib/` rather than in the component so it can be unit-tested
 * without loading React or the Next.js router.
 */
export function postSignInDestination(next: string, redirectTo?: string): string {
  const fallback =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
