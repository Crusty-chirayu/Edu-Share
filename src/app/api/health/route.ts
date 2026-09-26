import { NextResponse } from "next/server";
import { getSql } from "@/db/client";
import { getEnv } from "@/lib/env";

/**
 * GET /api/health — liveness + database reachability.
 * Returns 200 { status: "ok", db: "up" } or 503 { status: "degraded", db: "down" }.
 * Never leaks connection strings, stack traces, or row contents.
 */
export async function GET(): Promise<NextResponse> {
  let db: "up" | "down" = "down";
  try {
    getEnv();
    const sql = getSql();
    await sql`SELECT 1 AS one`;
    db = "up";
  } catch {
    db = "down";
  }
  const status = db === "up" ? "ok" : "degraded";
  return NextResponse.json({ status, db }, { status: db === "up" ? 200 : 503 });
}
