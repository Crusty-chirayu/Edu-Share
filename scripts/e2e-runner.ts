/**
 * E2E runner internals — the browser suite must run against a provably
 * local-only server, without ever touching the owner's `.env`.
 *
 * ## Why isolation is required
 *
 * The suite needs the development identity adapter and the local filesystem
 * storage provider. Those are reachable only when Supabase is *not*
 * configured, because `getSession()` and the auth endpoints give Supabase
 * strict priority by design — reversing that would reintroduce the identity
 * defect migration 0004 closed.
 *
 * This repository's `.env` carries real hosted credentials, so an
 * un-isolated run would perform a genuine hosted Auth exchange against the
 * owner's project.
 *
 * ## How isolation works now (and why it replaced renaming `.env`)
 *
 * A previous version of the runner renamed `.env` aside, wrote a stub in its
 * place, and renamed it back. That was removed because it could lose the
 * owner's configuration on a hard kill: the restore step only runs on code
 * paths that get to execute, so `taskkill /F` or power loss left the stub
 * behind and the real file hidden under another name.
 *
 * Isolation is now done purely through the child process environment, which
 * was verified experimentally on this machine rather than assumed:
 *
 *  1. `playwright.config.ts` passes the sanitised values as `webServer.env`,
 *     and Playwright merges it **on top of** `process.env`
 *     (`{ ...DEFAULT_ENVIRONMENT_VARIABLES, ...process.env, ...this._options.env }`
 *     in `playwright/lib/plugins/webServerPlugin.js`).
 *  2. Next.js fills a variable from `.env` **only when it is not already
 *     defined**, so an explicitly empty string — which *is* defined — blocks
 *     the file's value from being applied.
 *
 * Measured on this repository with real credentials present in `.env`: a plain
 * `npm run dev` answered sign-in with HTTP 400 (Supabase path live), while the
 * same tree under the sanitised environment answered HTTP 200 with
 * `"mode": "development"` (adapter path live). Empty child values therefore
 * survive `cmd.exe` → `npm` → `node` → Next, which is the whole mechanism.
 *
 * Two consequences worth stating plainly:
 *
 *  - The runner never reads, writes, renames, or deletes `.env`. It can
 *    neither leak nor damage it.
 *  - It still *verifies* non-mutation by fingerprinting the file before and
 *    after, so a regression that reintroduces a write fails the run instead of
 *    silently corrupting configuration.
 *
 * A non-empty sentinel would not work: `isSupabaseAuthConfigured()` asks only
 * whether both values are non-empty, so any placeholder would keep the hosted
 * code path alive. The values must be empty, not merely fake.
 */

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

/**
 * Port the disposable test server binds.
 *
 * Overridable with `E2E_PORT` because this host may already have another
 * project's dev server on 3000. The suite refuses to *reuse* an unrelated
 * server — correctly, since that would test the wrong configuration — so the
 * honest response to a busy port is to move, not to reconnect. Defaults to 3000
 * so CI and a normal local run are unchanged.
 */
export const E2E_PORT = Number(process.env["E2E_PORT"] ?? 3000);

/** Loopback database; the runner refuses to hand a hosted URL to the suite. */
export const LOCAL_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/edushare";

/**
 * Keys forced into the child environment. `NEXT_PUBLIC_SUPABASE_*` are blanked
 * rather than deleted: an *absent* variable is `undefined` and Next would then
 * fall through to `.env`, re-enabling the hosted project.
 */
export const SANITISED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "DATABASE_URL",
  "APP_URL",
  "NODE_ENV",
  "EDU_SHARE_DEV_AUTH",
  "EDU_SHARE_LOCAL_STORAGE",
] as const;

/**
 * Builds the child environment: the caller's environment with the test
 * configuration forced on top. Supabase is set to the empty string — defined,
 * but unconfigured.
 */
