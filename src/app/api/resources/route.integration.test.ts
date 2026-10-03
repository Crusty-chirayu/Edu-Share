/**
 * SG-3 acceptance: the upload and download **routes**, end to end.
 *
 * Nothing here is stubbed except the identity boundary. `vi.mock` replaces
 * `getSession` / `requireSession` with a fixed session, because deriving an identity
 * from cookies is the one thing a route test cannot and should not reproduce. Every
 * other moving part is real:
 *
 *  - a real PostgreSQL (loopback, disposable),
 *  - the real `withIdentity`, the real query builders, the real RLS policies,
 *  - the real `LocalStorageProvider` writing real files under `.local/storage`.
 *
 * That combination is what makes the compensating-cleanup claims checkable: a
 * failure has to actually fail.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import postgres, { type Sql } from "postgres";
import { isLoopbackHost } from "@/db/guard";
import { __closeDb } from "@/db/client";
import { __setTestEnv } from "@/lib/env";
import { LocalStorageProvider } from "@/lib/storage";

const OWNER = "44444444-0000-4000-8000-000000000001";
const OTHER = "55555555-0000-4000-8000-000000000002";
const INSTITUTION = "88888888-0000-4000-8000-00000000000c";
const SUBJECT = "99999999-0000-4000-8000-0000000000d1";
const DB_URL = process.env["DATABASE_URL"] ?? "";

/** Swapped per test to exercise the "different user" cases. */
let currentIdentity: string | null = OWNER;

vi.mock("@/lib/auth/session", () => ({
  getSession: async () =>
    currentIdentity === null
      ? null
      : {
          profileId: currentIdentity,
          authUserId: "00000000-0000-4000-8000-000000000000",
          displayName: "acc-tester",
          role: "student" as const,
          mode: "development" as const,
          isDevelopmentIdentity: true,
        },
  requireSession: async () => {
    if (currentIdentity === null) {
      const { AppError } = await import("@/lib/errors");
      throw AppError.unauthorized();
    }
    return {
      profileId: currentIdentity,
      authUserId: "00000000-0000-4000-8000-000000000000",
      displayName: "acc-tester",
      role: "student" as const,
      mode: "development" as const,
      isDevelopmentIdentity: true,
    };
  },
  requireProfileId: async () => {
    if (currentIdentity === null) {
      const { AppError } = await import("@/lib/errors");
      throw AppError.unauthorized();
    }
    return currentIdentity;
  },
}));

const { POST } = await import("@/app/api/resources/route");
const { PATCH, DELETE } = await import("@/app/api/resources/[id]/route");
const { GET: DOWNLOAD } = await import("@/app/api/resources/[id]/download/route");

const enabled = process.env["RUN_DB_TESTS"] === "1";
const PDF = new TextEncoder().encode("%PDF-1.7\nacceptance fixture\n");

function uploadRequest(file: File, extra: Record<string, string> = {}): NextRequest {
  const form = new FormData();
  form.set("title", extra.title ?? "rte route fixture");
  form.set("description", extra.description ?? "");
  form.set("subjectId", extra.subjectId ?? SUBJECT);
  form.set("visibility", extra.visibility ?? "public");
  form.set("file", file);
  return new NextRequest("http://127.0.0.1:3000/api/resources", {
    method: "POST",
    body: form,
  });
}

