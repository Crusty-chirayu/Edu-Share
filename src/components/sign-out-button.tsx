"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Signs out through the API, then re-renders the tree.
 *
 * The failure case is the one that matters: if the request does not succeed the
 * button says so instead of pretending. A reader who is still signed in must
 * never be told they are not — the next thing they do would fail for a reason
 * the interface had already denied.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Sign-out failed. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Sign-out failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={handleSignOut}
        disabled={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? (
        <span className="err" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
