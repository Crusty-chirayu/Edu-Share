import { expect, test } from "@playwright/test";

/** M3 boot smoke: home renders and health reports database status. */
test("home renders with product name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /EDU-SHARE/i })).toBeVisible();
});

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const body = (await res.json()) as { status: string; db: string };
  expect(["ok", "degraded"]).toContain(body.status);
});
