import { z } from "zod";

/**
 * M3 environment schema — fail-fast validation.
 *
 * Every required variable is validated at boot. The app refuses to start
 * with a clear, field-level error instead of failing later with a stack trace.
 * No defaults for credentials: an absent DATABASE_URL is an error, not localhost magic.
 */

const baseEnvSchema = z.object({
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
  /** Private storage bucket for uploaded resources. Empty means storage is unconfigured. */
  SUPABASE_STORAGE_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$|^$/, {
      message: "SUPABASE_STORAGE_BUCKET must be empty or a lowercase Supabase bucket name",
    })
    .optional()
    .default(""),
  /**
   * Development-only identity provider ("1" to enable). It exists so the product
   * can be exercised before Supabase credentials exist, and it is deliberately
   * impossible to turn on in production — see the `superRefine` below.
   */
  EDU_SHARE_DEV_AUTH: z.enum(["0", "1"]).optional().default("0"),
  /**
   * Development-only local filesystem storage adapter ("1" to enable). Never
   * available in production, and never a silent fallback: when this is off and
   * Supabase Storage is unconfigured, uploads are refused with an explanation.
   */
  EDU_SHARE_LOCAL_STORAGE: z.enum(["0", "1"]).optional().default("0"),
  APP_URL: z.string().url("APP_URL must be a valid URL (e.g. http://localhost:3000)"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

/**
 * Cross-field rules that must fail closed.
 *
 * `EDU_SHARE_DEV_AUTH=1` in production is a configuration error, not a warning: the
 * development adapter creates sessions without an identity provider, so allowing it
 * to boot in production would silently authenticate every caller. The process
 * refuses to start instead.
 */
function refineEnv(value: z.infer<typeof baseEnvSchema>, ctx: z.RefinementCtx): void {
  if (value.NODE_ENV === "production" && value.EDU_SHARE_DEV_AUTH === "1") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["EDU_SHARE_DEV_AUTH"],
      message:
        "EDU_SHARE_DEV_AUTH is a development-only identity adapter and must not be enabled when NODE_ENV=production",
    });
  }
  if (value.EDU_SHARE_DEV_AUTH === "1" && value.NODE_ENV === "test") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["EDU_SHARE_DEV_AUTH"],
      message:
        "leave EDU_SHARE_DEV_AUTH unset under NODE_ENV=test; tests configure identity explicitly",
    });
  }
  if (value.NODE_ENV === "production" && value.EDU_SHARE_LOCAL_STORAGE === "1") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["EDU_SHARE_LOCAL_STORAGE"],
      message:
        "EDU_SHARE_LOCAL_STORAGE writes uploads to the local filesystem and must not be enabled when NODE_ENV=production",
    });
  }
}

const envSchema = baseEnvSchema.superRefine(refineEnv);

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
