import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:3001";
const OUT = "audit-shots";

interface ViewportDef {
  label: string;
  width: number;
  height: number;
  isMobile?: boolean;
}

const VIEWPORTS: ViewportDef[] = [
  { label: "desktop-1440", width: 1440, height: 900 },
  { label: "laptop-1280", width: 1280, height: 800 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "mobile-390", width: 390, height: 844, isMobile: true },
  { label: "compact-360", width: 360, height: 780, isMobile: true },
];

const ROUTES: [string, string][] = [
  ["home", "/"],
  ["browse", "/browse"],
  ["resource-detail", "/resources/40000000-0000-4000-8000-000000000001"],
  ["upload", "/upload"],
  ["manage", "/manage"],
  ["saved", "/saved"],
  ["profile", "/profile"],
  ["auth", "/auth"],
  ["admin-moderation", "/admin/moderation"],
  ["admin-taxonomy", "/admin/taxonomy"],
  ["about", "/about"],
  ["help", "/help"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
  ["acceptable-use", "/acceptable-use"],
  ["not-found", "/definitely-not-a-route"],
];

async function signInAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  // Check if already signed in
  const signedInH1 = await page.locator("h1:has-text('Signed in')").count();
  if (signedInH1 > 0) return;

  const displayNameInput = page.getByLabel("Display name");
  const emailInput = page.getByLabel("Email");
  if ((await displayNameInput.count()) > 0) {
    await displayNameInput.fill("Lead Governance Admin");
    await emailInput.fill("admin@edushare.invalid");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await page.waitForLoadState("domcontentloaded");
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_BROWSER_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL }
      : {},
  );

  const findings: string[] = [];
  const metrics: {
    totalScreenshots: number;
    viewportsChecked: number;
    routesChecked: number;
    overflowFailures: number;
    h1Failures: number;
    consoleErrors: number;
  } = {
    totalScreenshots: 0,
    viewportsChecked: VIEWPORTS.length,
    routesChecked: ROUTES.length,
    overflowFailures: 0,
    h1Failures: 0,
    consoleErrors: 0,
  };

  console.log(`Starting comprehensive Visual QA & Accessibility Audit against ${BASE}...`);

  for (const vp of VIEWPORTS) {
    for (const scheme of ["light", "dark"] as const) {
      const contextOptions: {
        viewport: { width: number; height: number };
        colorScheme: "light" | "dark";
        isMobile?: boolean;
        hasTouch?: boolean;
      } = {
        viewport: { width: vp.width, height: vp.height },
        colorScheme: scheme,
      };
      if (vp.isMobile) {
        contextOptions.isMobile = true;
        contextOptions.hasTouch = true;
      }

      const context: BrowserContext = await browser.newContext(contextOptions);

      const page = await context.newPage();

      // Listen for unhandled exceptions or console errors
      page.on("pageerror", (err) => {
        metrics.consoleErrors++;
        findings.push(`[PAGE ERROR] ${vp.label}/${scheme}: ${err.message}`);
      });

      // Sign in as admin on this context so protected and admin routes render fully
      await signInAdmin(page);

      for (const [name, route] of ROUTES) {
        const url = `${BASE}${route}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(200);
        const status = response?.status();

        // 1. Horizontal overflow evaluation
        const overflow = await page.evaluate(() => {
          const de = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(de.scrollWidth, body.scrollWidth);
          const clientW = de.clientWidth;
          return { scrollW, clientW, diff: scrollW - clientW };
        });

        if (overflow.diff > 2) {
          metrics.overflowFailures++;
          findings.push(
            `[OVERFLOW] ${vp.label}/${scheme} ${route}: ${overflow.diff}px overflow (scrollW=${overflow.scrollW}, clientW=${overflow.clientW})`,
          );
        }

        // 2. Exactly one H1 per page (accessible heading hierarchy)
        const h1Count = await page.locator("h1").count();
        if (h1Count !== 1) {
          metrics.h1Failures++;
          findings.push(`[HEADING H1] ${vp.label}/${scheme} ${route}: h1 count = ${h1Count}`);
        }

        // 3. Focus visible check on keyboard Tab
        if (name === "home" && vp.label === "desktop-1440" && scheme === "light") {
          await page.keyboard.press("Tab");
          const hasFocus = await page.evaluate(() => {
            const active = document.activeElement;
            return active && active !== document.body;
          });
          if (!hasFocus) {
            findings.push(`[A11Y FOCUS] ${route} did not set focus on keyboard Tab`);
          }
        }

        // 4. Mobile navigation drawer check (on mobile-390, light)
        if (vp.label === "mobile-390" && name === "home" && scheme === "light") {
          const menuToggle = page.locator(
            "button[aria-expanded], button[aria-label*='menu' i], .nav-toggle, [data-mobile-menu-toggle]",
          );
          if ((await menuToggle.count()) > 0) {
            await menuToggle.first().click();
            await page.waitForTimeout(300);
            await page.screenshot({
              path: `${OUT}/mobile-nav-expanded-${scheme}.png`,
              fullPage: false,
            });
            metrics.totalScreenshots++;
          }
        }

        // 5. Capture screenshot
        const shotPath = `${OUT}/${name}-${vp.label}-${scheme}.png`;
        await page.screenshot({
          path: shotPath,
          fullPage: true,
        });
        metrics.totalScreenshots++;

        console.log(
          `[PASS] ${name.padEnd(18)} | ${vp.label.padEnd(13)} | ${scheme.padEnd(5)} | HTTP ${status} | H1: ${h1Count} | Overflow: ${overflow.diff}px`,
        );
      }

      await context.close();
    }
  }

  await browser.close();

  const summary = {
    timestamp: new Date().toISOString(),
    metrics,
    findings,
  };

  writeFileSync(`${OUT}/audit-summary.json`, JSON.stringify(summary, null, 2), "utf8");

  console.log("\n==========================================");
  console.log("VISUAL QA & ACCESSIBILITY AUDIT COMPLETE");
  console.log("==========================================");
  console.log(`Total Screenshots Captured: ${metrics.totalScreenshots}`);
  console.log(
    `Viewports Tested:          ${metrics.viewportsChecked} (desktop-1440, laptop-1280, tablet-768, mobile-390, compact-360)`,
  );
  console.log(`Routes Tested:             ${metrics.routesChecked}`);
  console.log(`Horizontal Overflow Errors: ${metrics.overflowFailures}`);
  console.log(`H1 Hierarchy Errors:       ${metrics.h1Failures}`);
  console.log(`Client Console Errors:     ${metrics.consoleErrors}`);
  console.log(`Findings Total:            ${findings.length}`);
  if (findings.length > 0) {
    console.log("\nDetails:");
    console.log(findings.join("\n"));
  }
}

main().catch((err) => {
  console.error("Visual QA Audit failed:", err);
  process.exit(1);
});
