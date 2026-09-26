import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * M3 foundation schema — intentionally minimal, no product tables yet.
 * The first reversible migration creates only the journal + a health probe table.
 * Product tables (users, taxonomy, resources, …) arrive in M5–M7 per roadmap.
 */
export const schemaMigrations = pgTable("schema_migrations", {
  version: text("version").primaryKey(),
  name: text("name").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});

export const healthProbes = pgTable("health_probes", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
