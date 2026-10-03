import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ChunkedCookieStorage, type SyncCookieStore } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Storage abstraction for uploaded resources.
 *
 * ## The contract
 *
 * A provider stores an opaque key and can produce a **delivery decision** for it.
 * Authorisation is *not* a provider concern: the caller must have already decided
 * that this requester may read this resource (ownership, visibility, sign-in). The
 * provider's job is to hand back either a short-lived signed URL or the bytes.
 *
 * ## Keys
 *
 * Keys are generated server-side by `createStorageKey()` and never derived from a
 * file name, a path, or anything a client sent. `resources.file_key` stores the key
 * only â€” never a URL, because a URL in the database is not an access control.
 *
 * ## Providers
 *
 * | Provider | When | Notes |
 * | --- | --- | --- |
 * | `supabase` | `SUPABASE_STORAGE_BUCKET` + Supabase URL/anon key are set | Private bucket; uploads and signed URLs are made **as the signed-in user**, so bucket policies apply. No service-role key is used. |
 * | `local` | `EDU_SHARE_LOCAL_STORAGE=1` and `NODE_ENV` is not `production` | Development only. Writes under `.local/storage` (git-ignored). Survives a dev-server restart because it is a real file, but it is **not** durable storage and is not shared between machines. |
 *
 * There is no third option and no silent fallback: an upload attempted with no
 * provider configured is refused with an explanation rather than stored somewhere
 * surprising.
 */

export type DownloadTarget =
  | { kind: "redirect"; url: string; expiresInSeconds: number }
  | { kind: "stream"; bytes: Uint8Array<ArrayBuffer>; contentType: string; fileName: string };

export interface StorageProvider {
  readonly kind: "supabase" | "local";
  /** Human-readable, safe to render: tells the operator where files are going. */
  readonly description: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  download(key: string, fileName: string, contentType: string): Promise<DownloadTarget | null>;
  remove(key: string): Promise<void>;
}

/** Signed-URL lifetime for the Supabase provider. Short by design. */
const SIGNED_URL_TTL_SECONDS = 60;

/** Opaque, server-generated, collision-free. The extension is kept only for display. */
export function createStorageKey(ownerId: string, extension: string): string {
  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  const suffix = safeExtension.length > 0 ? `.${safeExtension}` : "";
  return `resources/${ownerId}/${crypto.randomUUID()}${suffix}`;
}

/* ------------------------------------------------------------------ *
 * Supabase Storage (intended production provider)
 * ------------------------------------------------------------------ */

export class SupabaseStorageProvider implements StorageProvider {
  readonly kind = "supabase" as const;
  readonly description: string;
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(client: SupabaseClient, bucket: string) {
    this.client = client;
    this.bucket = bucket;
    this.description = `Supabase Storage bucket "${bucket}" (private)`;
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).upload(key, bytes, {
      contentType,
      upsert: false,
    });
    if (error) {
      logger.warn("storage upload failed", { provider: "supabase", reason: error.message });
      throw new Error("Upload to storage failed.");
    }
  }

  /**
   * A short-lived, single-object signed URL. This is a credential, not an
   * authorisation: the caller has already decided the requester may have the file.
   */
  async download(key: string): Promise<DownloadTarget | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      logger.warn("storage signed URL failed", { provider: "supabase", reason: error?.message });
      return null;
    }
    return { kind: "redirect", url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      // Compensating cleanup must never mask the original failure with its own.
      logger.warn("storage delete failed", { provider: "supabase", reason: error.message });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Local filesystem storage (development only)
 * ------------------------------------------------------------------ */

/** Root of the development store. `.local/` is already git-ignored. */
const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".local", "storage");

export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;
  readonly description: string;
  private readonly root: string;

  constructor(root: string = LOCAL_STORAGE_ROOT) {
    this.root = root;
    this.description = `development filesystem store at ${path.relative(process.cwd(), root) || root}`;
  }

  /**
   * Resolves a key inside the root, refusing anything that escapes it.
   *
   * Keys are server-generated, but this guard means a future bug that lets a
   * caller-supplied string reach a path still cannot read or write outside the
   * store â€” the roadmap's "no user-supplied string reaches a filesystem path" rule.
   */
  private resolve(key: string): string {
    if (key.length === 0 || key.startsWith("/") || key.includes("\\")) {
      throw new Error("Invalid storage key");
    }
    const resolved = path.resolve(this.root, key);
    const prefix = path.resolve(this.root) + path.sep;
    if (!resolved.startsWith(prefix)) {
      throw new Error("Storage key escapes the storage root");
    }
    return resolved;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    logger.info("local storage write", { key });
  }

  async download(
    key: string,
    fileName: string,
    contentType: string,
  ): Promise<DownloadTarget | null> {
    try {
      const bytes = await readFile(this.resolve(key));
      return { kind: "stream", bytes: new Uint8Array(bytes), contentType, fileName };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT")
        logger.warn("local storage delete failed", { key, code: String(code) });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Provider selection
 * ------------------------------------------------------------------ */

export function isLocalStorageEnabled(): boolean {
  try {
    const env = getEnv();
    if (env.NODE_ENV === "production") return false;
    return env.EDU_SHARE_LOCAL_STORAGE === "1";
  } catch {
    return false;
  }
}

function supabaseBucket(): string {
  try {
    return getEnv().SUPABASE_STORAGE_BUCKET;
  } catch {
    return "";
  }
}

export function isSupabaseStorageConfigured(): boolean {
  try {
    const env = getEnv();
    return (
      env.SUPABASE_STORAGE_BUCKET !== "" &&
      env.NEXT_PUBLIC_SUPABASE_URL !== "" &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== ""
    );
  } catch {
    return false;
  }
}

/**
 * Selects the provider. `store` is only needed for Supabase Storage, where uploads
 * and signed URLs are issued as the signed-in user so that bucket policies apply.
 */
export function getStorage(store?: SyncCookieStore): StorageProvider | null {
  if (isSupabaseStorageConfigured() && store) {
    const env = getEnv();
    const client = createStorageSupabaseClient(store);
    if (client) return new SupabaseStorageProvider(client, env.SUPABASE_STORAGE_BUCKET);
  }
  if (isLocalStorageEnabled()) return new LocalStorageProvider();
  return null;
}

/**
 * Why uploads are unavailable, phrased for a human. `null` when storage is ready.
 * Used by the UI so the upload page explains the missing configuration instead of
 * failing opaquely.
 */
export function storageUnavailableReason(): string | null {
  if (isSupabaseStorageConfigured()) return null;
  if (isLocalStorageEnabled()) return null;
  if (supabaseBucket() === "") {
    return (
      "Storage is not configured. Set SUPABASE_STORAGE_BUCKET plus the Supabase URL and anon key " +
      "for production storage, or EDU_SHARE_LOCAL_STORAGE=1 for the development filesystem store."
    );
  }
  return "Storage is partially configured: set the Supabase URL and anon key as well as the bucket name.";
}

/** Built here rather than imported from the auth module to keep storage self-contained. */
function createStorageSupabaseClient(store: SyncCookieStore): SupabaseClient | null {
  const env = getEnv();
  if (env.NEXT_PUBLIC_SUPABASE_URL === "" || env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "") return null;
  const storage = new ChunkedCookieStorage(store);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => storage.getItem(key),
        setItem: (key: string, value: string) => storage.setItem(key, value),
        removeItem: (key: string) => storage.removeItem(key),
      },
    },
  });
}