export function buildIsolatedEnv(
  base: Readonly<Record<string, string | undefined>> = process.env,
): NodeJS.ProcessEnv {
  return {
    ...base,
    DATABASE_URL: LOCAL_DATABASE_URL,
    APP_URL: `http://127.0.0.1:${E2E_PORT}`,
    NODE_ENV: "development",
    EDU_SHARE_DEV_AUTH: "1",
    EDU_SHARE_LOCAL_STORAGE: "1",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_STORAGE_BUCKET: "",
  };
}

/**
 * SHA-256 of the owner's `.env`, or `null` when there is none. Only the digest
 * is ever produced, so the file's contents cannot leak through a log line.
 */
export function fingerprintEnvFile(root: string): string | null {
  const file = path.join(root, ".env");
  if (!existsSync(file)) return null;
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Paths the retired rename-based runner used to leave behind. */
export const LEGACY_BACKUP = ".env.saved-by-test-e2e";
export const LEGACY_STUB = ".env.stub-leftover";

export interface LegacyArtifacts {
  /** The owner's configuration, moved aside by an interrupted old run. */
  backup: string | null;
  /** A stub that was left in place of a real `.env`. */
  stub: string | null;
}

export function findLegacyArtifacts(root: string): LegacyArtifacts {
  const backup = path.join(root, LEGACY_BACKUP);
  const stub = path.join(root, LEGACY_STUB);
  return {
    backup: existsSync(backup) ? backup : null,
    stub: existsSync(stub) ? stub : null,
  };
}

/** Resolves true when something is already listening on the dev port. */
export async function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(true));
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port, "127.0.0.1");
  });
}

export interface RunnerOptions {
  /** Repository root; overridable so tests can point at a temp directory. */
  root: string;
  /** Extra arguments handed to `playwright test`. */
  argv: readonly string[];
  /** Injected for tests; defaults to `node:child_process`'s `spawn`. */
  spawnImpl?: typeof spawn;
  /** Injected for tests so concurrency does not need a real socket. */
  portInUseImpl?: (port: number) => Promise<boolean>;
}

/**
 * Runs the browser suite and returns the exit code to propagate.
 *
 * It only fingerprints, spawns, and re-checks — never mutates configuration.
 */
export async function runE2e(options: RunnerOptions): Promise<number> {
  const { root, argv } = options;
  const spawnImpl = options.spawnImpl ?? spawn;
  const portInUseImpl = options.portInUseImpl ?? portInUse;

  const artifacts = findLegacyArtifacts(root);
  if (artifacts.backup) {
    return abort(
      `Found ${LEGACY_BACKUP} — a previous, retired version of this runner renamed\n` +
        "your .env aside and was killed before restoring it. Your configuration is in\n" +
        `${artifacts.backup}.\n` +
        "Restore it by hand (rename it back to .env), then re-run. This runner will not\n" +
        "move configuration files on your behalf.",
    );
  }

  if (await portInUseImpl(E2E_PORT)) {
    return abort(
      `Port ${E2E_PORT} is already in use. The suite starts its own dev server, and\n` +
        "reusing an unrelated one would test the wrong configuration. Stop it and re-run.",
    );
  }

  const before = fingerprintEnvFile(root);
  const code = await new Promise<number>((resolve) => {
    let child: ChildProcess;
    try {
      child = spawnImpl("npx", ["playwright", "test", ...argv], {
        cwd: root,
        stdio: "inherit",
        env: buildIsolatedEnv(),
        shell: process.platform === "win32",
      });
    } catch (error) {
      console.error("[test:e2e] failed to start the suite:", error);
      resolve(1);
      return;
    }
    child.on("error", (error) => {
      console.error("[test:e2e] suite process errored:", error);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });

  const after = fingerprintEnvFile(root);
  if (before !== after) {
    return abort(
      ".env changed while the suite was running.\n" +
        `  before: ${before ?? "<absent>"}\n` +
        `  after:  ${after ?? "<absent>"}` +
        "\nThe runner does not write configuration files, so something else did — or a\n" +
        "regression reintroduced a write. Treat the file as suspect until reviewed.",
    );
  }

  return code;
}

function abort(message: string): number {
  console.error(`\n[test:e2e] ${message}\n`);
  return 1;
}
