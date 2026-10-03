import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:3001";
const OUT = "audit-shots";

const ROUTES: [string, string][] = [
  ["home", "/"],
  ["browse", "/browse"],
  ["resource-detail", "/resources/40000000-0000-4000-8000-000000000001"],
  ["upload", "/upload"],
  ["manage", "/manage"],
  ["saved", "/saved"],
  ["profile", "/profile"],
  ["auth", "/auth"],
  ["not-found", "/definitely-not-a-route"],
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_BROWSER_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL }
      : {},
  );
  const findings: string[] = [];

  for (const [label, size] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1440, height: 900 }],
  ] as const) {
    for (const scheme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        ...(label === "mobile" ? devices["iPhone 13"] : { viewport: size }),
        colorScheme: scheme,
      });
      const page = await context.newPage();

      for (const [name, route] of ROUTES) {
        const url = `${BASE}${route}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForTimeout(500);
        const status = response?.status();

        // Horizontal overflow check.
        const overflow = await page.evaluate(() => {
          const de = document.documentElement;
          return { scrollW: de.scrollWidth, clientW: de.clientWidth };
        });
        const overflowPx = overflow.scrollW - overflow.clientW;

        // Exactly one H1.
        const h1 = await page.locator("h1").count();

        // Empty select detection (dead filters).
        const emptySelects = await page.evaluate(() =>
          Array.from(document.querySelectorAll("select"))
            .filter((s) => s.options.length <= 1)
            .map((s) => s.id || s.name || "unnamed"),
        );

        if (overflowPx > 2) findings.push(`${label}/${scheme} ${route}: overflow ${overflowPx}px`);
        if (h1 !== 1) findings.push(`${label}/${scheme} ${route}: h1 count = ${h1}`);
        if (emptySelects.length)
          findings.push(`${label}/${scheme} ${route}: empty selects [${emptySelects}]`);

        const shotPath = `${OUT}/${name}-${label}-${scheme}.png`;
        await page.screenshot({
          path: shotPath,
          fullPage: true,
        });
        console.log(
          `shot ${name} ${label} ${scheme} status=${status} h1=${h1} overflow=${overflowPx}`,
        );
      }

      await context.close();
    }
  }

  await browser.close();
  console.log("\n=== FINDINGS ===");
  console.log(findings.length ? findings.join("\n") : "none");
}

void main();
