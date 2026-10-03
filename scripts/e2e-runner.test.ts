/**
 * Regression tests for the E2E runner.
 *
 * They exist because the runner's job is safety, not features. The previous
 * implementation renamed the owner's `.env` aside and wrote a stub, and a hard
 * kill during that window destroyed the configuration outright. These tests
 * pin the replacement properties: the file is never touched, its exact bytes
 * are re-verified afterwards, and a mutation — by anyone — fails the run.
 */

import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  E2E_PORT,
  LEGACY_BACKUP,
  LOCAL_DATABASE_URL,
  SANITISED_KEYS,
  buildIsolatedEnv,
  findLegacyArtifacts,
  fingerprintEnvFile,
  runE2e,
} from "./e2e-runner";

/** Deliberately fake — no real project ref or key ever appears in a test. */
const FAKE_ENV = [
  "DATABASE_URL=postgres://user:secret@example.invalid:5432/postgres",
  "NEXT_PUBLIC_SUPABASE_URL=https://fake-project.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fakefakefakefakefake",
  "APP_URL=https://owner.example.invalid",
  "LOG_LEVEL=debug",
  "",
].join("\n");

const roots: string[] = [];

function makeRoot(contents: string = FAKE_ENV): string {
  const dir = mkdtempSync(path.join(tmpdir(), "edushare-e2e-"));
  roots.push(dir);
  if (contents !== "") writeFileSync(path.join(dir, ".env"), contents, "utf8");
  return dir;
}

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A `spawn` stand-in that records its options and resolves to a fixed outcome. */
function fakeSpawn(
  options: { code?: number; signal?: NodeJS.Signals | null; throw?: boolean },
  observed: { env?: NodeJS.ProcessEnv | undefined; spawned?: boolean | undefined },
): typeof import("node:child_process").spawn {
  const impl = ((
    _command: string,
    _args: readonly string[],
    spawnOptions: { env?: NodeJS.ProcessEnv },
  ) => {
    if (options.throw === true) throw new Error("spawn ENOENT");
    observed.env = spawnOptions.env;
    observed.spawned = true;
    const emitter = new EventEmitter() as EventEmitter & {
      on: EventEmitter["on"];
    };
    queueMicrotask(() => {
      // Node's `close` callback is (code, signal).
      emitter.emit("close", options.code ?? 0, options.signal ?? null);
    });
    return emitter;
  }) as unknown as typeof import("node:child_process").spawn;
  return impl;
}

const noPortClash = () => Promise.resolve(false);

