import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-xs tracking-[0.3em] text-[var(--muted)]">NIGHTSTRIP</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-white">Not found</h1>
      <Link href="/" className="mt-8 text-[var(--cta)]">
        Back to the Board
      </Link>
    </main>
  );
}
