"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";

interface ApiFailure {
  error?: { message?: string; fields?: Record<string, string> };
}

/**
 * Editing your own profile.
 *
 * The endpoint accepts exactly two values: `displayName` and `email`. There is
 * no `id` field (the server uses the session's own profile id) and no `role`
 * field, so this form cannot be used to escalate anything even if the payload
 * is rewritten by hand.
 *
 * The email box is blank on purpose. The public projection has no email column
 * at all, so this deployment genuinely cannot show you your current address —
 * pretending otherwise would be a field that lies. Leaving it empty keeps the
 * address unchanged, and the label says so.
 */
export function ProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;

    const payload: Record<string, string> = { displayName };
    if (email.trim() !== "") payload.email = email.trim();

    setBusy(true);
    setFields({});
    setFormError(null);
    setSaved(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as ApiFailure | null;

      if (!response.ok) {
        if (body?.error?.fields) setFields(body.error.fields);
        setFormError(body?.error?.message ?? "Could not save your profile.");
        return;
      }

      setSaved("Profile updated.");
      setEmail("");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert tone="error" title="Could not save" live>
          <p>{formError}</p>
        </Alert>
      ) : null}

      {saved ? (
        <Alert tone="success" title={saved}>
          <p>The change is live everywhere your name appears.</p>
        </Alert>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="displayName">
          Display name
        </label>
        <input
          className="input"
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
          required
          aria-invalid={Boolean(fields.displayName)}
        />
        {fields.displayName ? (
          <span className="err" role="alert">
            {fields.displayName}
          </span>
        ) : (
          <span className="hint">
            Shown next to everything you share. It is the only part of your account anyone else can
            see.
          </span>
        )}
      </div>

      <div className="field">
        <div className="field__row">
          <label className="field__label" htmlFor="email">
            Email
          </label>
          <span className="field__optional">leave blank to keep</span>
        </div>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          maxLength={254}
          aria-invalid={Boolean(fields.email)}
        />
        {fields.email ? (
          <span className="err" role="alert">
            {fields.email}
          </span>
        ) : (
          <span className="hint">
            Never shown publicly, and not part of any page another member can open. Your current
            address is not sent back to this screen at all.
          </span>
        )}
      </div>

      <div className="btn-group">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
