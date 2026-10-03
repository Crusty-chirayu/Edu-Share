"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * Deleting a resource.
 *
 * Deleting is the one irreversible action in the product, so it asks first, and
 * the confirmation **names what is about to disappear** and states the
 * consequence — including how many people have it saved. A dialog that only
 * asks "are you sure?" is asking the reader to remember what they clicked.
 *
 * The request itself is `DELETE /api/resources/:id`, which is owner-scoped in
 * SQL: a non-owner receives the same 404 a missing row does, so this control
 * cannot be used to probe for anyone else's resource.
 */
export function DeleteResourceButton({
  resourceId,
  resourceTitle,
  saveCount,
}: {
  resourceId: string;
  resourceTitle: string;
  saveCount: number;
}) {
  const router = useRouter();

  async function remove(): Promise<string | null> {
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        return body?.error?.message ?? "Could not delete that resource.";
      }
      router.push("/manage");
      router.refresh();
      return null;
    } catch {
      return "Could not delete that resource. Check your connection and try again.";
    }
  }

  return (
    <ConfirmDialog
      id={`delete-${resourceId}`}
      title={`Delete “${resourceTitle}”?`}
      triggerLabel="Delete"
      confirmLabel="Delete resource"
      pendingLabel="Deleting…"
      onConfirm={remove}
    >
      <p>
        The record and the stored file are removed together
        {saveCount > 0
          ? `, and the ${saveCount} ${saveCount === 1 ? "save" : "saves"} it has go with it`
          : ""}
        . This cannot be undone, and any link to it will stop working.
      </p>
      {saveCount > 0 ? (
        <p>
          If you only want it out of the public library, edit it and switch the visibility to
          private instead — that keeps everyone’s links working for you.
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
