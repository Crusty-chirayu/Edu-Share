import Link from "next/link";
import { AuthForm, type AuthMode } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { isDevAuthEnabled } from "@/lib/auth/development";
import { getSession } from "@/lib/auth/session";
import { isSupabaseAuthConfigured } from "@/lib/auth/supabase-server";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Only same-site relative paths are accepted as a post-sign-in destination: an
 * `https://evil.example` value in `?next=` would otherwise turn this endpoint into an
 * open redirect once the session cookie is set.
 */
function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function AuthPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const next = safeNext(raw.next);
  /** Deep-link target for the footer's "Create account" entry (see AuthForm). */
  const initialIntent = raw.intent === "sign-up" ? ("sign-up" as const) : ("sign-in" as const);
  const session = await getSession();

  const mode: AuthMode = isDevAuthEnabled()
    ? "development"
    : isSupabaseAuthConfigured()
      ? "supabase"
      : "unconfigured";

  if (session) {
    return (
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Account</p>
            <h1>Signed in</h1>
          </div>
        </div>

        <div className="form-card stack">
          <div className="stack-sm">
            <span className="label">Display name</span>
            <span>{session.displayName}</span>
          </div>
          <div className="stack-sm">
            <span className="label">Role</span>
            <span>{session.role}</span>
          </div>
          {session.isDevelopmentIdentity ? (
            <div className="alert alert--info" role="status">
              <span className="alert__title">Development identity</span>
              <span>
                You are signed in through the local development adapter, not Supabase Auth. This
                mode cannot be enabled in production.
              </span>
            </div>
          ) : null}

          <div className="hero__actions">
            <Link href="/profile" className="btn btn--primary">
              Edit profile
            </Link>
            <Link href="/manage" className="btn btn--secondary">
              My uploads
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split">
      <aside className="auth-brand-panel" aria-label="About EDU-SHARE">
        <div>
          <Logo />
          <div style={{ marginTop: "var(--space-12)", maxWidth: "420px" }}>
            <h2 className="auth-brand-title">The passed page. Shared knowledge across campus.</h2>
            <p className="auth-brand-desc">
              Access peer lecture notes, exam summaries, and lab guides organized by real course
              codes. Private materials stay private. No spam, no fake stats.
            </p>
          </div>
        </div>

        <p className="auth-brand-foot">An independent academic resource network.</p>
      </aside>

      <div className="auth-form-panel">
        <div className="section-head" style={{ marginBottom: "var(--space-6)" }}>
          <div>
            <p className="eyebrow">Account</p>
            <h1>{mode === "supabase" ? "Sign in or sign up" : "Sign in"}</h1>
          </div>
        </div>

        <div className="form-card" style={{ marginInline: 0 }}>
          <AuthForm mode={mode} next={next} initialIntent={initialIntent} />
        </div>

        <p className="hint" style={{ marginTop: "var(--space-4)" }}>
          By continuing you agree to share what you upload with the campus community, and to keep
          anything private marked as private.
        </p>
      </div>
    </div>
  );
}
