import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/auth/session";
import { loadPublicProfile } from "@/lib/catalog";
import { formatDate } from "@/lib/format";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/auth?next=/profile");

  const profileResult = await loadPublicProfile(session.profileId);
  const profile = profileResult.ok ? profileResult.data : null;
  const initialLetter = (session.displayName[0] ?? "U").toUpperCase();

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="section-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
        </div>
        <Link href="/manage" className="btn btn--ghost btn--sm">
          My uploads
        </Link>
      </div>

      <div className="stack" style={{ gap: "var(--space-6)" }}>
        <div
          className="card"
          style={{ display: "flex", gap: "var(--space-5)", alignItems: "center" }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--c-brand-tint)",
              color: "var(--c-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
          >
            {initialLetter}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-1)",
              }}
            >
              <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{session.displayName}</h2>
              <span className="badge badge--role">{session.role}</span>
            </div>
            <p style={{ color: "var(--c-ink-3)", fontSize: "var(--fs-meta)", margin: 0 }}>
              Member since {profile?.createdAt ? formatDate(profile.createdAt) : "recently"}
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="card">
          <h2 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--space-3)" }}>
            Session information
          </h2>
          <dl className="dl" style={{ margin: 0 }}>
            <dt>Role</dt>
            <dd style={{ textTransform: "capitalize" }}>{session.role}</dd>

            <dt>Signed in with</dt>
            <dd>{session.mode === "development" ? "Development adapter" : "Supabase Auth"}</dd>
          </dl>

          {session.isDevelopmentIdentity ? (
            <div
              className="alert alert--info"
              role="status"
              style={{ marginTop: "var(--space-4)" }}
            >
              <span className="alert__title">Development identity</span>
              <span>
                This account exists only in the local dev server: there is no password, and signing
                out (or restarting the server) ends it. It is hard-blocked in production by
                environment validation.
              </span>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--space-3)" }}>
            Edit display name
          </h2>
          <ProfileForm initialDisplayName={session.displayName} />
        </div>
      </div>
    </div>
  );
}
