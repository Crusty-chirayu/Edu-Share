/**
 * SG-3 acceptance: the resource service layer against a real PostgreSQL.
 *
 * ## Why this file exists alongside `rls.integration.test.ts`
 *
 * The application connects with `DATABASE_URL`. Locally that role is the cluster
 * superuser, which bypasses RLS, so on its own the application is protected only by
 * the predicates its query builders embed — chiefly
 * `RESOURCE_VISIBILITY_PREDICATE`, and the owner-scoped `WHERE` clauses on the
 * write paths. That layer is the one the product actually runs on, and until now it
 * had never executed.
 *
 * Everything here calls the real functions from `@/db/resources` through the real
 * `withIdentity()`, so the statements under test are the statements the routes run.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres, { type Sql } from "postgres";
import {
  createResource,
  deleteResource,
  getResource,
  getResourceFile,
  listResources,
  toggleBookmark,
  updateResource,
} from "@/db/resources";
import { getPublicProfile, resolveProfileId } from "@/db/profiles";
import { __closeDb } from "@/db/client";
import { withIdentity } from "@/db/query";
import { isLoopbackHost } from "@/db/guard";
import { AppError } from "@/lib/errors";
import { __setTestEnv } from "@/lib/env";
import { parseOrThrow, resourceCreateSchema, searchParamsSchema } from "@/lib/validation";

const enabled = process.env["RUN_DB_TESTS"] === "1";
const DB_URL = process.env["DATABASE_URL"] ?? "";
const USER_A = "22222222-0000-4000-8000-000000000001";
const USER_B = "33333333-0000-4000-8000-000000000002";
const INSTITUTION = "66666666-0000-4000-8000-00000000000c";
const SUBJECT = "77777777-0000-4000-8000-0000000000d1";
const AUTH_A = "b7a1c9e0-0000-4000-8000-00000000000a";
/** A server-shaped storage key, exactly as `createStorageKey()` would mint one. */
const PRIVATE_KEY = `resources/${USER_A}/11111111-2222-4333-8444-555555555555.pdf`;

const params = () => parseOrThrow(searchParamsSchema, { pageSize: "50" });
const createInput = (over: Record<string, unknown> = {}) =>
  parseOrThrow(resourceCreateSchema, { title: "svc service fixture", ...over });

