import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError, jsonValidationError, readJsonBody } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { updateProfile } from "@/db/profiles";
import { parseOrThrow, profileUpdateSchema } from "@/lib/validation";

/**
 * `PATCH /api/profile` — edit the caller's own display name and email.
 *
 * The id in the statement is `session.profileId`, taken from the verified identity.
 * A body that contains an `id` is not merely ignored — it is not part of the schema,
 * so it is rejected. `role` is likewise absent: there is no field here that can
 * promote anyone, which closes the inherited `AUD-002` finding at the API boundary as
 * well as in SQL.
 *
 * The response is a `PublicProfile`, which has no `email` column: this deployment's
 * public projection never returns one, and this endpoint does not change that.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const input = parseOrThrow(profileUpdateSchema, await readJsonBody(request));

    if (input.displayName === undefined && input.email === undefined) {
      return jsonValidationError({ form: "Provide a display name or an email address to update." });
    }

    const profile = await withIdentity(session.profileId, (tx) => {
      // Built conditionally: with `exactOptionalPropertyTypes`, an explicit
      // `undefined` is not the same as an absent field, and an absent field is what
      // tells `buildProfileUpdateQuery` to leave the column alone.
      const patch: { displayName?: string; email?: string | null } = {};
      if (input.displayName !== undefined) patch.displayName = input.displayName;
      if (input.email !== undefined) patch.email = input.email;
      return updateProfile(tx, session.profileId, patch);
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
