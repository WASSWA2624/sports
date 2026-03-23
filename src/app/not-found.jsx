import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-empty">
      <h1>Page not found</h1>
      <p>The route you asked for is outside the current sports map or the record no longer exists.</p>
      <Link href="/en">Return to home</Link>
    </main>
  );
}
