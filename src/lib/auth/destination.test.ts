import { describe, expect, it } from "vitest";
import { postSignInDestination } from "@/lib/auth/destination";

/**
 * Regression cover for the post-sign-in redirect.
 *
 * Both identity providers answer a successful sign-in with `redirectTo: "/"`, so
 * the form used to ignore `next` entirely: a visitor who followed a protected link
 * to `/auth?next=/upload` was returned to the home page instead of the page they
 * asked for. These tests pin the corrected precedence *and* the open-redirect
 * guard, which is the reason the deep link is re-validated in the browser rather
 * than trusted from the URL.
 */
describe("postSignInDestination", () => {
  it("honours a same-site deep link", () => {
    expect(postSignInDestination("/upload")).toBe("/upload");
    expect(postSignInDestination("/manage/abc", "/")).toBe("/manage/abc");
  });

  it("falls back to the server's redirectTo when no deep link was supplied", () => {
    expect(postSignInDestination("", "/")).toBe("/");
    expect(postSignInDestination("", "/saved")).toBe("/saved");
  });

  it("refuses an absolute URL, which would be an open redirect", () => {
    expect(postSignInDestination("https://evil.example")).toBe("/");
    expect(postSignInDestination("http://evil.example", "/")).toBe("/");
  });

  it("refuses a protocol-relative URL, the classic open-redirect form", () => {
    expect(postSignInDestination("//evil.example")).toBe("/");
    expect(postSignInDestination("//evil.example/steal")).toBe("/");
  });

  it("ignores a non-absolute redirectTo from the endpoint", () => {
    // A compromised or misconfigured endpoint must not be able to send the
    // browser off-site through the fallback either.
    expect(postSignInDestination("", "https://evil.example")).toBe("/");
    expect(postSignInDestination("", "//evil.example")).toBe("/");
  });

  it("still returns the site root when given nothing usable at all", () => {
    expect(postSignInDestination("")).toBe("/");
    expect(postSignInDestination("", undefined)).toBe("/");
  });
});
