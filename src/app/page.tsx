import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>EDU-SHARE</h1>
      <p>
        Foundation build (M3): the application boots, validates its environment, and connects to a
        migrated PostgreSQL database. No product features exist yet — see the roadmap (M4+).
      </p>
      <ul>
        <li>
          Health: <Link href="/api/health">/api/health</Link>
        </li>
      </ul>
    </section>
  );
}
