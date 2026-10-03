import type { NextRequest } from "next/server";
import { handleAuthPost } from "@/lib/auth/endpoints";

/** `POST /api/auth/sign-in` — verifies credentials and issues the session cookies. */
export function POST(request: NextRequest) {
  return handleAuthPost(request, "sign-in");
}
