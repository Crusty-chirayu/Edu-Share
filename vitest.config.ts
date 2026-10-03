import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    /**
     * Runs BEFORE any test module is imported, in every worker. When
     * `RUN_DB_TESTS=1` it resolves the loopback `DATABASE_URL` (explicit
     * export wins, `.env` is the fallback) and refuses non-loopback targets
     * before any suite can capture an empty string at import time. Without
     * the flag it does nothing, so unit-only runs are untouched.
     */
    setupFiles: ["./vitest.setup.ts"],
    /**
     * The DB-gated suites all share ONE disposable database, and
     * `route.integration.test.ts` deliberately renames the live `resources`
     * table to drive the storage-rollback path. Running files in parallel
     * therefore makes an unrelated suite read a table that is momentarily
     * absent — a flaky harness, not a product fault. Serialising the files
     * when DB tests are enabled removes the overlap; the non-DB run keeps its
     * parallelism because nothing there touches a socket.
     */
    fileParallelism: process.env["RUN_DB_TESTS"] !== "1",
    testTimeout: process.env["RUN_DB_TESTS"] === "1" ? 20_000 : 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
