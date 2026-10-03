import { describe, expect, it } from "vitest";
import { migrations } from "@/db/migrations";

describe("migrations", () => {
  it("defines a reversible migration", () => {
    expect(migrations.length).toBeGreaterThan(0);
    for (const m of migrations) {
      expect(m.version).toMatch(/^\d{4}$/);
      // A migration may add tables, views, functions, or columns over them
      // either way it must be reversible.
      expect(m.up).toMatch(
        /CREATE TABLE|CREATE OR REPLACE VIEW|CREATE OR REPLACE FUNCTION|ALTER TABLE/,
      );
      expect(m.down).toMatch(/DROP TABLE|DROP VIEW|DROP FUNCTION|ALTER TABLE/);
    }
  });

  it("keeps version identifiers unique and strictly ordered", () => {
    const versions = migrations.map((m) => m.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort());
    expect(new Set(migrations.map((m) => m.name)).size).toBe(versions.length);
  });

  it("migration 0001 covers the journal and the health probe", () => {
    const first = migrations[0];
    expect(first?.up).toContain("schema_migrations");
    expect(first?.up).toContain("health_probes");
  });
});

describe("migration 0002 â€” resource core", () => {
  const core = migrations.find((m) => m.version === "0002");
  const tables = ["profiles", "institutions", "subjects", "resources", "bookmarks"];

  it("is registered before the profile-visibility migration", () => {
    const index = core ? migrations.indexOf(core) : -1;
    expect(core).toBeDefined();
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(migrations.length - 1);
  });

  it("creates every resource-lifecycle table", () => {
    for (const table of tables) {
      expect(core?.up).toContain(`CREATE TABLE IF NOT EXISTS ${table} (`);
    }
  });

  it("indexes the queries the product actually runs", () => {
    for (const index of [
      "resources_owner_idx",
      "resources_subject_idx",
      "resources_public_feed_idx",
      "resources_search_idx",
      "bookmarks_resource_idx",
    ]) {
      expect(core?.up).toContain(index);
    }
  });

  it("enables RLS everywhere and never disables it", () => {
    for (const table of tables) {
      expect(core?.up).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(core?.up).not.toContain("DISABLE ROW LEVEL SECURITY");
  });

  it("scopes resource access to the owner or to public visibility", () => {
    expect(core?.up).toContain("visibility = 'public' OR owner_id = public.app_current_user_id()");
    expect(core?.up).toContain("CREATE POLICY resources_insert_own ON resources FOR INSERT");
    expect(core?.up).toContain("CREATE POLICY resources_update_own ON resources FOR UPDATE");
    expect(core?.up).toContain("CREATE POLICY resources_delete_own ON resources FOR DELETE");
    expect(core?.up).toContain("CREATE POLICY bookmarks_own ON bookmarks FOR ALL");
  });

  it("keeps the taxonomy readable but not writable by clients", () => {
    expect(core?.up).toContain("CREATE POLICY subjects_read ON subjects FOR SELECT USING (true)");
    expect(core?.up).not.toContain("CREATE POLICY subjects_insert");
    expect(core?.up).not.toContain("CREATE POLICY subjects_delete");
  });

  it("defines the RLS identity bridge and removes it on the way down", () => {
    expect(core?.up).toContain("FUNCTION public.app_current_user_id()");
    expect(core?.down).toContain("DROP FUNCTION IF EXISTS public.app_current_user_id();");
  });

  it("reverses its own tables in reverse dependency order and never touches M3 tables", () => {
    const down = core?.down ?? "";
    const found = ["bookmarks", "resources", "subjects", "institutions", "profiles"].map((table) =>
      down.indexOf(`DROP TABLE IF EXISTS ${table};`),
    );
    expect(found.every((position) => position >= 0)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
    expect(down).not.toContain("schema_migrations");
    expect(down).not.toContain("health_probes");
  });
});

describe("migration 0003 â€” profile privacy bridge", () => {
  const bridge = migrations.find((m) => m.version === "0003");

  it("is registered before the privilege-guard migration", () => {
    const versions = migrations.map((m) => m.version);
    expect(versions).toContain("0003");
    expect(versions.indexOf("0003")).toBeLessThan(versions.length - 1);
    expect(bridge).toBeDefined();
    expect(bridge?.up).toContain("CREATE OR REPLACE VIEW");
    expect(bridge?.down).toContain("DROP VIEW IF EXISTS public.public_profiles;");
  });

  it("publishes a projection that has no email column at all", () => {
    const view = bridge?.up.split("CREATE OR REPLACE VIEW")[1]?.split(";")[0] ?? "";
    expect(view).toContain("security_invoker = true");
    expect(view).toContain("SELECT id, display_name, role, created_at FROM public.profiles");
    expect(view).not.toContain("email");
  });

  it("narrows profiles_read so a private resource stops exposing its author", () => {
    expect(bridge?.up).toContain("CREATE POLICY profiles_read ON profiles FOR SELECT USING (");
    expect(bridge?.up).toContain("r.visibility = 'public'");
    // The 0002 policy â€” author of *any* resource â€” must be gone from `up`â€¦
    expect(bridge?.up).not.toMatch(
      /EXISTS \(SELECT 1 FROM resources r\s+WHERE r\.owner_id = profiles\.id\)\s*\)/,
    );
    // â€¦and restored verbatim by `down`, so the migration really reverses.
    expect(bridge?.down).toContain(
      "OR EXISTS (SELECT 1 FROM resources r WHERE r.owner_id = profiles.id)",
    );
    expect(bridge?.down).not.toContain("r.visibility = 'public'");
  });

  it("hands out the session-bridge function only to the server", () => {
    expect(bridge?.up).toContain("public.app_profile_for_auth_user(p_auth_user_id uuid)");
    expect(bridge?.up).toContain("SECURITY DEFINER");
    expect(bridge?.up).toContain(
      "REVOKE ALL ON FUNCTION public.app_profile_for_auth_user(uuid) FROM PUBLIC;",
    );
    expect(bridge?.down).toContain(
      "DROP FUNCTION IF EXISTS public.app_profile_for_auth_user(uuid);",
    );
  });

  it("never disables row-level security", () => {
    expect(bridge?.up).not.toContain("DISABLE ROW LEVEL SECURITY");
    expect(bridge?.down).not.toContain("DISABLE ROW LEVEL SECURITY");
  });
});

describe("migration 0004 — profiles privilege guard", () => {
  const guard = migrations.find((m) => m.version === "0004");

  it("is registered and is reversible", () => {
    expect(guard).toBeDefined();
    expect(guard?.up).toContain(
      "CREATE OR REPLACE FUNCTION public.profiles_guard_privilege_columns()",
    );
    expect(guard?.down).toContain(
      "DROP FUNCTION IF EXISTS public.profiles_guard_privilege_columns();",
    );
    expect(guard?.down).toContain("DROP TRIGGER IF EXISTS profiles_guard_privilege_columns");
  });

  it("guards both privilege columns in a BEFORE UPDATE trigger", () => {
    // Regression guard for the SG-3 finding: `profiles_update_self` scopes rows, not
    // columns, so without this trigger a client holding table-level UPDATE could set
    // its own role to admin.
    expect(guard?.up).toContain("BEFORE UPDATE ON public.profiles");
    expect(guard?.up).toContain("NEW.role IS DISTINCT FROM OLD.role");
    expect(guard?.up).toContain("NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id");
    expect(guard?.up).toContain("server-managed columns");
  });

  it("exempts privileged callers so the server can still provision profiles", () => {
    expect(guard?.up).toContain("rolsuper");
    expect(guard?.up).toContain("rolbypassrls");
    expect(guard?.up).toContain("pg_get_userbyid");
  });

  it("never disables row-level security", () => {
    expect(guard?.up).not.toContain("DISABLE ROW LEVEL SECURITY");
    expect(guard?.down).not.toContain("DISABLE ROW LEVEL SECURITY");
  });
});

describe("migration 0005 — academic context", () => {
  const academic = migrations.find((m) => m.version === "0005");

  it("adds resource_type with check constraint and default 'other'", () => {
    expect(academic).toBeDefined();
    expect(academic?.up).toContain("ALTER TABLE resources ADD COLUMN IF NOT EXISTS resource_type");
    expect(academic?.up).toContain("DEFAULT 'other'");
    expect(academic?.up).toContain("lecture_notes");
    expect(academic?.up).toContain("study_notes");
    expect(academic?.up).toContain("CREATE INDEX IF NOT EXISTS resources_type_idx");
    expect(academic?.down).toContain("DROP INDEX IF EXISTS resources_type_idx");
    expect(academic?.down).toContain("DROP COLUMN IF EXISTS resource_type");
  });

  it("adds department and semester to subjects reversibly", () => {
    expect(academic?.up).toContain("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department");
    expect(academic?.up).toContain("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS semester");
    expect(academic?.down).toContain("DROP COLUMN IF EXISTS semester");
    expect(academic?.down).toContain("DROP COLUMN IF EXISTS department");
  });
});

describe("migration 0006 — download count", () => {
  const dl = migrations.find((m) => m.version === "0006");

  it("adds download_count column and SECURITY DEFINER increment function", () => {
    expect(dl).toBeDefined();
    expect(dl?.up).toContain("ALTER TABLE resources ADD COLUMN IF NOT EXISTS download_count");
    expect(dl?.up).toContain("CREATE OR REPLACE FUNCTION public.increment_resource_download");
    expect(dl?.up).toContain("SECURITY DEFINER");
    expect(dl?.up).toContain("app_current_user_id()");
    expect(dl?.down).toContain("DROP FUNCTION IF EXISTS public.increment_resource_download");
    expect(dl?.down).toContain("DROP COLUMN IF EXISTS download_count");
  });
});

describe("migration 0007 — resource reports", () => {
  const reports = migrations.find((m) => m.version === "0007");

  it("creates resource_reports table with RLS and unique constraint", () => {
    expect(reports).toBeDefined();
    expect(reports?.up).toContain("CREATE TABLE IF NOT EXISTS resource_reports");
    expect(reports?.up).toContain("ALTER TABLE resource_reports ENABLE ROW LEVEL SECURITY");
    expect(reports?.up).toContain("CREATE POLICY resource_reports_insert_own");
    expect(reports?.up).toContain("CREATE POLICY resource_reports_select_own");
    expect(reports?.up).toContain("UNIQUE (reporter_id, resource_id)");
    expect(reports?.down).toContain("DROP TABLE IF EXISTS resource_reports");
  });
});

describe("migrations 0005-0007 reversibility and data preservation", () => {
  it("migrations 0005, 0006, 0007 have working down steps that fully clean up additions", () => {
    const m5 = migrations.find((m) => m.version === "0005");
    const m6 = migrations.find((m) => m.version === "0006");
    const m7 = migrations.find((m) => m.version === "0007");

    expect(m5?.down).toContain("DROP INDEX IF EXISTS resources_type_idx");
    expect(m5?.down).toContain("ALTER TABLE resources DROP COLUMN IF EXISTS resource_type");
    expect(m5?.down).toContain("ALTER TABLE subjects DROP COLUMN IF EXISTS semester");
    expect(m5?.down).toContain("ALTER TABLE subjects DROP COLUMN IF EXISTS department");

    expect(m6?.down).toContain("DROP FUNCTION IF EXISTS public.increment_resource_download(UUID)");
    expect(m6?.down).toContain("ALTER TABLE resources DROP COLUMN IF EXISTS download_count");

    expect(m7?.down).toContain(
      "DROP POLICY IF EXISTS resource_reports_select_own ON resource_reports",
    );
    expect(m7?.down).toContain(
      "DROP POLICY IF EXISTS resource_reports_insert_own ON resource_reports",
    );
    expect(m7?.down).toContain("DROP TABLE IF EXISTS resource_reports");
  });

  it("migrations 0005-0007 preserve existing row validity with defaults and nullable additions", () => {
    const m5 = migrations.find((m) => m.version === "0005");
    const m6 = migrations.find((m) => m.version === "0006");

    // resource_type has a non-null DEFAULT 'other', so existing rows stay valid
    expect(m5?.up).toContain("DEFAULT 'other'");
    // department and semester are nullable, so existing subjects stay valid
    expect(m5?.up).toContain("department TEXT");
    expect(m5?.up).toContain("semester SMALLINT");
    expect(m5?.up).not.toMatch(/department TEXT NOT NULL/);
    expect(m5?.up).not.toMatch(/semester SMALLINT NOT NULL/);

    // download_count has DEFAULT 0, so existing resources stay valid
    expect(m6?.up).toContain("DEFAULT 0");
  });
});
