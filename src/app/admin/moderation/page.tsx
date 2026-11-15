import Link from "next/link";
import { redirect } from "next/navigation";
import { ModerationClient } from "@/components/admin/moderation-client";
import { requireSession } from "@/lib/auth/session";
import { withIdentity } from "@/db/query";
import { listReports } from "@/db/moderation";

export const metadata = {
  title: "Content Moderation — EDU-SHARE Admin",
  description: "Administrative moderation queue and decision audit log.",
};

export default async function AdminModerationPage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect("/auth?next=/admin/moderation");
  }

  if (session.role !== "admin") {
    return (
      <div
        className="container"
        style={{ padding: "var(--space-12) var(--space-4)", maxWidth: 640 }}
      >
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
          <h1 style={{ fontSize: "var(--fs-h2)", marginBottom: "var(--space-3)" }}>
            Access Restricted
          </h1>
          <p style={{ color: "var(--c-ink-2)", marginBottom: "var(--space-6)" }}>
            This interface requires verified Administrator privilege. Your current account role is{" "}
            <strong>{session.role}</strong>.
          </p>
          <Link href="/" className="btn btn--primary">
            Return to Library
          </Link>
        </div>
      </div>
    );
  }

  const reportsData = await withIdentity(session.profileId, async (sql) => {
    return listReports(sql, { status: "open" });
  }).catch(() => ({ items: [], total: 0 }));

  return <ModerationClient initialReports={reportsData.items} initialTotal={reportsData.total} />;
}
