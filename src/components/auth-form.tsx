"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { postSignInDestination } from "@/lib/auth/destination";

export type AuthMode = "supabase" | "development" | "unconfigured";

interface ApiFailure {
  error?: { message?: string; fields?: Record<string, string> };
}

/**
 * Sign in and create an account.
 *
 * One component renders three shapes, because the *server* decides which
 * identity provider is live and the form must not pretend otherwise:
 *
 *  - `supabase` — email and password, plus a display name when creating;
 *  - `development` — the local adapter has no password by design, so the form
 *    asks for a name and an email and says plainly that this is not a real
 *    account;
 *  - `unconfigured` — nothing is accepted, and the form explains what the
 *    operator has to set rather than failing opaquely on submit.
 *
 * Failures are shown verbatim. The endpoint deliberately returns one sentence
 * for an unknown address and for a wrong password, and this form does not try to
 * be cleverer than that — answering differently would leak which addresses are
 * registered.
 *
 * `?intent=sign-up` only chooses which shape is *rendered*; each endpoint
 * enforces its own validation, so the parameter grants nothing.
 */
export function AuthForm({
  mode,
  next,
  initialIntent = "sign-in",
}: {
  mode: AuthMode;
  next: string;
  initialIntent?: "sign-in" | "sign-up";
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<"sign-in" | "sign-up">(initialIntent);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;

    if (intent === "sign-up" && mode === "supabase" && password !== confirm) {
      setFields({ confirm: "The two passwords do not match." });
      return;
    }

    const payload: Record<string, string> = { email };
    if (mode === "development" || intent === "sign-up") payload.displayName = displayName;
    if (mode === "supabase") payload.password = password;

    setBusy(true);
    setFields({});
    setFormError(null);
    try {
      const response = await fetch(`/api/auth/${intent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | (ApiFailure & { redirectTo?: string })
        | null;

      if (!response.ok) {
        if (body?.error?.fields) setFields(body.error.fields);
        setFormError(body?.error?.message ?? "That did not work. Please try again.");
        return;
      }

      router.push(postSignInDestination(next, body?.redirectTo));
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "unconfigured") {
    return (
      <Alert tone="warning" title="Authentication is not configured">
        <p>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          to enable accounts, or set <code>EDU_SHARE_DEV_AUTH=1</code> to use the development
          identity adapter locally.
        </p>
        <p>
          The library below is unaffected: everything marked public can still be read, and no part
          of this interface can create a session that does not exist.
        </p>
      </Alert>
    );
  }

  const developing = mode === "development";
  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {developing ? (
        <Alert tone="info" title="Development identity adapter">
          <p>
            This deployment is running without Supabase. Any name and email will sign you in — there
            is no password, no account is created, and sessions do not survive a server restart.
            This cannot be enabled in production.
          </p>
        </Alert>
      ) : null}

      {formError ? (
        <Alert tone="error" title="Could not sign in" live>
          <p>{formError}</p>
        </Alert>
      ) : null}

      {mode === "supabase" ? (
        <div className="tabs" role="tablist" aria-label="Account">
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={intent === "sign-in"}
            aria-current={intent === "sign-in" ? "page" : undefined}
            onClick={() => setIntent("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={intent === "sign-up"}
            aria-current={intent === "sign-up" ? "page" : undefined}
            onClick={() => setIntent("sign-up")}
          >
            Create account
          </button>
        </div>
      ) : null}

      {intent === "sign-up" || developing ? (
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
            autoComplete="name"
            maxLength={80}
            required
            aria-invalid={Boolean(fields.displayName)}
          />
          {fields.displayName ? (
            <span className="err" role="alert">
              {fields.displayName}
            </span>
          ) : (
            <span className="hint">The name other students see beside anything you share.</span>
          )}
        </div>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="email">
          Email
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          aria-invalid={Boolean(fields.email)}
        />
        {fields.email ? (
          <span className="err" role="alert">
            {fields.email}
          </span>
        ) : (
          <span className="hint">Never shown on any page another member can open.</span>
        )}
      </div>

      {mode === "supabase" ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={intent === "sign-in" ? "current-password" : "new-password"}
              minLength={intent === "sign-up" ? 8 : 1}
              maxLength={72}
              required
              aria-invalid={Boolean(fields.password)}
            />
            {fields.password ? (
              <span className="err" role="alert">
                {fields.password}
              </span>
            ) : (
              <span className="hint">
                {intent === "sign-up" ? "At least 8 characters." : "Your existing password."}
              </span>
            )}
          </div>

          {intent === "sign-up" ? (
            <div className="field">
              <label className="field__label" htmlFor="confirm">
                Confirm password
              </label>
              <input
                className="input"
                id="confirm"
                name="confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                maxLength={72}
                required
                aria-invalid={Boolean(fields.confirm)}
              />
              {fields.confirm ? (
                <span className="err" role="alert">
                  {fields.confirm}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
        {busy
          ? "Working…"
          : developing
            ? "Continue"
            : intent === "sign-up"
              ? "Create account"
              : "Sign in"}
      </button>
    </form>
  );
}