describe.skipIf(!enabled)("upload and download routes (real database and files)", () => {
  let admin!: Sql;
  let restoreEnv: () => void = () => {};
  let storage!: LocalStorageProvider;
  const created: string[] = [];

  beforeAll(async () => {
    if (DB_URL.trim().length === 0) {
      throw new Error(
        "Refusing route acceptance: DATABASE_URL is missing or empty. " +
          "Run with RUN_DB_TESTS=1 and an exported loopback DSN (see README testing section).",
      );
    }
    if (!isLoopbackHost(new URL(DB_URL).hostname)) {
      throw new Error("Refusing route acceptance against a non-loopback database.");
    }
    restoreEnv = __setTestEnv({
      DATABASE_URL: DB_URL,
      DIRECT_URL: DB_URL,
      APP_URL: "http://127.0.0.1:3000",
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_STORAGE_BUCKET: "",
      EDU_SHARE_DEV_AUTH: "0",
      EDU_SHARE_LOCAL_STORAGE: "1",
    });
    admin = postgres(DB_URL, { max: 1, prepare: false });
    storage = new LocalStorageProvider();
    await clearFixtures();
    await admin.unsafe(
      `INSERT INTO institutions (id, name) VALUES ('${INSTITUTION}', 'rte-institution')`,
    );
    await admin.unsafe(
      `INSERT INTO subjects (id, institution_id, name) VALUES ('${SUBJECT}', '${INSTITUTION}', 'rte-subject')`,
    );
    await admin.unsafe(
      `INSERT INTO profiles (id, display_name) VALUES ('${OWNER}', 'rte-owner'), ('${OTHER}', 'rte-other')`,
    );
  });

  afterAll(async () => {
    // `admin`/`storage` are definitely-assigned (`!`): when `beforeAll`
    // throws they stay unassigned, so teardown returns early and the original
    // setup error — not a follow-on `Cannot read properties of undefined` —
    // is reported.
    if (admin === undefined || storage === undefined) return;
    try {
      // Keys first: once the rows are gone there is nothing left to look up.
      const rows = await admin.unsafe(
        `SELECT file_key FROM resources WHERE file_key LIKE 'resources/${OWNER}/%'`,
      );
      for (let index = 0; index < rows.length; index += 1) {
        await storage.remove(one<{ file_key: string }>(rows, index).file_key);
      }
      await clearFixtures();
    } finally {
      await admin.end({ timeout: 5 });
      await __closeDb();
      restoreEnv();
    }
  });

  beforeEach(() => {
    currentIdentity = OWNER;
  });

  async function clearFixtures(): Promise<void> {
    await admin.unsafe(
      `DELETE FROM bookmarks WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'rte %')`,
    );
    await admin.unsafe(`DELETE FROM resources WHERE title LIKE 'rte %'`);
    await admin.unsafe(`DELETE FROM profiles WHERE id IN ('${OWNER}', '${OTHER}')`);
    await admin.unsafe(`DELETE FROM subjects WHERE id = '${SUBJECT}'`);
    await admin.unsafe(`DELETE FROM institutions WHERE id = '${INSTITUTION}'`);
  }

  async function storedFiles(): Promise<string[]> {
    const rows = await admin.unsafe(
      `SELECT file_key FROM resources WHERE title LIKE 'rte %' AND file_key IS NOT NULL`,
    );
    return rows.map((_, index) => one<{ file_key: string }>(rows, index).file_key);
  }

  /** The key of one specific resource, so a test never asserts about another row. */
  async function keyOf(id: string): Promise<string> {
    const rows = await admin.unsafe(`SELECT file_key FROM resources WHERE id = '${id}'`);
    return String(one<{ file_key: string | null }>(rows).file_key);
  }

  it("stores a valid upload and creates the row", async () => {
    const response = await POST(
      uploadRequest(new File([PDF], "notes.pdf", { type: "application/pdf" })),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { resource: { id: string } };
    created.push(body.resource.id);

    // The object really exists, under a server-generated key.
    const key = await keyOf(body.resource.id);
    expect(key).toMatch(new RegExp(`^resources/${OWNER}/[0-9a-f-]{36}\\.pdf$`));
    const target = await storage.download(key, "notes.pdf", "application/pdf");
    expect(target?.kind).toBe("stream");
  });

  it("rejects an extension whose declared type lies, and stores nothing", async () => {
    const before = await storedFiles();
    const response = await POST(
      uploadRequest(new File([PDF], "notes.pdf", { type: "text/plain" })),
    );
    expect(response.status).toBe(400);
    // No object was written: the type is checked before the provider is touched.
    expect(await storedFiles()).toEqual(before);
  });

  it("rejects contents that do not match the extension", async () => {
    const before = await storedFiles();
    const response = await POST(
      uploadRequest(
        new File([new TextEncoder().encode("#!/bin/sh\nrm -rf /\n")], "payload.pdf", {
          type: "application/pdf",
        }),
      ),
    );
    expect(response.status).toBe(400);
    expect(await storedFiles()).toEqual(before);
  });

  it("rejects a format that is not on the allow-list", async () => {
    const response = await POST(
      uploadRequest(
        new File([new TextEncoder().encode("MZ")], "payload.exe", {
          type: "application/x-msdownload",
        }),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("keeps a traversing filename out of the key and the path", async () => {
    const response = await POST(
      uploadRequest(new File([PDF], "../../../etc/passwd.pdf", { type: "application/pdf" })),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { resource: { id: string; fileName: string } };
    created.push(body.resource.id);
    // The display name is sanitised, and the key never contains the client's string.
    expect(body.resource.fileName).toBe("passwd.pdf");
    const [key] = await storedFiles();
    expect(key).not.toContain("passwd");
    expect(key?.startsWith(`resources/${OWNER}/`)).toBe(true);
  });

  it("refuses an anonymous upload before reading the body", async () => {
    currentIdentity = null;
    const response = await POST(
      uploadRequest(new File([PDF], "anon.pdf", { type: "application/pdf" })),
    );
    expect(response.status).toBe(401);
    currentIdentity = OWNER;
  });

  it("rejects a cross-origin upload", async () => {
    const request = uploadRequest(new File([PDF], "x.pdf", { type: "application/pdf" }));
    request.headers.set("origin", "https://evil.example");
    expect((await POST(request)).status).toBe(403);
  });

  it("deletes the object again when the resource is deleted", async () => {
    const response = await POST(
      uploadRequest(new File([PDF], "to-delete.pdf", { type: "application/pdf" }), {
        title: "rte route delete",
      }),
    );
    const body = (await response.json()) as { resource: { id: string } };
    const id = body.resource.id;
    const key = await keyOf(id);
    expect(await storage.download(key, "to-delete.pdf", "application/pdf")).not.toBeNull();

    const removed = await DELETE(
      new NextRequest(`http://127.0.0.1:3000/api/resources/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) },
    );
    expect(removed.status).toBe(200);
    // The object is gone with the row that pointed at it.
    expect(await storage.download(key, "to-delete.pdf", "application/pdf")).toBeNull();
  });

  it("refuses to delete somebody else's resource and leaves the object alone", async () => {
    const created0 = await POST(
      uploadRequest(new File([PDF], "keep.pdf", { type: "application/pdf" }), {
        title: "rte route keep",
      }),
    );
    const body = (await created0.json()) as { resource: { id: string } };
    const key = await keyOf(body.resource.id);

    currentIdentity = OTHER;
    const refused = await DELETE(
      new NextRequest(`http://127.0.0.1:3000/api/resources/${body.resource.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: body.resource.id }) },
    );
    // Not found, not forbidden: the caller learns nothing about the row.
    expect(refused.status).toBe(404);
    expect(await storage.download(key, "keep.pdf", "application/pdf")).not.toBeNull();

    const row = await admin.unsafe(
      `SELECT count(*)::int AS n FROM resources WHERE id = '${body.resource.id}'`,
    );
    expect(one<{ n: number }>(row).n).toBe(1);
    currentIdentity = OWNER;
  });

  it("serves an owner's own download with safe headers and no credential", async () => {
    const created0 = await POST(
      uploadRequest(new File([PDF], "mine.pdf", { type: "application/pdf" }), {
        title: "rte route download",
      }),
    );
    const body = (await created0.json()) as { resource: { id: string } };
    const id = body.resource.id;

    const response = await DOWNLOAD(
      new NextRequest(`http://127.0.0.1:3000/api/resources/${id}/download`),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    // Never rendered inline, never sniffed, never leaked by a referrer.
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const text = await response.text();
    expect(text).toBe("%PDF-1.7\nacceptance fixture\n");
    // No storage path or key appears in what the client receives.
    expect(text).not.toContain(".local/storage");
  });

  it("lets an anonymous visitor download a public resource", async () => {
    const created0 = await POST(
      uploadRequest(new File([PDF], "public.pdf", { type: "application/pdf" }), {
        title: "rte route public",
        visibility: "public",
      }),
    );
    const body = (await created0.json()) as { resource: { id: string } };
    const id = body.resource.id;

    currentIdentity = null;
    const response = await DOWNLOAD(
      new NextRequest(`http://127.0.0.1:3000/api/resources/${id}/download`),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    currentIdentity = OWNER;
  });

  it("denies a private resource to another user, as not-found, with no bytes", async () => {
    const created0 = await POST(
      uploadRequest(new File([PDF], "secret.pdf", { type: "application/pdf" }), {
        title: "rte route private",
        visibility: "private",
      }),
    );
    const body = (await created0.json()) as { resource: { id: string } };
    const id = body.resource.id;

    currentIdentity = OTHER;
    const response = await DOWNLOAD(
      new NextRequest(`http://127.0.0.1:3000/api/resources/${id}/download`),
      { params: Promise.resolve({ id }) },
    );
    // 404, not 403: the response must not confirm the resource exists.
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("%PDF");
    currentIdentity = OWNER;
  });

  it("deletes the newly uploaded object when the row insert fails", async () => {
    const before = await countStoredObjects();
    // Make the insert fail *after* the object has been written, which is the only
    // moment the compensating delete matters.
    await admin.unsafe(`ALTER TABLE public.resources RENAME TO resources_acc_hidden`);
    try {
      const response = await POST(
        uploadRequest(new File([PDF], "orphan.pdf", { type: "application/pdf" }), {
          title: "rte route orphan",
        }),
      );
      expect(response.status).toBe(503);
    } finally {
      await admin.unsafe(`ALTER TABLE resources_acc_hidden RENAME TO resources`);
    }
    // The object is gone: the write was undone, not left behind.
    expect(await countStoredObjects()).toBe(before);
  });

  it("keeps the old object and drops the replacement when an update fails", async () => {
    const created0 = await POST(
      uploadRequest(new File([PDF], "before.pdf", { type: "application/pdf" }), {
        title: "rte route replace",
      }),
    );
    const body = (await created0.json()) as { resource: { id: string } };
    const id = body.resource.id;
    const before = await countStoredObjects();

    await admin.unsafe(`ALTER TABLE public.resources RENAME TO resources_acc_hidden`);
    try {
      const form = new FormData();
      form.set("title", "rte route replace renamed");
      form.set("file", new File([PDF], "after.pdf", { type: "application/pdf" }));
      const response = await PATCH(
        new NextRequest(`http://127.0.0.1:3000/api/resources/${id}`, {
          method: "PATCH",
          body: form,
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBeGreaterThanOrEqual(400);
    } finally {
      await admin.unsafe(`ALTER TABLE resources_acc_hidden RENAME TO resources`);
    }
    // The replacement is removed and the original survives untouched.
    expect(await countStoredObjects()).toBe(before);
    const row = await admin.unsafe(`SELECT title FROM resources WHERE id = '${id}'`);
    expect(one<{ title: string }>(row).title).toBe("rte route replace");
  });

  it("replaces a file successfully for the owner, deleting the previous object", async () => {
    const created0 = await POST(
      uploadRequest(new File([PDF], "one.pdf", { type: "application/pdf" }), {
        title: "rte route swap",
      }),
    );
    const body = (await created0.json()) as { resource: { id: string } };
    const id = body.resource.id;
    const before = await countStoredObjects();

    const form = new FormData();
    form.set("title", "rte route swapped");
    form.set("file", new File([PDF], "two.pdf", { type: "application/pdf" }));
    const response = await PATCH(
      new NextRequest(`http://127.0.0.1:3000/api/resources/${id}`, {
        method: "PATCH",
        body: form,
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    // Exactly one object for this resource: the replaced one was cleaned up.
    expect(await countStoredObjects()).toBe(before);
  });
});

/** Counts real files under the development storage root. */
async function countStoredObjects(): Promise<number> {
  const root = path.join(process.cwd(), ".local", "storage");
  try {
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}
/**
 * postgres.js types `unsafe()` rows as an opaque `Row`. This narrows one field at a
 * call site without a cast the compiler has to complain about.
 */
function one<T>(rows: unknown[], index = 0): T {
  return rows[index] as T;
}
