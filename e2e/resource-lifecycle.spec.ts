import { expect, test, type Page } from "@playwright/test";
import {
  deleteResource,
  requireDevIdentityProvider,
  RUN_ID,
  signIn,
  storageObjects,
  syntheticPdf,
  uploadResource,
} from "./helpers";

/**
 * The core value journey, end to end in a real browser: upload a file, find it,
 * download the exact bytes, keep it private, share it, edit it, and delete it.
 *
 * Every fixture is synthetic, prefixed with the run id, and deleted again. One
 * test asserts on *global* storage state, which is exactly why the Playwright
 * workers are pinned to 1 in the config.
 */

/** Ids created by the current test, torn down afterwards. */
const created = new Set<string>();

async function createAndTrack(
  page: Page,
  options: Parameters<typeof uploadResource>[1],
): Promise<string> {
  const id = await uploadResource(page, options);
  created.add(id);
  return id;
}

test.describe("resource lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    /**
     * These journeys get a budget of their own, set once for the file rather
     * than per test.
     *
     * Every test here signs in, uploads a real file, and then walks two or three
     * pages while asserting on what the server actually stored. Against `next
     * dev` that is 5–8 sequential page renders, and this host has been measured
     * anywhere from 3.5s to 20s for a single render depending on load — so the
     * real cost of a journey ranges from ~20s to well over 45s while doing
     * exactly the same work.
     *
     * The suite-wide 45s is kept for every other file, where journeys are short
     * enough that a hang still fails at 45s. Raising it globally would hide a
     * genuine hang here; raising it for the three longest journeys does not,
     * because each one is bounded by its own assertions rather than by a timer.
     */
    test.setTimeout(120_000);
    await requireDevIdentityProvider(page);
  });

  test.afterEach(async ({ page }) => {
    // `page.request` shares the browser context's cookie jar; the standalone
    // `request` fixture does not, and would send an unauthenticated DELETE.
    // `global-setup.ts` sweeps anything this misses, including after a failure.
    for (const id of created) await deleteResource(page.request, id);
    created.clear();
  });

  test("an upload is stored, listed, and downloadable byte-for-byte", async ({ page }) => {
    await signIn(page, { displayName: "E2E Uploader", email: `${RUN_ID}-uploader@example.test` });
    const title = `${RUN_ID} thermodynamics notes`;
    const contents = syntheticPdf("thermodynamics");
    const id = await createAndTrack(page, {
      title,
      description: "First and second law, week 3.",
      file: { name: `${RUN_ID}-thermo.pdf`, mimeType: "application/pdf", buffer: contents },
    });

    // It is in the owner's dashboard...
    await page.goto("/manage");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // ...and in the public library, because it was uploaded as public.
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // The detail page describes the file honestly.
    await page.goto(`/resources/${id}`);
    await expect(page.getByText("application/pdf")).toBeVisible();
    await expect(page.getByText(`${RUN_ID}-thermo.pdf`)).toBeVisible();

    // And the download returns the exact bytes that were uploaded. `page.request`
    // is used rather than the standalone `request` fixture, which does not share
    // the browser context's cookie jar and would send an anonymous request.
    const download = await page.request.get(`/api/resources/${id}/download`);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toBe("application/pdf");
    expect(download.headers()["x-content-type-options"]).toBe("nosniff");
    expect(download.headers()["content-disposition"]).toContain("attachment");
    expect(Buffer.from(await download.body()).equals(contents)).toBe(true);
  });

  test("a private resource is hidden from the library and from other users", async ({
    page,
    browser,
  }) => {
    await signIn(page, { displayName: "E2E Owner", email: `${RUN_ID}-owner@example.test` });
    const title = `${RUN_ID} private revision notes`;
    const id = await createAndTrack(page, { title, visibility: "private" });

    // The owner still sees it, and is told it is private.
    await page.goto("/manage");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Private").first()).toBeVisible();

    // A different signed-in user must get the not-found page — not a 403, which
    // would confirm that the id exists.
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signIn(other, { displayName: "E2E Stranger", email: `${RUN_ID}-stranger@example.test` });
    expect((await other.goto(`/resources/${id}`))?.status()).toBe(404);

    // The download endpoint must refuse to mint credentials for it as well: a
    // 302 to a signed URL here would hand over the file regardless of the page.
    expect((await other.request.get(`/api/resources/${id}/download`)).status()).toBe(404);
    await otherContext.close();

    // And it must be absent from the library *as seen by somebody else*. Note
    // that the owner still sees their own private rows there, by design: the
    // visibility predicate is "public, or yours", so the library is a personal
    // view for a signed-in member. Asserting the owner cannot see it would be
    // asserting a behaviour the product deliberately does not have.
    const strangerLibrary = await browser.newContext();
    const strangerList = await strangerLibrary.newPage();
    await strangerList.goto("/browse");
    await expect(strangerList.getByRole("heading", { name: title })).toHaveCount(0);
    await strangerLibrary.close();
  });

  test("an anonymous visitor cannot reach a private resource either", async ({ page, browser }) => {
    await signIn(page, { displayName: "E2E Owner2", email: `${RUN_ID}-owner2@example.test` });
    const id = await createAndTrack(page, {
      title: `${RUN_ID} private for anonymous check`,
      visibility: "private",
    });

    // A fresh context carries no session cookie at all, so this proves the
    // resource is not merely hidden from other accounts but gated for visitors.
    const anonymous = await browser.newContext();
    expect((await anonymous.request.get(`/api/resources/${id}/download`)).status()).toBe(404);
    expect((await anonymous.request.get(`/resources/${id}`)).status()).toBe(404);
    await anonymous.close();
  });

  test("saving puts a resource on the caller's private list, and unsaving removes it", async ({
    page,
  }) => {
    await signIn(page, { displayName: "E2E Saver", email: `${RUN_ID}-saver@example.test` });
    const title = `${RUN_ID} saved lecture slides`;
    const id = await createAndTrack(page, { title });

    await page.goto(`/resources/${id}`);
    // The button flips optimistically, so waiting for its label proves nothing —
    // the POST may still be in flight when the label changes, and it can also
    // flip back after a rejected response. Wait for the endpoint's own response
    // and assert on the status it returns.
    const saveResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/bookmarks" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect((await saveResponse).status()).toBe(200);
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Toggling again must remove it. A save button that can only ever save is a
    // classic half-implemented feature, so this asserts both directions.
    await page.goto(`/resources/${id}`);
    const unsaveResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/bookmarks" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Saved" }).click();
    expect((await unsaveResponse).status()).toBe(200);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();

    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });

  test("editing a resource updates the page it redirects to", async ({ page }) => {
    await signIn(page, { displayName: "E2E Editor", email: `${RUN_ID}-editor@example.test` });
    const id = await createAndTrack(page, { title: `${RUN_ID} draft handout` });

    await page.goto(`/manage/${id}`);
    await page.getByLabel("Title").fill(`${RUN_ID} final handout`);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL((url) => url.pathname === `/resources/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${RUN_ID} final handout`);
  });

  test("a non-owner cannot open the edit form", async ({ page, browser }) => {
    await signIn(page, { displayName: "E2E Owner3", email: `${RUN_ID}-owner3@example.test` });
    const id = await createAndTrack(page, { title: `${RUN_ID} owner-only resource` });

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signIn(other, { displayName: "E2E Editor2", email: `${RUN_ID}-editor2@example.test` });

    expect((await other.goto(`/manage/${id}`))?.status()).toBe(404);
    await otherContext.close();
  });

  test("deleting removes the row, the listing entry, and the stored object", async ({ page }) => {
    await signIn(page, { displayName: "E2E Deleter", email: `${RUN_ID}-deleter@example.test` });
    const title = `${RUN_ID} temporary upload`;
    const id = await uploadResource(page, { title });
    created.add(id);

    // The object really is on disk before the delete, so the assertion below is
    // meaningful rather than vacuously true.
    const before = storageObjects().length;
    expect(before).toBeGreaterThan(0);

    await page.goto(`/resources/${id}`);
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // The confirmation is an in-page `<dialog>` (native confirm() is forbidden
    // by design-system §14.5) that must name the object and state the
    // consequence before the destructive request is allowed to fire.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(title);
    await expect(dialog).toContainText(/cannot be undone/i);
    await dialog.getByRole("button", { name: "Delete resource" }).click();

    await expect(page).toHaveURL(/\/manage$/);

    // Gone from the owner's dashboard and from the public library.
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

    // The server agrees, and the bytes are no longer served.
    expect((await page.request.get(`/api/resources/${id}/download`)).status()).toBe(404);
    expect((await page.goto(`/resources/${id}`))?.status()).toBe(404);

    // Crucially, the object itself is gone. A row-first delete that forgets the
    // file is the classic leak this assertion exists to catch.
    expect(storageObjects().length).toBe(before - 1);
  });

  test("a file whose contents contradict its extension is refused, and stores nothing", async ({
    page,
  }) => {
    await signIn(page, { displayName: "E2E Uploader", email: `${RUN_ID}-uploader@example.test` });
    const before = storageObjects().length;

    // A PHP script wearing a .pdf extension. The server sniffs the content, so a
    // webshell can never reach storage.
    await page.goto("/upload");
    await page.getByLabel("Title").fill(`${RUN_ID} disguised script`);
    await page.locator("#file").setInputFiles({
      name: "harmless.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("<?php system($_GET['c']); ?>\n", "utf8"),
    });
    await page.getByRole("button", { name: "Upload resource" }).click();

    // The message lands next to the field rather than failing silently.
    await expect(page.getByText(/do not look like \.pdf/i)).toBeVisible();

    // Nothing was stored and no resource was created.
    expect(storageObjects().length).toBe(before);
    await page.goto("/manage");
    await expect(page.getByText(`${RUN_ID} disguised script`)).toHaveCount(0);
  });

  test("an upload with no file chosen is refused with a field-level message", async ({ page }) => {
    await signIn(page, { displayName: "E2E NoFile", email: `${RUN_ID}-nofile@example.test` });

    await page.goto("/upload");
    await page.getByLabel("Title").fill(`${RUN_ID} no file attached`);
    await page.getByRole("button", { name: "Upload resource" }).click();

    await expect(page.getByText("Choose a file to upload.")).toBeVisible();
  });
});