describe("buildIsolatedEnv", () => {
  it("blanks Supabase rather than unsetting it", () => {
    const env = buildIsolatedEnv({
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://real.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_real",
    });

    // Unsetting would let Next fall through to `.env`; blanking blocks it.
    expect(env["NEXT_PUBLIC_SUPABASE_URL"]).toBe("");
    expect(env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]).toBe("");
    expect(SANITISED_KEYS).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(Object.hasOwn(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBe(true);
  });

  it("forces a loopback database and the development adapters", () => {
    const env = buildIsolatedEnv({ DATABASE_URL: "postgres://h:1@db.host/x" });
    expect(env["DATABASE_URL"]).toBe(LOCAL_DATABASE_URL);
    expect(env["DATABASE_URL"]).toContain("127.0.0.1");
    expect(env["EDU_SHARE_DEV_AUTH"]).toBe("1");
    expect(env["EDU_SHARE_LOCAL_STORAGE"]).toBe("1");
    expect(env["APP_URL"]).toBe(`http://127.0.0.1:${E2E_PORT}`);
  });

  it("carries no hosted credential of its own", () => {
    const env = buildIsolatedEnv({});
    const rendered = JSON.stringify(env);
    expect(rendered).not.toContain("sb_publishable");
    expect(rendered).not.toContain("supabase.co");
  });
});

describe("fingerprintEnvFile", () => {
  it("returns null when no .env exists", () => {
    expect(fingerprintEnvFile(makeRoot(""))).toBeNull();
  });

  it("is stable and does not echo contents", () => {
    const root = makeRoot();
    const first = fingerprintEnvFile(root);
    const second = fingerprintEnvFile(root);
    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toContain("secret");
  });

  it("changes when the file changes", () => {
    const root = makeRoot();
    const before = fingerprintEnvFile(root);
    writeFileSync(path.join(root, ".env"), FAKE_ENV.replace("debug", "info"), "utf8");
    expect(fingerprintEnvFile(root)).not.toBe(before);
  });
});

describe("runE2e", () => {
  it("returns 0 on success without touching .env or writing a backup", async () => {
    const root = makeRoot();
    const observed: { spawned?: boolean } = {};
    const before = readFileSync(path.join(root, ".env"), "utf8");

    const code = await runE2e({
      root,
      argv: [],
      spawnImpl: fakeSpawn({ code: 0 }, observed),
      portInUseImpl: noPortClash,
    });

    expect(code).toBe(0);
    expect(observed.spawned).toBe(true);
    expect(readFileSync(path.join(root, ".env"), "utf8")).toBe(before);
    expect(existsSync(path.join(root, LEGACY_BACKUP))).toBe(false);
    expect(findLegacyArtifacts(root).backup).toBeNull();
  });

  it("propagates the suite's exact nonzero exit code", async () => {
    const root = makeRoot();
    const observed: { spawned?: boolean } = {};

    const code = await runE2e({
      root,
      argv: [],
      spawnImpl: fakeSpawn({ code: 3 }, observed),
      portInUseImpl: noPortClash,
    });

    expect(code).toBe(3);
    expect(readFileSync(path.join(root, ".env"), "utf8")).toBe(FAKE_ENV);
  });

  it("hands the child an isolated environment", async () => {
    const root = makeRoot();
    const observed: { env?: NodeJS.ProcessEnv; spawned?: boolean } = {};

    await runE2e({
      root,
      argv: [],
      spawnImpl: fakeSpawn({ code: 0 }, observed),
      portInUseImpl: noPortClash,
    });

    expect(observed.env?.["NEXT_PUBLIC_SUPABASE_URL"]).toBe("");
    expect(observed.env?.["NEXT_PUBLIC_SUPABASE_ANON_KEY"]).toBe("");
    expect(observed.env?.["DATABASE_URL"]).toBe(LOCAL_DATABASE_URL);
    expect(observed.env?.["EDU_SHARE_DEV_AUTH"]).toBe("1");
  });

  it("maps a spawn failure to a nonzero exit", async () => {
    const root = makeRoot();
    const observed: { spawned?: boolean } = {};

    const code = await runE2e({
      root,
      argv: [],
      spawnImpl: fakeSpawn({ throw: true }, observed),
      portInUseImpl: noPortClash,
    });

    expect(code).not.toBe(0);
    expect(readFileSync(path.join(root, ".env"), "utf8")).toBe(FAKE_ENV);
  });

  it("refuses a concurrent run instead of sharing a server", async () => {
    const root = makeRoot();
    const observed: { spawned?: boolean } = {};

    const code = await runE2e({
      root,
      argv: [],
      spawnImpl: fakeSpawn({ code: 0 }, observed),
      portInUseImpl: () => Promise.resolve(true),
    });

    expect(code).toBe(1);
    // A second run must fail before it starts, never race the first one.
    expect(observed.spawned).toBeUndefined();
    expect(readFileSync(path.join(root, ".env"), "utf8")).toBe(FAKE_ENV);
  });

  it("stops on a legacy backup rather than moving configuration files", async () => {
    const root = makeRoot();
    writeFileSync(path.join(root, LEGACY_BACKUP), "previous configuration", "utf8");
    const observed: { spawned?: boolean } = {};

    const code = await runE2e({
      root,
      argv: [],
      spawnImpl: fakeSpawn({ code: 0 }, observed),
      portInUseImpl: noPortClash,
    });

    expect(code).toBe(1);
    expect(observed.spawned).toBeUndefined();
    // Reported, not silently renamed, deleted, or restored.
    expect(existsSync(path.join(root, LEGACY_BACKUP))).toBe(true);
    expect(existsSync(path.join(root, ".env"))).toBe(true);
  });

  it("fails when .env changes during the run", async () => {
    const root = makeRoot();
    const observed: { spawned?: boolean } = {};

    const spawnImpl = ((_c: string, _a: readonly string[]) => {
      observed.spawned = true;
      const emitter = new EventEmitter() as EventEmitter & {
        on: EventEmitter["on"];
      };
      queueMicrotask(() => {
        // Something other than the runner rewrites configuration mid-run.
        writeFileSync(path.join(root, ".env"), "DATABASE_URL=corrupted\n", "utf8");
        emitter.emit("close", null, 0);
      });
      return emitter;
    }) as unknown as typeof import("node:child_process").spawn;

    const code = await runE2e({
      root,
      argv: [],
      spawnImpl,
      portInUseImpl: noPortClash,
    });

    expect(observed.spawned).toBe(true);
    expect(code).toBe(1);
  });
});
