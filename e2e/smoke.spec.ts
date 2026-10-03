import { expect, test } from "@playwright/test";

/**
 * M3 boot smoke, re-anchored in SG-3.
 *
 * This test originally asserted a *heading* named "EDU-SHARE". The M4 home page
 * redesign moved the wordmark to the banner link and gave the hero a marketing
 * H1 ("Every subject. Every campus."), so the old locator could never match and
 * the suite went red while the page was rendering correctly — verified from the
 * Playwright accessibility snapshot, which shows both the banner link and the
 * level-1 heading present.
 *
 * The replacement is stricter, not looser: it requires the brand to be a real
 * navigational link, the hero to expose exactly one `heading level=1`, and the
 * primary CTA to be reachable. A page that renders an error boundary or a blank
 * shell fails all three.
 */
test("home renders the brand, one hero heading, and its primary action", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: /EDU-SHARE/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /browse the library/i })).toBeVisible();
});

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const body = (await res.json()) as { status: string; db: string };
  expect(["ok", "degraded"]).toContain(body.status);
});
