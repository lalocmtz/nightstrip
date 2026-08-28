import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function PendingReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.3em] text-[var(--muted)]">NIGHTSTRIP</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-white">
        Payment received — waiting on chain
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        NOWPayments will confirm the transfer. Your rank is applied when the signed
        IPN arrives. This page does not credit anything by itself.
      </p>
      {order ? (
        <p className="mt-6 text-xs text-white/50">Order {order}</p>
      ) : null}
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--cta)] px-6 font-semibold text-black"
      >
        Back to the Board
      </Link>
    </main>
  );
}
