import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/edushare",
      APP_URL: "http://127.0.0.1:3000",
    },
  },
});
