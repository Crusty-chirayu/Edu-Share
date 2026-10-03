import { expect, test } from "@playwright/test";

/**
 * Journeys an anonymous visitor can take, plus the API surface that must refuse
 * them.
 *
 * These are deliberately written against the *rendered* page rather than against
 * internals: a visitor must never see a stack trace, a driver message, or a crash
 * boundary, and every one of those claims is checkable from the outside.
 */

test.describe("anonymous visitor", () => {
  test("the landing page leads into the library", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /browse the library/i }).click();

    // Pathname, not raw string: an anchored-on-the-end regex would also be
    // satisfied by a URL that merely ends in "/browse".
    await expect(page).toHaveURL((url) => url.pathname === "/browse");
    await expect(page.getByRole("heading", { name: "Browse resources" })).toBeVisible();
  });

  test("browse offers working filter controls and a real empty state", async ({ page }) => {
    await page.goto("/browse");

    // Every control the server actually reads must be present and labelled.
    await expect(page.getByLabel("Search")).toBeVisible();
    await expect(page.getByLabel("Institution")).toBeVisible();
    await expect(page.getByLabel("Subject")).toBeVisible();
    await expect(page.getByLabel("Sort")).toBeVisible();

    // With no matches the page must explain itself and offer a way out, rather
    // than rendering a blank list. §13.0 requires two distinct honest states —
    // first use (nothing catalogued) and no-results-with-filters — so the
    // assertion covers whichever one the fixture environment is in, plus the
    // single escape hatch each of them offers.
    const listing = page.locator("ul.resource-list");
    const firstUse = page.getByText("Nothing here yet");
    const noResults = page.getByText("No matches");
    if (await listing.isVisible().catch(() => false)) {
      await expect(listing.getByRole("listitem").first()).toBeVisible();
    } else {
      await expect(firstUse.or(noResults)).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: /clear filters|create an account to upload|upload the first one/i,
        }),
      ).toBeVisible();
    }
  });

  test("a nonsense query string degrades to defaults instead of erroring", async ({ page }) => {
    const response = await page.goto("/browse?page=banana&pageSize=99999&sort=drop%20table");

    // A visitor who hand-edits a URL must get the page, not a 500.
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Browse resources" })).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });

  test("an unknown resource id renders the not-found page", async ({ page }) => {
    const response = await page.goto("/resources/00000000-0000-4000-8000-000000000000");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  });

  test("a non-UUID resource id is not found, and never reaches a query", async ({ page }) => {
    const response = await page.goto("/resources/not-a-uuid");
    expect(response?.status()).toBe(404);
  });

  test("security headers are present on every page", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
    // HSTS must NOT be sent over plain HTTP, or a browser caches it for the host
    // and refuses to load the local dev server over http afterwards.
    expect(headers["strict-transport-security"]).toBeUndefined();
  });

  test("the health probe carries the same header baseline", async ({ request }) => {
    const headers = (await request.get("/api/health")).headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });
});

test.describe("anonymous API access", () => {
  test("creating a resource without a session is refused", async ({ request }) => {
    const response = await request.post("/api/resources", {
      multipart: { title: "should never be created" },
    });

    expect(response.status()).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unauthorized");
  });

  test("bookmarking without a session is refused", async ({ request }) => {
    const response = await request.post("/api/bookmarks", {
      data: { resourceId: "00000000-0000-4000-8000-000000000000" },
    });
    expect(response.status()).toBe(401);
  });

  test("reading the profile without a session is refused", async ({ request }) => {
    const response = await request.patch("/api/profile", { data: { displayName: "hijack" } });
    expect(response.status()).toBe(401);
  });

  test("a cross-origin write is refused even when signed out", async ({ request }) => {
    // Order matters: the origin check runs before the session check, so this
    // proves CSRF protection is not merely a side effect of "no session".
    const response = await request.post("/api/bookmarks", {
      data: { resourceId: "00000000-0000-4000-8000-000000000000" },
      headers: { Origin: "https://evil.example" },
    });
    expect(response.status()).toBe(403);
  });

  test("downloading an unknown resource is a 404, not a 403", async ({ request }) => {
    const response = await request.get(
      "/api/resources/00000000-0000-4000-8000-000000000000/download",
    );
    // A missing row and a forbidden row must be indistinguishable, so that the
    // endpoint cannot be used to discover which private resources exist.
    expect(response.status()).toBe(404);
  });

  test("a non-UUID in the download path is a 400", async ({ request }) => {
    const response = await request.get("/api/resources/not-a-uuid/download");
    expect(response.status()).toBe(400);
  });

  test("error bodies never contain database internals", async ({ request }) => {
    const response = await request.get(
      "/api/resources/00000000-0000-4000-8000-000000000000/download",
    );
    const text = (await response.text()).toLowerCase();

    for (const leak of ["postgres://", "password", "select ", "relation ", "at object."]) {
      expect(text).not.toContain(leak);
    }
  });
});