describe.skipIf(!enabled)("resource service acceptance (query layer)", () => {
  let admin!: Sql;
  let restoreEnv: () => void = () => {};
  let publicId = "";
  let privateId = "";

  beforeAll(async () => {
    if (DB_URL.trim().length === 0) {
      throw new Error(
        "Refusing service acceptance: DATABASE_URL is missing or empty. " +
          "Run with RUN_DB_TESTS=1 and an exported loopback DSN (see README testing section).",
      );
    }
    if (!isLoopbackHost(new URL(DB_URL).hostname)) {
      throw new Error("Refusing service acceptance against a non-loopback database.");
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
      EDU_SHARE_LOCAL_STORAGE: "0",
    });
    admin = postgres(DB_URL, { max: 1, prepare: false });
    await clearFixtures();
    await admin.unsafe(
      `INSERT INTO institutions (id, name) VALUES ('${INSTITUTION}', 'svc-institution')`,
    );
    await admin.unsafe(
      `INSERT INTO subjects (id, institution_id, name) VALUES ('${SUBJECT}', '${INSTITUTION}', 'svc-subject')`,
    );
    // Profiles are provisioned the way the application does it: inside a transaction
    // that already carries the identity the row is being created for.
    await withIdentity(USER_A, (tx) =>
      tx.unsafe(
        `INSERT INTO profiles (id, display_name, email, auth_user_id)
         VALUES ('${USER_A}', 'svc-alice', 'svc-alice@example.invalid', '${AUTH_A}')`,
      ),
    );
    await withIdentity(USER_B, (tx) =>
      tx.unsafe(
        `INSERT INTO profiles (id, display_name, email) VALUES ('${USER_B}', 'svc-bob', 'svc-bob@example.invalid')`,
      ),
    );
  });

  afterAll(async () => {
    // `admin` is definitely-assigned (`!`): when `beforeAll` throws it stays
    // unassigned, so teardown returns early and the original setup error —
    // not a follow-on `Cannot read properties of undefined` — is reported.
    if (admin === undefined) return;
    try {
      await clearFixtures();
    } finally {
      await admin.end({ timeout: 5 });
      await __closeDb();
      restoreEnv();
    }
  });

  async function clearFixtures(): Promise<void> {
    await admin.unsafe(
      `DELETE FROM bookmarks WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'svc %')`,
    );
    await admin.unsafe(`DELETE FROM resources WHERE title LIKE 'svc %'`);
    await admin.unsafe(`DELETE FROM profiles WHERE id IN ('${USER_A}', '${USER_B}')`);
    await admin.unsafe(
      `DELETE FROM subjects WHERE id IN ('${SUBJECT}', 'dddddddd-0000-4000-8000-0000000000d2')`,
    );
    await admin.unsafe(`DELETE FROM institutions WHERE id = '${INSTITUTION}'`);
  }

  it("creates a resource for the caller's verified identity", async () => {
    const created = await withIdentity(USER_A, (tx) =>
      createResource(
        tx,
        USER_A,
        createInput({ title: "svc service public", subjectId: SUBJECT, visibility: "public" }),
      ),
    );
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.ownerId).toBe(USER_A);
    expect(created.ownerName).toBe("svc-alice");
    publicId = created.id;
  });

  it("creates a private resource that only its owner can see", async () => {
    const created = await withIdentity(USER_A, (tx) =>
      createResource(
        tx,
        USER_A,
        createInput({
          title: "svc service private",
          subjectId: SUBJECT,
          visibility: "private",
          // A real file key, so the download-credential case below is meaningful
          // rather than a row that was never going to carry one.
          file: {
            key: `${PRIVATE_KEY}`,
            name: "svc-private.pdf",
            sizeBytes: 12,
            mimeType: "application/pdf",
          },
        }),
      ),
    );
    privateId = created.id;
    expect(created.visibility).toBe("private");
    expect(created.hasFile).toBe(true);
  });

  it("lists only public resources for an anonymous viewer", async () => {
    const page = await withIdentity(null, (tx) => listResources(tx, params(), { viewerId: null }));
    const titles = page.items.map((i) => i.title);
    expect(titles).toContain("svc service public");
    expect(titles).not.toContain("svc service private");
  });

  it("lists its own private resources for the owner", async () => {
    const page = await withIdentity(USER_A, (tx) =>
      listResources(tx, params(), { viewerId: USER_A, mine: true }),
    );
    expect(page.items.map((i) => i.title)).toContain("svc service private");
  });

  it("refuses to list another user's uploads through the mine filter", async () => {
    // `mine` is the transaction identity, never a caller-supplied owner id.
    const page = await withIdentity(USER_B, (tx) =>
      listResources(tx, params(), { viewerId: USER_B, mine: true }),
    );
    expect(page.items.map((i) => i.ownerId)).not.toContain(USER_A);
    const anonymous = await withIdentity(null, (tx) =>
      listResources(tx, params(), { viewerId: null, mine: true }),
    );
    expect(anonymous.items).toHaveLength(0);
  });

  it("returns a public resource to a different user, and null for a private one", async () => {
    const visible = await withIdentity(USER_B, (tx) => getResource(tx, publicId));
    expect(visible?.id).toBe(publicId);
    // Null, not a 403: the existence of another user's private resource is not the
    // caller's business, and the route turns null into the same 404.
    const hidden = await withIdentity(USER_B, (tx) => getResource(tx, privateId));
    expect(hidden).toBeNull();
  });

  it("issues no download credential for a resource the caller cannot read", async () => {
    const owner = await withIdentity(USER_A, (tx) => getResourceFile(tx, privateId));
    // The owner is authorised, and the key it would be turned into a URL with is
    // exactly the row's `file_key` — never a path built from the request.
    expect(owner?.fileKey).toBe(PRIVATE_KEY);
    // The authorisation decision is made here, before any credential exists.
    const other = await withIdentity(USER_B, (tx) => getResourceFile(tx, privateId));
    expect(other).toBeNull();
  });

  it("updates its own resource and rejects a non-owner with not-found", async () => {
    const updated = await withIdentity(USER_A, (tx) =>
      updateResource(tx, publicId, USER_A, { title: "svc service renamed" }),
    );
    expect(updated.item.title).toBe("svc service renamed");

    let code = "";
    try {
      await withIdentity(USER_B, (tx) =>
        updateResource(tx, publicId, USER_B, { title: "svc service stolen" }),
      );
    } catch (error) {
      code = error instanceof AppError ? error.code : "not-an-app-error";
    }
    // The same 404 a missing id produces — never 403, which would confirm existence.
    expect(code).toBe("not_found");
  });

  it("returns the previous storage key when a file is replaced", async () => {
    const first = await withIdentity(USER_A, (tx) =>
      updateResource(tx, publicId, USER_A, {
        file: {
          key: "resources/svc/one.pdf",
          name: "one.pdf",
          sizeBytes: 10,
          mimeType: "application/pdf",
        },
      }),
    );
    expect(first.replacedFileKey).toBeNull();

    const second = await withIdentity(USER_A, (tx) =>
      updateResource(tx, publicId, USER_A, {
        file: {
          key: "resources/svc/two.pdf",
          name: "two.pdf",
          sizeBytes: 20,
          mimeType: "application/pdf",
        },
      }),
    );
    // The caller uses this to delete the now-orphaned object.
    expect(second.replacedFileKey).toBe("resources/svc/one.pdf");
  });

  it("keeps bookmarks private in both directions", async () => {
    const first = await withIdentity(USER_A, (tx) => toggleBookmark(tx, USER_A, publicId));
    expect(first.bookmarked).toBe(true);
    // Toggling again removes it: save-if-absent, remove-if-present.
    const second = await withIdentity(USER_A, (tx) => toggleBookmark(tx, USER_A, publicId));
    expect(second.bookmarked).toBe(false);

    // A caller cannot bookmark something they cannot see.
    let code = "";
    try {
      await withIdentity(USER_B, (tx) => toggleBookmark(tx, USER_B, privateId));
    } catch (error) {
      code = error instanceof AppError ? error.code : "not-an-app-error";
    }
    expect(code).toBe("not_found");
  });

  it("lists the saved set from the transaction identity only", async () => {
    await withIdentity(USER_A, (tx) => toggleBookmark(tx, USER_A, publicId));
    const mine = await withIdentity(USER_A, (tx) =>
      listResources(tx, params(), { viewerId: USER_A, saved: true }),
    );
    expect(mine.items.map((i) => i.id)).toContain(publicId);
    const theirs = await withIdentity(USER_B, (tx) =>
      listResources(tx, params(), { viewerId: USER_B, saved: true }),
    );
    expect(theirs.items.map((i) => i.id)).not.toContain(publicId);
  });

  it("finds resources by keyword through the generated search column", async () => {
    const found = await withIdentity(null, (tx) =>
      listResources(tx, parseOrThrow(searchParamsSchema, { q: "renamed" }), { viewerId: null }),
    );
    expect(found.items.map((i) => i.id)).toContain(publicId);
  });

  it("deletes only for the owner and hands back the key for cleanup", async () => {
    let code = "";
    try {
      await withIdentity(USER_B, (tx) => deleteResource(tx, publicId, USER_B));
    } catch (error) {
      code = error instanceof AppError ? error.code : "not-an-app-error";
    }
    expect(code).toBe("not_found");

    const removed = await withIdentity(USER_A, (tx) => deleteResource(tx, publicId, USER_A));
    expect(removed.fileKey).toBe("resources/svc/two.pdf");
    expect(await withIdentity(USER_A, (tx) => getResource(tx, publicId))).toBeNull();
    // The bookmark went with it, by cascade.
    expect(await withIdentity(USER_A, (tx) => countOf(tx, "bookmarks"))).toBe(0);
  });

  it("reads a public profile through the email-free view and resolves an auth user", async () => {
    const profile = await withIdentity(USER_A, (tx) => getPublicProfile(tx, USER_A));
    expect(profile?.displayName).toBe("svc-alice");
    expect(Object.keys(profile ?? {})).not.toContain("email");

    // The bridge is reachable only with no identity set, which is why it exists.
    const resolved = await withIdentity(null, (tx) => resolveProfileId(tx, AUTH_A));
    expect(resolved).toBe(USER_A);
  });

  it("never leaks a driver error to the caller", async () => {
    // A malformed UUID reaches the builder as a bound parameter; PostgreSQL rejects
    // it, and `guarded()` must convert that into a domain error with a fixed message.
    let caught: AppError | null = null;
    try {
      await withIdentity(USER_A, (tx) => getResource(tx, "not-a-uuid"));
    } catch (error) {
      caught = error instanceof AppError ? error : null;
    }
    expect(caught).not.toBeNull();
    expect(caught?.code).toBe("unavailable");
    // No relation name, no value, no DSN — the safe sentence only.
    expect(caught?.safe).toBe("The service is temporarily unavailable. Please try again.");
  });

  it("nulls a subject reference instead of deleting shared material", async () => {
    const subject2 = "dddddddd-0000-4000-8000-0000000000d2";
    await admin.unsafe(
      `INSERT INTO subjects (id, institution_id, name) VALUES ('${subject2}', '${INSTITUTION}', 'svc-subject-2')`,
    );
    const owned = await withIdentity(USER_B, (tx) =>
      createResource(tx, USER_B, createInput({ title: "svc fk subject", subjectId: subject2 })),
    );
    await admin.unsafe(`DELETE FROM subjects WHERE id = '${subject2}'`);
    const after = await withIdentity(USER_B, (tx) => getResource(tx, owned.id));
    expect(after?.subjectId).toBeNull();
  });
});

async function countOf(tx: Sql, table: string): Promise<number> {
  const rows = await tx.unsafe(`SELECT count(*)::int AS n FROM ${table}`);
  return one<{ n: number }>(rows).n;
}
/**
 * postgres.js types `unsafe()` rows as an opaque `Row`. This narrows one field at a
 * call site without a cast the compiler has to complain about.
 */
function one<T>(rows: unknown[], index = 0): T {
  return rows[index] as T;
}
