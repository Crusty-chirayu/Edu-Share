import type postgres from "postgres";
import { getSql } from "@/db/client";
import { AppError } from "@/lib/errors";
import type { BuiltQuery } from "@/lib/sql";

/**
 * Shared query plumbing for the data-access layer.
 *
 * `run` is the only place a statement is executed: it takes a query produced by the
 * pure builders in `src/lib/sql.ts` and hands the values array to postgres.js as
 * parameters. Keeping it to one function is what makes "no runtime value is
 * concatenated into SQL" a property that can be reviewed in a single place.
 */

export type Sql = postgres.Sql;

export async function run<T extends object[]>(sql: Sql, query: BuiltQuery): Promise<T> {
  return sql.unsafe<T>(query.text, query.values as (string | number | null)[]) as Promise<T>;
}

/**
 * Maps any driver failure onto the domain error vocabulary.
 *
 * The original error is deliberately dropped: a PostgreSQL error can carry the
 * relation name, the offending value, or (on a DSN parse failure) the whole
 * connection string, and none of that may reach a response body or a log line
 * written through the public error path.
 */
export async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      throw AppError.conflict("An item with this value already exists.");
    }
    if (code === "23503") {
      throw AppError.conflict("Referenced item does not exist or has active dependencies.");
    }
    throw AppError.database();
  }
}

/**
 * Runs `fn` inside a transaction whose `app.user_id` is the caller's **verified**
 * profile id, so the RLS policies from migration 0002 apply to every statement it
 * issues.
 *
 * `set_config('app.user_id', $1, true)` is the `true` that matters: the setting is
 * transaction-local, so it cannot leak to the next borrower of a pooled connection.
 * Passing `null` establishes an explicitly anonymous transaction.
 */
export async function withIdentity<T>(
  profileId: string | null,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const root = getSql();
  try {
    // `unknown` erases postgres.js's `UnwrapPromiseArray<T>` conditional type,
    // which TypeScript cannot prove equal to `T` for a generic parameter.
    const result: unknown = await root.begin(async (tx) => {
      if (profileId) {
        await tx.unsafe(`SELECT set_config('app.user_id', $1, true)`, [profileId]);
      }
      return await fn(tx as Sql);
    });
    return result as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      throw AppError.conflict("An item with this value already exists.");
    }
    if (code === "23503") {
      throw AppError.conflict("Referenced item does not exist or has active dependencies.");
    }
    throw AppError.database();
  }
}
