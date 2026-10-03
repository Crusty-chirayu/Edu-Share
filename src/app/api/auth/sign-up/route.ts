import type { NextRequest } from "next/server";
import { handleAuthPost } from "@/lib/auth/endpoints";

/** `POST /api/auth/sign-up` — creates an account, or a development identity locally. */
export function POST(request: NextRequest) {
  return handleAuthPost(request, "sign-up");
}
