import { z } from "zod";

/**
 * M3 environment schema — fail-fast validation.
 *
 * Every required variable is validated at boot. The app refuses to start
 * with a clear, field-level error instead of failing later with a stack trace.
 * No defaults for credentials: an absent DATABASE_URL is an error, not localhost magic.
 */

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (e.g. postgres://postgres:postgres@127.0.0.1:5432/edushare)")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres:// or postgresql:// connection string",
    ),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .refine((v) => v === "" || /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v), {
      message: "NEXT_PUBLIC_SUPABASE_URL must be empty or a https://<ref>.supabase.co URL",
    })
    .optional()
    .default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  APP_URL: z.string().url("APP_URL must be a valid URL (e.g. http://localhost:3000)"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/** Parse + validate `process.env`. Throws a human-readable Error on failure. */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: validate an arbitrary record without touching process.env. */
export function validateEnv(input: Record<string, unknown>): AppEnv {
  return envSchema.parse(input);
}

/** Test-only: clear the cached env so tests can re-validate. */
export function __resetEnvCache(): void {
  cached = null;
}

/**
 * Test-only: replace `process.env` entries, then clear the cache.
 * Never reads or writes `.env` files; callers pass literal values.
 * Returns a restore function for the keys it touched.
 */
export function __setTestEnv(values: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    if (!previous.has(key)) previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  __resetEnvCache();
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    __resetEnvCache();
  };
}
