import Link from "next/link";
import { State } from "@/components/ui/state";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
      <State
        icon="file"
        title="Page not found"
        level={1}
        actions={
          <div
            className="actions-cluster"
            style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}
          >
            <Link href="/" className="btn btn--primary">
              Back to home
            </Link>
            <Link href="/browse" className="btn btn--secondary">
              Browse library
            </Link>
          </div>
        }
      >
        <p>The page or resource you requested does not exist or may have been removed.</p>
      </State>
    </div>
  );
}
