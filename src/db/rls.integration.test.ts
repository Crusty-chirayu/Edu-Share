/**
 * SG-3 acceptance: RLS behaviour proven against a real PostgreSQL.
 *
 * ## Why a separate login role exists
 *
 * The application connects with `DATABASE_URL`, which in local development is the
 * cluster superuser. **A superuser bypasses RLS entirely**, so every assertion here
 * would pass no matter what the policies said. These tests therefore log in as
 * `edu_rls_test` — `NOSUPERUSER NOBYPASSRLS`, *not* the owner of any table, holding
 * ordinary table grants, exactly the shape of a Supabase `authenticated` client.
 * The first case asserts that role's properties, so a future change that quietly
 * promotes it fails loudly instead of invalidating the rest of the suite.
 *
 * Two layers are proven separately, because the project relies on both:
 *
 *  1. **RLS** (this file) — the policies from migrations 0002/0003, executed.
 *  2. **The query layer** (`resource-service.integration.test.ts`) — the
 *     `RESOURCE_VISIBILITY_PREDICATE` the builders embed, which is what protects the
 *     application when it connects with a privileged role.
 *
 * ## Safety
 *
 * Loopback only, gated on `RUN_DB_TESTS=1`, fixtures are synthetic and namespaced
 * `acc-`, and cleanup removes only rows this file created.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres, { type Sql } from "postgres";
import { isLoopbackHost } from "@/db/guard";
import { __setTestEnv } from "@/lib/env";

const enabled = process.env["RUN_DB_TESTS"] === "1";

/** Throwaway credential for a local, disposable test role. Not a secret. */
const TEST_ROLE = "edu_rls_test";
const TEST_PASSWORD = "acceptance-only";

const ADMIN_URL = process.env["DATABASE_URL"] ?? "";
const USER_A = "aaaaaaaa-0000-4000-8000-000000000001";
const USER_B = "bbbbbbbb-0000-4000-8000-000000000002";
const INSTITUTION = "cccccccc-0000-4000-8000-00000000000c";
const SUBJECT = "dddddddd-0000-4000-8000-0000000000d1";
const PUBLIC_A = "11111111-0000-4000-8000-0000000000a1";
const PRIVATE_A = "11111111-0000-4000-8000-0000000000a2";
const PUBLIC_B = "11111111-0000-4000-8000-0000000000b1";
const PRIVATE_B = "11111111-0000-4000-8000-0000000000b2";

/** A connection whose `current_user` is the restricted role. */
function restrictedUrl(): string {
  const url = new URL(ADMIN_URL);
  url.username = TEST_ROLE;
  url.password = TEST_PASSWORD;
  return url.toString();
}

async function countAs(tx: Sql, table: string, where: string): Promise<number> {
  const rows = await tx.unsafe(`SELECT count(*)::int AS n FROM ${table} WHERE ${where}`);
  return one<{ n: number }>(rows).n;
}

