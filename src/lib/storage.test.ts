import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createStorageKey,
  getStorage,
  isLocalStorageEnabled,
  isSupabaseStorageConfigured,
  LocalStorageProvider,
  storageUnavailableReason,
} from "@/lib/storage";
import { __setTestEnv } from "@/lib/env";

const OWNER = "11111111-1111-4111-8111-111111111111";
const bytes = (text: string) => new TextEncoder().encode(text);

describe("createStorageKey", () => {
  it("is server-shaped, opaque and unique", () => {
    const a = createStorageKey(OWNER, "pdf");
    const b = createStorageKey(OWNER, "pdf");
    expect(a).toMatch(new RegExp(`^resources/${OWNER}/[0-9a-f-]{36}\\.pdf$`));
    expect(a).not.toBe(b);
  });

  it("strips anything that is not an extension", () => {
    // The extension is display-only; a hostile one can never become path segments.
    const key = createStorageKey(OWNER, "../../etc/passwd");
    expect(key.startsWith(`resources/${OWNER}/`)).toBe(true);
    expect(key).not.toContain("..");
    expect(key).not.toContain("/etc/");
    expect(key.split("/")).toHaveLength(3);
  });
});

describe("LocalStorageProvider", () => {
  let root = "";
  let restoreEnv: () => void = () => {};
  let storage: LocalStorageProvider;

  beforeEach(async () => {
    // A real temporary directory: the provider is the filesystem, so the test uses
    // the filesystem rather than a mock of it.
    root = await mkdtemp(path.join(tmpdir(), "edu-share-storage-"));
    storage = new LocalStorageProvider(root);
    restoreEnv = __setTestEnv({
      DATABASE_URL: "postgres://user:pass@127.0.0.1:5432/edushare",
      APP_URL: "http://127.0.0.1:3000",
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_STORAGE_BUCKET: "",
      EDU_SHARE_DEV_AUTH: "0",
      EDU_SHARE_LOCAL_STORAGE: "1",
    });
  });

  afterEach(async () => {
    restoreEnv();
    await rm(root, { recursive: true, force: true });
  });

  it("round-trips a file's bytes unchanged", async () => {
    const key = createStorageKey(OWNER, "pdf");
    const payload = bytes("%PDF-1.7\nacceptance fixture\n");
    await storage.put(key, payload);

    const target = await storage.download(key, "notes.pdf", "application/pdf");
    expect(target?.kind).toBe("stream");
    if (target?.kind !== "stream") throw new Error("expected a stream");
    expect(target.bytes.byteLength).toBe(payload.byteLength);
    expect(Buffer.from(target.bytes).toString()).toBe("%PDF-1.7\nacceptance fixture\n");
    expect(target.contentType).toBe("application/pdf");
  });

  it("returns null for an object that does not exist", async () => {
    const missing = createStorageKey(OWNER, "pdf");
    expect(await storage.download(missing, "gone.pdf", "application/pdf")).toBeNull();
  });

  it("removes an object, and removing a missing one is not an error", async () => {
    const key = createStorageKey(OWNER, "pdf");
    await storage.put(key, bytes("x"));
    await storage.remove(key);
    expect(await storage.download(key, "x.pdf", "application/pdf")).toBeNull();
    await expect(storage.remove(key)).resolves.toBeUndefined();
  });

  it("refuses any key that would escape the storage root", async () => {
    // Server-generated keys make this unreachable in normal operation; the guard is
    // what keeps a future bug from turning it into a path traversal.
    for (const key of [
      "../escape.pdf",
      "../../escape.pdf",
      "resources/../../escape.pdf",
      "/absolute.pdf",
      "windows\\style.pdf",
      "",
    ]) {
      await expect(storage.put(key, bytes("x"))).rejects.toThrow();
      expect(await storage.download(key, "x.pdf", "application/pdf")).toBeNull();
    }
    // Nothing escaped: the parent directory is untouched.
    await expect(readFile(path.join(path.dirname(root), "escape.pdf"), "utf8")).rejects.toThrow();
  });

  it("cannot be enabled in production, and says so", () => {
    const productionEnv = __setTestEnv({
      NODE_ENV: "production",
      EDU_SHARE_LOCAL_STORAGE: "1",
    });
    // The validator refuses to produce the configuration at all, and the helper
    // refuses to return true even if it somehow exists.
    expect(isLocalStorageEnabled()).toBe(false);
    expect(() => storageUnavailableReason()).not.toThrow();
    productionEnv();
  });

  it("is selected when enabled, and refuses to fall back when it is not", () => {
    const withLocal = getStorage(
      new (class {
        get(): string | undefined {
          return undefined;
        }
        set(): void {}
        remove(): void {}
      })(),
    );
    expect(withLocal?.kind).toBe("local");

    const withoutLocal = __setTestEnv({ EDU_SHARE_LOCAL_STORAGE: "0" });
    expect(getStorage(undefined as never)).toBeNull();
    // No silent fallback: an upload attempt is refused with an explanation.
    expect(storageUnavailableReason()).toBeTruthy();
    withoutLocal();
  });

  it("reports Supabase storage as unconfigured when no bucket is named", () => {
    expect(isSupabaseStorageConfigured()).toBe(false);
  });
});

describe("storage keys are never client-derived", () => {
  it("does not embed the display name", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "edu-share-storage-"));
    try {
      const storage = new LocalStorageProvider(root);
      const key = createStorageKey(OWNER, "pdf");
      expect(key).not.toContain(" ");
      await storage.put(key, bytes("x"));
      const onDisk = await readFile(path.join(root, key), "utf8");
      expect(onDisk).toBe("x");
      await writeFile(path.join(root, key), "x");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
