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

  it("migration 0001 covers the journal and the health probe", () => {
    const first = migrations[0];
    expect(first?.up).toContain("schema_migrations");
    expect(first?.up).toContain("health_probes");
  });
});