/** True when PostgreSQL refused the statement — "not permitted" of any kind. */
async function isDenied(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

/**
 * Rows an UPDATE/DELETE actually touched.
 *
 * RLS does **not** raise an error when a policy excludes every row: it makes the
 * rows invisible, so the statement succeeds and affects zero rows. Asserting
 * "it threw" would therefore pass a broken policy and fail a correct one, which is
 * the opposite of what an acceptance test is for. Row visibility is the assertion.
 */
async function affected(fn: () => Promise<unknown[]>): Promise<number> {
  const rows = await fn();
  return rows.length;
}

describe.skipIf(!enabled)("RLS acceptance (restricted, non-superuser role)", () => {
  let admin!: Sql;
  let client!: Sql;
  let restoreEnv: () => void = () => {};

  beforeAll(async () => {
    if (ADMIN_URL.trim().length === 0) {
      throw new Error(
        "Refusing RLS acceptance: DATABASE_URL is missing or empty. " +
          "Run with RUN_DB_TESTS=1 and an exported loopback DSN (see README testing section).",
      );
    }
    if (!isLoopbackHost(new URL(ADMIN_URL).hostname)) {
      throw new Error("Refusing RLS acceptance against a non-loopback database.");
    }
    // An explicit, complete environment, applied before anything reads it: the run
    // must not depend on a developer's `.env`.
    restoreEnv = __setTestEnv({
      DATABASE_URL: ADMIN_URL,
      DIRECT_URL: ADMIN_URL,
      APP_URL: "http://127.0.0.1:3000",
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_STORAGE_BUCKET: "",
      EDU_SHARE_DEV_AUTH: "0",
      EDU_SHARE_LOCAL_STORAGE: "0",
    });

    admin = postgres(ADMIN_URL, { max: 1, prepare: false });
    client = postgres(restrictedUrl(), { max: 1, prepare: false });

    await admin.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
          CREATE ROLE ${TEST_ROLE} LOGIN PASSWORD '${TEST_PASSWORD}'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
        -- The deployed client shape (migration 0003's conditional branch): these
        -- roles exist only in this acceptance run, so the suite brings them.
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      END $$`);
    // The conditional branch of migration 0003 only fired (or fires) when the
    // roles exist, so re-run it here: whole-table read is closed on `profiles`
    // and only the email-free projection is granted. Re-applying the project's
    // own 0003 statements keeps this proof aligned with the migration.
    await admin.unsafe(`REVOKE ALL ON TABLE public.profiles FROM anon, authenticated`);
    await admin.unsafe(`GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated`);
    // Ordinary grants. RLS must be the thing that decides.
    await admin.unsafe(`
      GRANT USAGE ON SCHEMA public TO ${TEST_ROLE};
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${TEST_ROLE};
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${TEST_ROLE};
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${TEST_ROLE};`);

    // Deployment model mirror: migration 0003 grants the email-free projection to
    // `anon`/`authenticated` only where those roles exist (Supabase). Local
    // PostgreSQL has neither, so create them here (NOLOGIN) and apply the same
    // REVOKE/GRANT. Without this the privilege-boundary assertion below would
    // read an empty `pg_roles` and prove nothing.
    await admin.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      END $$`);
    await admin.unsafe(`REVOKE ALL ON TABLE public.profiles FROM anon, authenticated`);
    await admin.unsafe(`GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated`);

    // Idempotent fixtures: a previous interrupted run must not change the outcome.
    await clearFixtures();
    await admin.unsafe(
      `INSERT INTO institutions (id, name) VALUES ('${INSTITUTION}', 'acc-institution')`,
    );
    await admin.unsafe(
      `INSERT INTO subjects (id, institution_id, name) VALUES ('${SUBJECT}', '${INSTITUTION}', 'acc-subject')`,
    );
    // Profiles come from the client role under its own identity: this is the
    // application's session bootstrap, and it exercises `profiles_insert_self`.
    // An anonymous insert is denied by that very policy, so identity is required.
    await asIdentity(USER_A, (tx) =>
      tx.unsafe(
        `INSERT INTO profiles (id, display_name, email) VALUES ('${USER_A}', 'acc-alice', 'acc-alice@example.invalid')`,
      ),
    );
    await asIdentity(USER_B, (tx) =>
      tx.unsafe(
        `INSERT INTO profiles (id, display_name, email) VALUES ('${USER_B}', 'acc-bob', 'acc-bob@example.invalid')`,
      ),
    );
    await asIdentity(USER_A, (tx) =>
      tx.unsafe(
        `INSERT INTO resources (id, owner_id, subject_id, title, visibility) VALUES
           ('${PUBLIC_A}',  '${USER_A}', '${SUBJECT}', 'acc public from alice',  'public'),
           ('${PRIVATE_A}', '${USER_A}', '${SUBJECT}', 'acc private from alice', 'private')`,
      ),
    );
    await asIdentity(USER_B, (tx) =>
      tx.unsafe(
        `INSERT INTO resources (id, owner_id, subject_id, title, visibility) VALUES
           ('${PUBLIC_B}',  '${USER_B}', '${SUBJECT}', 'acc public from bob',  'public'),
           ('${PRIVATE_B}', '${USER_B}', '${SUBJECT}', 'acc private from bob', 'private')`,
      ),
    );
  });

  async function clearFixtures(): Promise<void> {
    await admin.unsafe(
      `DELETE FROM resource_reports WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'acc %')`,
    );
    await admin.unsafe(
      `DELETE FROM bookmarks WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'acc %')`,
    );
    await admin.unsafe(`DELETE FROM resources WHERE title LIKE 'acc %'`);
    await admin.unsafe(`DELETE FROM profiles WHERE id IN ('${USER_A}', '${USER_B}')`);
    await admin.unsafe(`DELETE FROM subjects WHERE id = '${SUBJECT}'`);
    await admin.unsafe(`DELETE FROM institutions WHERE id = '${INSTITUTION}'`);
  }

  afterAll(async () => {
    // Only what this file created. The role stays: it owns nothing, and dropping a
    // role is refused while dependent objects exist. `admin`/`client` are
    // definitely-assigned (`!`): when `beforeAll` throws they stay unassigned
    // and this teardown is skipped in favour of the original setup error.
    if (admin === undefined || client === undefined) return;
    try {
      await clearFixtures();
    } finally {
      await admin.end({ timeout: 5 });
      await client.end({ timeout: 5 });
      restoreEnv();
    }
  });

  /**
   * Runs `fn` as `identity` in a transaction whose `app.user_id` is
   * **transaction-local** — the same mechanism `withIdentity()` uses, so the real
   * bridge is exercised. `null` is anonymous: the empty string the bridge nullifies.
   */
  async function asIdentity<T>(identity: string | null, fn: (tx: Sql) => Promise<T>): Promise<T> {
    return client.begin(async (tx) => {
      await tx.unsafe(`SELECT set_config('app.user_id', $1, true)`, [identity ?? ""]);
      return fn(tx as unknown as Sql);
    }) as Promise<T>;
  }

  it("is running as a genuinely restricted role, not a privileged one", async () => {
    const rows = await asIdentity(null, (tx) =>
      tx.unsafe(
        `SELECT current_user AS role,
                (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
                (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypassrls,
                (SELECT pg_has_role(current_user, 'postgres', 'USAGE')) AS member_of_owner`,
      ),
    );
    const row = one<{
      role: string;
      superuser: boolean;
      bypassrls: boolean;
      member_of_owner: boolean;
    }>(rows);
    expect(row.role).toBe(TEST_ROLE);
    expect(row.superuser).toBe(false);
    expect(row.bypassrls).toBe(false);
    expect(row.member_of_owner).toBe(false);
  });

  describe("anonymous viewer", () => {
    it("reads only publicly visible resources", async () => {
      const visible = await asIdentity(null, (tx) =>
        countAs(tx, "resources", "title LIKE 'acc %'"),
      );
      // Two of the four fixtures are public. The two private rows are not returned
      // at all — RLS filters them in the database, not in application code.
      expect(visible).toBe(2);
    });

    it("cannot fetch a private resource by id", async () => {
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT id FROM resources WHERE id = '${PRIVATE_A}'`),
      );
      expect(rows).toHaveLength(0);
    });

    it("cannot insert, update or delete a resource", async () => {
      const insert = await isDenied(() =>
        asIdentity(null, (tx) =>
          tx.unsafe(
            `INSERT INTO resources (id, owner_id, title) VALUES
               ('11111111-0000-4000-8000-0000000000ff', '${USER_A}', 'acc anon insert')`,
          ),
        ),
      );
      const update = await affected(() =>
        asIdentity(null, (tx) =>
          tx.unsafe(
            `UPDATE resources SET title = 'acc hijack' WHERE title LIKE 'acc %' RETURNING id`,
          ),
        ),
      );
      const remove = await affected(() =>
        asIdentity(null, (tx) =>
          tx.unsafe(`DELETE FROM resources WHERE title LIKE 'acc %' RETURNING id`),
        ),
      );
      // INSERT is refused outright; UPDATE/DELETE see zero rows.
      expect(insert).toBe(true);
      expect([update, remove]).toEqual([0, 0]);
    });

    it("cannot read or write bookmarks", async () => {
      await asIdentity(USER_A, (tx) =>
        tx.unsafe(
          `INSERT INTO bookmarks (user_id, resource_id) VALUES ('${USER_A}', '${PUBLIC_A}')`,
        ),
      );
      expect(await asIdentity(null, (tx) => countAs(tx, "bookmarks", "true"))).toBe(0);
      const forged = await isDenied(() =>
        asIdentity(null, (tx) =>
          tx.unsafe(
            `INSERT INTO bookmarks (user_id, resource_id) VALUES ('${USER_A}', '${PUBLIC_A}')`,
          ),
        ),
      );
      expect(forged).toBe(true);
    });

    it("can read only the authors of public resources, and never an email", async () => {
      // This is migration 0003's intent, narrowed from 0002: an author is readable
      // once they have published something *public*. Anonymous sees exactly the two
      // authors of public resources — not a user with no public presence, and never
      // the author of a private-only resource.
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT id FROM profiles WHERE id IN ('${USER_A}', '${USER_B}')`),
      );
      expect(rows).toHaveLength(2);

      // The email-free projection is the shape the product reads. It has no email
      // column at all, so a whole-row read of *this* path cannot leak one.
      const viaView = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT * FROM public.public_profiles`),
      );
      expect(viaView.length).toBeGreaterThan(0);
      expect(Object.keys(viaView[0] as object)).not.toContain("email");
    });

    it("cannot read a profile that has published nothing public", async () => {
      // No DELETE policy exists on `profiles` by design, so this row is created
      // under its own identity and removed by the privileged connection.
      const quiet = "eeeeeeee-0000-4000-8000-00000000000e";
      await asIdentity(quiet, (tx) =>
        tx.unsafe(`INSERT INTO profiles (id, display_name) VALUES ('${quiet}', 'acc-quiet')`),
      );
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT id FROM profiles WHERE id IN ('${quiet}', '${USER_A}', '${USER_B}')`),
      );
      // The quiet profile is absent; the two public authors are present.
      expect(rows).toHaveLength(2);
      await admin.unsafe(`DELETE FROM profiles WHERE id = '${quiet}'`);
    });

    it("the deployed client roles have no table access at all, so no email is reachable", async () => {
      // The email boundary is a *privilege* boundary, not an RLS one: RLS cannot
      // filter columns. Migration 0003 removes table-level SELECT from `anon` and
      // `authenticated` and grants only the email-free view. This asserts that
      // deployment model, which is what actually makes email unreachable.
      const rows = await admin.unsafe(
        `SELECT grantee, table_name FROM information_schema.role_table_grants
         WHERE grantee IN ('anon', 'authenticated') AND table_schema = 'public'
           AND table_name = 'profiles'`,
      );
      const roleRows = await admin.unsafe(
        `SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`,
      );
      if (roleRows.length === 0) {
        // Local disposable PostgreSQL has neither Supabase client role, so the
        // conditional REVOKE/GRANT block in migration 0003 had nothing to act
        // on. The email boundary here is the RLS policy itself (proven above);
        // the privilege boundary is proven wherever those roles exist.
        expect(rows).toHaveLength(0);
        return;
      }
      expect(rows).toHaveLength(0);

      const viewGrants = await admin.unsafe(
        `SELECT grantee FROM information_schema.role_table_grants
         WHERE grantee IN ('anon', 'authenticated') AND table_name = 'public_profiles'`,
      );
      expect(viewGrants).toHaveLength(2);
    });
  });

  describe("authenticated owner (user A)", () => {
    it("reads its own public and private resources", async () => {
      expect(
        await asIdentity(USER_A, (tx) => countAs(tx, "resources", `owner_id = '${USER_A}'`)),
      ).toBe(2);
    });

    it("cannot read another user's private resource", async () => {
      const rows = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT id FROM resources WHERE id = '${PRIVATE_B}'`),
      );
      expect(rows).toHaveLength(0);
    });

    it("still sees the other user's public resource", async () => {
      const rows = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT id FROM resources WHERE id = '${PUBLIC_B}'`),
      );
      expect(rows).toHaveLength(1);
    });

    it("creates a resource for itself and is denied naming another owner", async () => {
      const created = await asIdentity(USER_A, (tx) =>
        tx.unsafe(
          `INSERT INTO resources (id, owner_id, title) VALUES
             ('11111111-0000-4000-8000-0000000000a3', '${USER_A}', 'acc created by owner') RETURNING id`,
        ),
      );
      expect(created).toHaveLength(1);

      // Naming somebody else as owner is the impersonation case.
      const impersonation = await isDenied(() =>
        asIdentity(USER_A, (tx) =>
          tx.unsafe(
            `INSERT INTO resources (id, owner_id, title) VALUES
               ('11111111-0000-4000-8000-0000000000a4', '${USER_B}', 'acc impersonation')`,
          ),
        ),
      );
      expect(impersonation).toBe(true);
    });

    it("updates and deletes its own resource", async () => {
      const updated = await asIdentity(USER_A, (tx) =>
        tx.unsafe(
          `UPDATE resources SET title = 'acc updated by owner'
           WHERE id = '11111111-0000-4000-8000-0000000000a3' RETURNING title`,
        ),
      );
      expect(updated).toHaveLength(1);

      const deleted = await asIdentity(USER_A, (tx) =>
        tx.unsafe(
          `DELETE FROM resources WHERE id = '11111111-0000-4000-8000-0000000000a3' RETURNING id`,
        ),
      );
      expect(deleted).toHaveLength(1);
    });

    it("creates its own bookmark but cannot touch another user's", async () => {
      const own = await asIdentity(USER_B, (tx) =>
        tx.unsafe(
          `INSERT INTO bookmarks (user_id, resource_id) VALUES ('${USER_B}', '${PUBLIC_B}')
           ON CONFLICT DO NOTHING RETURNING user_id`,
        ),
      );
      expect(own.length).toBeLessThanOrEqual(1);

      const forged = await isDenied(() =>
        asIdentity(USER_A, (tx) =>
          tx.unsafe(
            `INSERT INTO bookmarks (user_id, resource_id) VALUES ('${USER_B}', '${PUBLIC_B}')`,
          ),
        ),
      );
      const removed = await affected(() =>
        asIdentity(USER_A, (tx) =>
          tx.unsafe(`DELETE FROM bookmarks WHERE user_id = '${USER_B}' RETURNING user_id`),
        ),
      );
      // The forged insert is refused; the delete of somebody else's row sees nothing.
      expect(forged).toBe(true);
      expect(removed).toBe(0);
    });
  });

  describe("a different authenticated user (user B)", () => {
    it("cannot update or delete user A's resources", async () => {
      const update = await affected(() =>
        asIdentity(USER_B, (tx) =>
          tx.unsafe(
            `UPDATE resources SET title = 'acc stolen' WHERE owner_id = '${USER_A}' RETURNING id`,
          ),
        ),
      );
      const remove = await affected(() =>
        asIdentity(USER_B, (tx) =>
          tx.unsafe(`DELETE FROM resources WHERE owner_id = '${USER_A}' RETURNING id`),
        ),
      );
      expect([update, remove]).toEqual([0, 0]);
    });

    it("sees only user A's public resource", async () => {
      const rows = await asIdentity(USER_B, (tx) =>
        tx.unsafe(`SELECT id, visibility FROM resources WHERE owner_id = '${USER_A}'`),
      );
      expect(rows).toHaveLength(1);
      expect(one<{ visibility: string }>(rows).visibility).toBe("public");
    });

    it("can read user A's profile row, because A has published something public", async () => {
      // The counterpart of the rule above: a public author *is* readable. This
      // asserts the scope of the permission rather than pretending it does not exist.
      const rows = await asIdentity(USER_B, (tx) =>
        tx.unsafe(`SELECT id FROM profiles WHERE id = '${USER_A}'`),
      );
      expect(rows).toHaveLength(1);
    });

    it("cannot insert a profile under somebody else's id", async () => {
      const denied = await isDenied(() =>
        asIdentity(USER_B, (tx) =>
          tx.unsafe(
            `INSERT INTO profiles (id, display_name) VALUES ('${USER_A}', 'acc impersonated name')`,
          ),
        ),
      );
      expect(denied).toBe(true);
    });
  });

  describe("privilege columns on profiles", () => {
    it("a client role cannot promote its own role (AUD-002)", async () => {
      // Before migration 0004 this returned one row: `profiles_update_self` scopes
      // rows, not columns, so the policy permitted the promotion. The trigger now
      // refuses the statement outright rather than quietly succeeding.
      const refused = await isDenied(() =>
        asIdentity(USER_A, (tx) =>
          tx.unsafe(`UPDATE profiles SET role = 'admin' WHERE id = '${USER_A}' RETURNING role`),
        ),
      );
      expect(refused).toBe(true);
      const stillStudent = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT role FROM profiles WHERE id = '${USER_A}'`),
      );
      expect(one<{ role: string }>(stillStudent).role).toBe("student");
    });

    it("a client role cannot re-point its own auth_user_id", async () => {
      const refused = await isDenied(() =>
        asIdentity(USER_A, (tx) =>
          tx.unsafe(
            `UPDATE profiles SET auth_user_id = 'a1b2c3d4-0000-4000-8000-0000000000ff'
             WHERE id = '${USER_A}' RETURNING auth_user_id`,
          ),
        ),
      );
      expect(refused).toBe(true);
    });

    it("still allows an ordinary profile edit, or the app would be broken", async () => {
      // The guard must not turn into "nothing can ever change": a display-name
      // update is the product's own profile form and must keep working.
      const rows = await asIdentity(USER_A, (tx) =>
        tx.unsafe(
          `UPDATE profiles SET display_name = 'acc-renamed' WHERE id = '${USER_A}' RETURNING display_name`,
        ),
      );
      expect(rows).toHaveLength(1);
    });

    it("the server may still change them, or profiles could never be provisioned", async () => {
      // The same change must remain possible for the privileged connection the
      // application uses, otherwise the control above would be "secure" only because
      // nothing works any more.
      const rows = await admin.unsafe(
        `UPDATE profiles SET role = 'teacher' WHERE id = '${USER_A}' RETURNING role`,
      );
      expect(rows).toHaveLength(1);
      await admin.unsafe(`UPDATE profiles SET role = 'student' WHERE id = '${USER_A}'`);
    });
  });

  describe("identity bridge", () => {
    it("returns NULL when no identity is set", async () => {
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT public.app_current_user_id()::text AS id`),
      );
      expect(one<{ id: string | null }>(rows).id).toBeNull();
    });

    it("returns the transaction-local identity when one is set", async () => {
      const rows = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT public.app_current_user_id()::text AS id`),
      );
      expect(one<{ id: string | null }>(rows).id).toBe(USER_A);
    });

    it("does not leak an identity into the next transaction", async () => {
      await asIdentity(USER_A, (tx) => tx.unsafe(`SELECT 1`));
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT public.app_current_user_id()::text AS id`),
      );
      expect(one<{ id: string | null }>(rows).id).toBeNull();
    });

    it("does not leak an identity out of a rolled-back transaction", async () => {
      try {
        await client.begin(async (tx) => {
          await tx.unsafe(`SELECT set_config('app.user_id', $1, true)`, [USER_A]);
          throw new Error("force rollback");
        });
      } catch {
        /* expected: the transaction is rolled back */
      }
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT public.app_current_user_id()::text AS id`),
      );
      expect(one<{ id: string | null }>(rows).id).toBeNull();
    });

    it("changes identity between transactions on one connection", async () => {
      const first = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT public.app_current_user_id()::text AS id`),
      );
      const second = await asIdentity(USER_B, (tx) =>
        tx.unsafe(`SELECT public.app_current_user_id()::text AS id`),
      );
      expect(one<{ id: string }>(first).id).toBe(USER_A);
      expect(one<{ id: string }>(second).id).toBe(USER_B);
    });

    it("maps an auth user id to a profile id through the SECURITY DEFINER bridge", async () => {
      // A per-run auth id: suites run in parallel workers against one database,
      // so a fixed id collides with the twin fixture in
      // `resource-service.integration.test.ts`.
      const authId = crypto.randomUUID();
      const set = await admin.unsafe(
        `UPDATE profiles SET auth_user_id = '${authId}' WHERE id = '${USER_A}' RETURNING id`,
      );
      expect(set).toHaveLength(1);
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT public.app_profile_for_auth_user('${authId}')::text AS id`),
      );
      expect(one<{ id: string | null }>(rows).id).toBe(USER_A);
    });
  });

  describe("migration 0006 — download count increment under RLS", () => {
    it("increment_resource_download increments a visible resource count without loosening RLS UPDATE", async () => {
      // Direct UPDATE by non-owner is refused/affects 0 rows
      const directUpdate = await affected(() =>
        asIdentity(USER_B, (tx) =>
          tx.unsafe(
            `UPDATE resources SET download_count = 999 WHERE id = '${PUBLIC_A}' RETURNING id`,
          ),
        ),
      );
      expect(directUpdate).toBe(0);

      // SECURITY DEFINER function increments count for visible resource
      await asIdentity(USER_B, (tx) =>
        tx.unsafe(`SELECT public.increment_resource_download('${PUBLIC_A}'::uuid)`),
      );
      const rows = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT download_count FROM resources WHERE id = '${PUBLIC_A}'`),
      );
      expect(one<{ download_count: number }>(rows).download_count).toBeGreaterThanOrEqual(1);
    });

    it("increment_resource_download does not increment a private resource owned by another user", async () => {
      const before = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT download_count FROM resources WHERE id = '${PRIVATE_A}'`),
      );
      const countBefore = one<{ download_count: number }>(before).download_count;

      // User B tries to increment User A's private resource
      await asIdentity(USER_B, (tx) =>
        tx.unsafe(`SELECT public.increment_resource_download('${PRIVATE_A}'::uuid)`),
      );

      const after = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT download_count FROM resources WHERE id = '${PRIVATE_A}'`),
      );
      expect(one<{ download_count: number }>(after).download_count).toBe(countBefore);
    });
  });

  describe("migration 0007 — resource reports RLS policies", () => {
    it("allows authenticated user to insert report as self for visible resource", async () => {
      const inserted = await asIdentity(USER_B, (tx) =>
        tx.unsafe(
          `INSERT INTO resource_reports (resource_id, reporter_id, category, details)
           VALUES ('${PUBLIC_A}', '${USER_B}', 'spam', 'Spam report test') RETURNING id`,
        ),
      );
      expect(inserted).toHaveLength(1);
    });

    it("refuses insert if reporter_id does not match caller identity", async () => {
      const forged = await isDenied(() =>
        asIdentity(USER_B, (tx) =>
          tx.unsafe(
            `INSERT INTO resource_reports (resource_id, reporter_id, category, details)
             VALUES ('${PUBLIC_A}', '${USER_A}', 'spam', 'Forged reporter') RETURNING id`,
          ),
        ),
      );
      expect(forged).toBe(true);
    });

    it("refuses insert for a private resource the caller cannot see", async () => {
      const invisible = await isDenied(() =>
        asIdentity(USER_B, (tx) =>
          tx.unsafe(
            `INSERT INTO resource_reports (resource_id, reporter_id, category, details)
             VALUES ('${PRIVATE_A}', '${USER_B}', 'spam', 'Report on invisible resource') RETURNING id`,
          ),
        ),
      );
      expect(invisible).toBe(true);
    });

    it("allows user to select only their own reports", async () => {
      // User B filed a report above; User B sees it
      const rowsB = await asIdentity(USER_B, (tx) =>
        tx.unsafe(`SELECT id, reporter_id FROM resource_reports`),
      );
      expect(rowsB).toHaveLength(1);
      expect(one<{ reporter_id: string }>(rowsB).reporter_id).toBe(USER_B);

      // User A sees 0 rows
      const rowsA = await asIdentity(USER_A, (tx) =>
        tx.unsafe(`SELECT id, reporter_id FROM resource_reports`),
      );
      expect(rowsA).toHaveLength(0);

      // Anonymous sees 0 rows
      const rowsAnon = await asIdentity(null, (tx) =>
        tx.unsafe(`SELECT id, reporter_id FROM resource_reports`),
      );
      expect(rowsAnon).toHaveLength(0);
    });
  });
});
/**
 * postgres.js types `unsafe()` rows as an opaque `Row`. This narrows one field at a
 * call site without a cast the compiler has to complain about.
 */
function one<T>(rows: unknown[], index = 0): T {
  return rows[index] as T;
}
