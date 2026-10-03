import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Shared helpers for the browser suite.
 *
 * Two rules govern everything in this file:
 *
 *  1. **Synthetic data only.** Every fixture is generated here, carries a per-run
 *     prefix so it can never collide with a developer's own data, and is removed
 *     again by `cleanupRunStorageObjects`. No real document, address or credential
 *     is ever used.
 *  2. **Clean up only what the suite created.** Cleanup deletes by the run prefix
 *     and by explicit id; it never truncates a table or clears storage wholesale.
 */

/** Unique per run, so parallel runs and leftover data cannot be confused. */
export const RUN_ID = `e2e-${process.pid}-${Date.now().toString(36)}`;

/** Local provider root, as configured by `playwright.config.ts`. */
const STORAGE_ROOT = path.join(process.cwd(), ".local", "storage");

/** A minimal, genuinely well-formed single-page PDF. Starts with the `%PDF-` magic. */
export function syntheticPdf(label = "EDU-SHARE synthetic test document"): Buffer {
  const text = `BT (${label}) Tj ET`;
  const body = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj",
    `4 0 obj<</Length ${text.length}>>stream`,
    text,
    "endstream endobj",
    "trailer<</Root 1 0 R>>",
    "%%EOF",
  ].join("\n");
  return Buffer.from(body, "latin1");
}

/**
 * Signs in through the real form and the real endpoint.
 *
 * There is no cookie injection anywhere in this suite: every authenticated test
 * exercises the same path a browser would, so a regression in the sign-in endpoint,
 * the cookie attributes, or the session bridge fails here rather than being masked
 * by a test-only shortcut.
 */
export async function signIn(
  page: Page,
  identity: { displayName: string; email: string },
): Promise<void> {
  await page.goto("/auth");
  await page.getByLabel("Display name").fill(identity.displayName);
  await page.getByLabel("Email").fill(identity.email);

  // Wait for the endpoint's own answer before asserting anything about the page.
  // Without this the only signal is the identity block appearing, which is
  // rendered server-side by the *landing* page — so a slow first render of that
  // page is indistinguishable from a failed sign-in, and the failure is reported
  // against a header that was never wrong. The response separates the two: a
  // non-2xx here is the product failing, and a 200 followed by a slow render is
  // the dev server being slow, which is a different problem with a different fix.
  //
  // The form starts on the "sign in" intent and only switches to "sign up" on
  // demand, so the matcher accepts both paths rather than assuming which one this
  // run used.
  const [signInResponse] = await Promise.all([
    page.waitForResponse((response) => {
      if (response.request().method() !== "POST") return false;
      const { pathname } = new URL(response.url());
      return pathname === "/api/auth/sign-in" || pathname === "/api/auth/sign-up";
    }),
    page.getByRole("button", { name: "Continue" }).click(),
  ]);
  expect(signInResponse.status(), `sign-in was refused for ${identity.displayName}`).toBe(200);

  // The form honours a same-site `next`, so it may land on any page the test
  // asked for. The provider-independent signal that the session exists is the
  // identity block in the site header, which is rendered server-side from
  // `getSession()` — so this asserts the server agrees, not just the UI.
  //
  // The budget here is deliberately longer than the suite's default assertion
  // timeout. Sign-in is the one step every authenticated journey performs, and
  // the render it waits on is frequently the *first* render of whichever page
  // the journey is about to use. Measured on this host, `next dev` takes 3.5s
  // for a warm page and up to 20s for a cold one, so a 15s assertion fails on a
  // working server roughly once per full suite. 30s still fails loudly on a real
  // regression — a broken header never appears at all — while absorbing a cold
  // compile.
  await expect(page.getByText(identity.displayName).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 30_000 });
}

/**
 * Fails loudly, and with an actionable message, when the server under test was not
 * started by this config.
 *
 * `webServer.reuseExistingServer` means a developer who already has `next dev` on
 * port 3000 is tested against *their* server. If it was started without
 * `EDU_SHARE_DEV_AUTH=1`, every authenticated test would fail with a confusing
 * "Authentication is not configured" alert. Detecting it here turns a confusing
 * failure into one instruction.
 */
export async function requireDevIdentityProvider(page: Page): Promise<void> {
  await page.goto("/auth");
  if (
    await page
      .getByText("Authentication is not configured")
      .isVisible()
      .catch(() => false)
  ) {
    throw new Error(
      "The server on port 3000 is not the one this suite configured " +
        "(EDU_SHARE_DEV_AUTH=1 is missing). Stop your own `next dev` and re-run.",
    );
  }
}

/**
 * The origin the suite is running against.
 *
 * Taken from the config's `baseURL` rather than written out as a literal. These
 * assertions exist to prove a post-sign-in redirect stayed on this site, and a
 * hard-coded `127.0.0.1:3000` would quietly stop testing that the moment the
 * suite ran on another port — passing for the wrong reason, which is worse than
 * failing.
 */
export function expectedOrigin(baseURL: string | undefined): string {
  if (!baseURL) throw new Error("baseURL is not configured; cannot assert a same-site destination");
  return new URL(baseURL).origin;
}

/** Uploads a resource through the real form and returns its id from the URL. */
export async function uploadResource(
  page: Page,
  options: {
    title: string;
    description?: string;
    visibility?: "public" | "private";
    file?: { name: string; mimeType: string; buffer: Buffer };
  },
): Promise<string> {
  await page.goto("/upload");
  await page.getByLabel("Title").fill(options.title);
  if (options.description) await page.getByLabel("Description").fill(options.description);
  await page.getByRole("radio", { name: options.visibility ?? "Public" }).check();
  const file = options.file ?? {
    name: `${RUN_ID}.pdf`,
    mimeType: "application/pdf",
    buffer: syntheticPdf(),
  };
  await page.locator("#file").setInputFiles(file);

  await page.getByRole("button", { name: "Upload resource" }).click();
  await page.waitForURL(/\/resources\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop() as string;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(options.title);
  return id;
}

/** Removes a resource through the API. Used for teardown and for negative cases. */
export async function deleteResource(request: APIRequestContext, id: string): Promise<void> {
  const response = await request.delete(`/api/resources/${id}`);
  // 200 and 404 both satisfy the postcondition "not present any more".
  expect([200, 404]).toContain(response.status());
}

/** Every object file currently under the local provider root. */
export function storageObjects(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // an absent directory simply means no objects
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else found.push(full);
    }
  };
  walk(STORAGE_ROOT);
  return found;
}

/** Writes a fixture to disk so a test can assert on real server-side bytes. */
export function writeTempFile(name: string, contents: Buffer | string): string {
  const dir = path.join(process.cwd(), ".local", "e2e-tmp");
  mkdirSync(dir, { recursive: true });
  const full = path.join(dir, name);
  writeFileSync(full, contents);
  return full;
}
