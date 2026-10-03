import { defineConfig, devices } from "@playwright/test";

/**
 * The port the disposable test server binds.
 *
 * Read from `E2E_PORT` so this file and `scripts/e2e-runner.ts` can never
 * disagree: the runner refuses to start when the port is busy, and Playwright
 * would otherwise wait on a health URL the runner never asked for. Default 3000,
 * so CI and an ordinary local run are byte-identical to before.
 */
const E2E_PORT = Number(process.env["E2E_PORT"] ?? 3000);
const E2E_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  /**
   * Playwright's default is 30s, tuned for a production-like server. This suite
   * runs against `next dev`, which compiles each route and each server action on
   * first use — measured at 34s for a cold warm-up on this host. The slowest
   * journey (save → unsave, two mutating round trips through routes nothing has
   * compiled yet) lands at ~31s, so the default budget turns a working but slow
   * journey into a timeout failure. 45s keeps a genuine hang failing loudly while
   * no longer mistaking dev-mode compilation for one.
   */
  timeout: 45_000,
  /**
   * Playwright's default per-assertion budget is 5s, which is a different number
   * from the per-test 30s above. On this host the dev server needs far longer than
   * 5s to answer an auth **POST** — signing in and signing out are round trips
   * through an action that compiles on first use, so the assertion gave up while
   * the server was still working. Raising only the assertion budget keeps every
   * expectation exactly as strict as it was; it just stops mistaking a slow dev
   * server for a broken product.
   */
  expect: {
    timeout: 15_000,
  },
  retries: 0,
  reporter: "list",
  /**
   * Serialised on purpose. The authenticated journeys share one disposable database
   * and one in-process identity adapter, and several of them assert on global
   * state (an orphan-object count, "the library is empty"). Running those in
   * parallel would make one test's fixtures visible to another and turn a real
   * assertion into a race. The suite is small enough that the wall-clock cost is
   * irrelevant next to the determinism.
   */
  workers: 1,
  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? E2E_ORIGIN,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // `PLAYWRIGHT_BROWSER_CHANNEL` is an opt-in escape hatch for machines where
      // the pinned Playwright browser build cannot be installed (a locked-down or
      // virus-scanning host can download the archive and then fail to extract its
      // executable). Unset — the normal case, and what CI uses — this is exactly
      // the previous behaviour: the bundled Chromium build.
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env["PLAYWRIGHT_BROWSER_CHANNEL"]
          ? { channel: process.env["PLAYWRIGHT_BROWSER_CHANNEL"] }
          : {}),
      },
    },
  ],
  /**
   * Snapshots the local storage directory before the run and sweeps the database
   * and new objects afterwards, so a browser run cannot leave residue that breaks
   * the database integration suites. See `e2e/global-setup.ts`.
   */
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    url: `${E2E_ORIGIN}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
    /**
     * This is a **disposable, loopback-only test process**, so the suite turns on the
     * two development adapters: without them there is no way to sign in, upload a
     * file, or own a resource in a browser, and the authenticated journeys would be
     * untestable.
     *
     * Neither switch weakens a real deployment. `src/lib/env.ts` refuses to validate
     * a configuration that pairs `EDU_SHARE_DEV_AUTH=1` with `NODE_ENV=production`,
     * and `getStorage()` refuses the local provider outright in production, so a
     * misconfigured production boot fails loudly instead of serving
     * password-less, disk-backed sessions. The files written by the local provider
     * land in `.local/storage`, which is git-ignored.
     *
     * `NEXT_PUBLIC_SUPABASE_*` are deliberately **blanked**, not merely left unset.
     * This repository's own `.env` carries real hosted credentials, and Next.js
     * loads `.env` without overriding variables already present in the process
     * environment — so without these two empty strings the test server would pick
     * up the owner's Supabase project and every signed-in journey would silently
     * perform a real hosted Auth exchange and write to the hosted database. They
     * must stay blank for the suite to be provably local-only.
     */
    env: {
      DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/edushare",
      APP_URL: E2E_ORIGIN,
      NODE_ENV: "development",
      EDU_SHARE_DEV_AUTH: "1",
      EDU_SHARE_LOCAL_STORAGE: "1",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
