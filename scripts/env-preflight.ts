/**
 * `npm run env:preflight` — reports configuration health **without ever
 * printing a value**.
 *
 * The rule this script exists to enforce: only key names and status words ever
 * reach stdout. `.env` in this repository carries real hosted credentials, so
 * the failure mode being designed against is a helpful-looking diagnostic that
 * dumps an anon key into a CI log or a screen share.
 *
 * What it checks, using shape only:
 *
 *  - whether each expected key is present, explicitly empty, or missing;
 *  - that the two Supabase keys agree (both set or both absent — one set and
 *    one empty is the misconfiguration that silently half-works);
 *  - that the Supabase URL parses as a URL;
 *  - whether `DATABASE_URL` targets loopback or a hosted server, reported as a
 *    word rather than as a host, since the host carries the project ref;
 *  - that `.env` is ignored by git.
 *
 * Exit code is non-zero only for genuinely blocking problems, so it can gate a
 * build without flagging an intentionally Supabase-free local setup.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Status = "present" | "empty" | "missing";

const EXPECTED_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "APP_URL",
  "NODE_ENV",
  "LOG_LEVEL",
  "SUPABASE_STORAGE_BUCKET",
  "EDU_SHARE_DEV_AUTH",
  "EDU_SHARE_LOCAL_STORAGE",
] as const;

/**
 * Parses `KEY=value` lines. Deliberately naive: dotenv semantics are not the
 * point, and reading the file here must never execute anything from it.
 */
export function parseEnvKeys(contents: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    if (key === undefined) continue;
    map.set(key, (match[2] ?? "").trim());
  }
  return map;
}

function statusOf(map: Map<string, string>, key: string): Status {
  if (!map.has(key)) return "missing";
  return map.get(key) === "" ? "empty" : "present";
}

/**
 * A Supabase key is either a legacy three-segment JWT or a current
 * `sb_publishable_*` API key. Shape only — the value is never echoed.
 */
function looksLikeSupabaseKey(value: string): boolean {
  if (value.startsWith("sb_publishable_")) return true;
  return value.split(".").length === 3 && value.startsWith("eyJ");
}

export interface PreflightReport {
  lines: string[];
  blocking: string[];
}

export function buildReport(contents: string | null): PreflightReport {
  const lines: string[] = [];
  const blocking: string[] = [];
  const map = contents === null ? new Map<string, string>() : parseEnvKeys(contents);

  if (contents === null) {
    lines.push(".env                     MISSING   (copy .env.example to .env)");
    blocking.push(".env is absent, so local runtime configuration is undefined");
    return { lines, blocking };
  }

  for (const key of EXPECTED_KEYS) {
    const status = statusOf(map, key);
    lines.push(`${key.padEnd(24)} ${status.toUpperCase().padEnd(10)}`);
  }

  const extras = [...map.keys()].filter((k) => !(EXPECTED_KEYS as readonly string[]).includes(k));
  if (extras.length > 0) {
    lines.push("");
    lines.push("unrecognised keys (names only):");
    for (const key of extras.sort()) lines.push(`  - ${key}`);
  }

  lines.push("");
  const url = map.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  const key = map.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? "";

  if (url !== "" && key === "") {
    blocking.push("NEXT_PUBLIC_SUPABASE_URL is set but NEXT_PUBLIC_SUPABASE_ANON_KEY is empty");
  }
  if (key !== "" && url === "") {
    blocking.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is set but NEXT_PUBLIC_SUPABASE_URL is empty");
  }
  if (url !== "") {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        blocking.push("NEXT_PUBLIC_SUPABASE_URL is not an https URL");
      } else {
        lines.push("supabase URL          parses (https)");
      }
    } catch {
      blocking.push("NEXT_PUBLIC_SUPABASE_URL does not parse as a URL");
    }
  }
  if (key !== "") {
    if (looksLikeSupabaseKey(key)) {
      lines.push("supabase key          well-formed (shape only)");
    } else {
      blocking.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is neither a JWT nor a publishable key");
    }
  }

  const databaseUrl = map.get("DATABASE_URL") ?? "";
  if (databaseUrl !== "") {
    const isLoopback = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/i.test(databaseUrl);
    lines.push(
      `DATABASE_URL target   ${isLoopback ? "loopback" : "hosted — migrations and DB tests would hit a remote server"}`,
    );
    if (!isLoopback) {
      blocking.push(
        "DATABASE_URL does not point at loopback; run DB work against a local database first",
      );
    }
  }

  return { lines, blocking };
}

function main(): void {
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  const contents = existsSync(envPath) ? readFileSync(envPath, "utf8") : null;

  const { lines, blocking } = buildReport(contents);

  console.log("[env:preflight] configuration status (names and shapes only):\n");
  for (const line of lines) console.log(`  ${line}`);

  const gitignorePath = path.join(root, ".gitignore");
  const ignored = existsSync(gitignorePath) && /\.env/.test(readFileSync(gitignorePath, "utf8"));
  console.log("");
  console.log(`  .env git-ignored                 ${ignored ? "YES" : "NO — fix .gitignore"}`);
  if (!ignored) blocking.push(".env is not ignored by git");

  if (blocking.length > 0) {
    console.error("\n[env:preflight] blocking problems:");
    for (const problem of blocking) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("\n[env:preflight] no blocking problems.");
}

/**
 * Runs only when invoked as a script. `require.main === module` is not reliable
 * here: this file is loaded by tsx (CJS) and by Vitest (ESM) in the same
 * working tree, so the check is made against the entry path instead.
 */
const invokedDirectly = (process.argv[1] ?? "").includes("env-preflight");
if (invokedDirectly) main();
