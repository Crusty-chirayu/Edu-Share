import { describe, expect, it } from "vitest";
import { migrations } from "@/db/migrations";

describe("migrations", () => {
  it("defines a reversible foundation migration", () => {
    expect(migrations.length).toBeGreaterThan(0);
    for (const m of migrations) {
      expect(m.version).toMatch(/^\d{4}$/);
      expect(m.up).toContain("CREATE TABLE");
      expect(m.down).toContain("DROP TABLE");
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

describe("migration 0002 — resource core", () => {
  const core = migrations.find((m) => m.version === "0002");
  const tables = ["profiles", "institutions", "subjects", "resources", "bookmarks"];

  it("is registered as the latest migration", () => {
    const index = core ? migrations.indexOf(core) : -1;
    expect(core).toBeDefined();
    expect(index).toBe(migrations.length - 1);
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
    expect(core?.up).toContain(
      "visibility = 'public' OR owner_id = public.app_current_user_id()",
    );
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
    const found = ["bookmarks", "resources", "subjects", "institutions", "profiles"].map(
      (table) => down.indexOf(`DROP TABLE IF EXISTS ${table};`),
    );
    expect(found.every((position) => position >= 0)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
    expect(down).not.toContain("schema_migrations");
    expect(down).not.toContain("health_probes");
  });
});
