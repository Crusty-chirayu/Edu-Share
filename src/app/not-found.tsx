import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Not found</h1>
      <p>The page you asked for does not exist.</p>
      <Link href="/">Back to home</Link>
    </main>
  );
}
