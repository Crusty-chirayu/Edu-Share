import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getEnv } from "@/lib/env";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: PostgresJsDatabase | null = null;

/**
 * Lazy database client. Connection is opened on first query, never at import
 * time — so `next build`, lint, and unit tests never need a live database.
 * Auth boundary only (M3): no product queries live here yet.
 */
export function getDb(): PostgresJsDatabase {
  if (dbInstance) return dbInstance;
  const { DATABASE_URL } = getEnv();
  client = postgres(DATABASE_URL, { max: 10, prepare: true });
  dbInstance = drizzle(client);
  return dbInstance;
}

/** Raw SQL escape hatch for migrations/health checks. */
export function getSql(): ReturnType<typeof postgres> {
  getDb();
  if (!client) throw new Error("Database client not initialised");
  return client;
}

/** Test-only: close the pool and reset singletons. */
export async function __closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 2 });
    client = null;
    dbInstance = null;
  }
}
