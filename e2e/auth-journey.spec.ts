import { expect, test } from "@playwright/test";
import { expectedOrigin, requireDevIdentityProvider, RUN_ID, signIn } from "./helpers";

/**
 * The session boundary, exercised as a user would meet it: hit a protected page,
 * get sent to sign in, come back to where you were.
 *
 * These tests use the development identity adapter because the Playwright server
 * is configured with it. That adapter is **not** Supabase Auth and proves nothing
 * about a hosted sign-in — see the hosted acceptance checklist. What it does prove
 * is that session establishment, the cookie round-trip, the identity bridge and
 * the server-side gate all work end to end.
 */

test.describe("authentication", () => {
  test.beforeEach(async ({ page }) => {
    await requireDevIdentityProvider(page);
  });

  test("a protected page redirects to sign in and returns you afterwards", async ({ page }) => {
    await page.goto("/upload");
    // Next.js emits `?next=/upload` with the slash unencoded, so the assertion
    // accepts either encoding rather than pinning one incidental detail.
    await expect(page).toHaveURL(/\/auth\?next=(%2F|\/)upload$/);

    await page.getByLabel("Display name").fill("E2E Redirect");
    await page.getByLabel("Email").fill(`${RUN_ID}-redirect@example.test`);
    await page.getByRole("button", { name: "Continue" }).click();

    // The form posts to `next`, so the user resumes the page they asked for.
    //
    // This must check the pathname, not the raw URL string: the previous regex
    // "/upload$" is satisfied by "/auth?next=/upload" — the very page we are
    // waiting to leave — so it reported success while the visitor was still on
    // the sign-in form. The predicate retries until the redirect actually lands,
    // which is both stricter than before and correct.
    await expect(page).toHaveURL((url) => url.pathname === "/upload");
    await expect(page.getByRole("heading", { name: "Upload a resource" })).toBeVisible();
  });

  test("the managed pages gate a signed-out visitor without redirecting them away", async ({
    page,
  }) => {
    // `/manage` and `/saved` deliberately render a signed-out state instead of a
    // redirect, so a visitor can understand the page before committing to sign in.
    for (const path of ["/manage", "/saved"]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    }
  });

  test("signing in shows the identity in the chrome", async ({ page }) => {
    await signIn(page, { displayName: "E2E Session", email: `${RUN_ID}-session@example.test` });

    await page.goto("/");
    await expect(page.getByText("E2E Session")).toBeVisible();
    // The adapter is always labelled, so a developer can never mistake it for
    // a real authenticated session.
    await expect(page.getByText("Dev identity")).toBeVisible();
  });

  test("the session cookie is HttpOnly and SameSite", async ({ page, context }) => {
    await signIn(page, { displayName: "E2E Cookie", email: `${RUN_ID}-cookie@example.test` });

    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "edu-share-dev-session");

    expect(session, "the session cookie should exist after signing in").toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
  });

  test("the profile page shows the role and the development-identity warning", async ({ page }) => {
    await signIn(page, { displayName: "E2E Profile", email: `${RUN_ID}-profile@example.test` });
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
    // The role appears in both the header and the profile definition list, so
    // the assertion is scoped to the list rather than left ambiguous.
    await expect(page.locator("#main").getByText("student").first()).toBeVisible();
    await expect(page.getByText("Development identity")).toBeVisible();
  });

  test("signing out ends the session", async ({ page }) => {
    await signIn(page, { displayName: "E2E Signout", email: `${RUN_ID}-out@example.test` });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

    // The server must agree, not just the rendered chrome.
    await page.goto("/upload");
    await expect(page).toHaveURL(/\/auth\?next=(%2F|\/)upload$/);
  });

  test("an off-site ?next= is ignored", async ({ page, baseURL }) => {
    await page.goto("/auth?next=https%3A%2F%2Fevil.example%2Fsteal");

    await page.getByLabel("Display name").fill("E2E OpenRedirect");
    await page.getByLabel("Email").fill(`${RUN_ID}-redirect2@example.test`);
    await page.getByRole("button", { name: "Continue" }).click();

    // The destination is the site root, never the attacker's host. Checking the
    // origin *and* the pathname leaves no way for the off-site `next` value itself
    // to satisfy the assertion while the browser is still on the sign-in form.
    await expect(page).toHaveURL(
      (url) => url.origin === expectedOrigin(baseURL) && url.pathname === "/",
    );
  });

  test("a protocol-relative ?next= is ignored", async ({ page, baseURL }) => {
    await page.goto("/auth?next=%2F%2Fevil.example%2Fsteal");
    await page.getByLabel("Display name").fill("E2E OpenRedirect2");
    await page.getByLabel("Email").fill(`${RUN_ID}-redirect3@example.test`);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(
      (url) => url.origin === expectedOrigin(baseURL) && url.pathname === "/",
    );
  });
});
