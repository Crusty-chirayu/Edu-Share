"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/ui/toast";

/**
 * Saving a resource to the reader's own shelf.
 *
 * Three decisions, each with a reason:
 *
 *  - **Optimistic.** The label flips immediately and rolls back on a non-2xx
 *    response, because a save is a small, reversible intent and waiting 400ms
 *    for a round trip to acknowledge it feels broken.
 *  - **A toggle, not a writer.** The endpoint is `POST /api/bookmarks` with no
 *    target state, so a retry after a dropped response converges instead of
 *    flipping twice.
 *  - **The label is exactly "Save" / "Saved".** No icon-only button and no
 *    clever copy: the word *is* the accessible name, and `aria-pressed` carries
 *    the state for assistive technology.
 *
 * `keepalive` on the request is what makes the optimistic state honest: the
 * very next thing a reader does is usually click through to the resource, and
 * without it that navigation aborts the write mid-flight.
 */

export function SaveButton({
  resourceId,
  initialSaved,
  size = "sm",
}: {
  resourceId: string;
  initialSaved: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function toggle(): Promise<void> {
    if (pending) return;
    const next = !saved;
    setSaved(next);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId }),
        credentials: "same-origin",
        keepalive: true,
      });
      if (!response.ok) {
        setSaved(!next);
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Could not update your saved list.");
        return;
      }
      const data = (await response.json()) as { bookmarked: boolean };
      setSaved(data.bookmarked);
      setToast(data.bookmarked ? "Saved to your shelf" : "Removed from your shelf");
      router.refresh();
    } catch {
      setSaved(!next);
      setError("Could not update your saved list. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn--${saved ? "accent" : "secondary"}${size === "sm" ? " btn--sm" : ""}`}
        aria-pressed={saved}
        onClick={toggle}
        disabled={pending}
      >
        <Icon name={saved ? "bookmarkOn" : "bookmark"} size={size === "sm" ? 15 : 17} />
        {saved ? "Saved" : "Save"}
      </button>
      {error ? (
        <span className="err" role="alert">
          {error}
        </span>
      ) : null}
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </>
  );
}
