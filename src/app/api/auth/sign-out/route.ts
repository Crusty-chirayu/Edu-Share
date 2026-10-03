import type { NextRequest } from "next/server";
import { handleSignOut } from "@/lib/auth/endpoints";

/** `POST /api/auth/sign-out` — clears the local session unconditionally. */
export function POST(request: NextRequest) {
  return handleSignOut(request);
}
