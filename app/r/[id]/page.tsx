import { notFound } from "next/navigation";
import Link from "next/link";
import { DISTRICT_META } from "@/lib/constants";
import { usd } from "@/lib/money";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await readStore((state) =>
    state.receipts.find((item) => item.id === id),
  );
  if (!receipt) notFound();
  const meta = DISTRICT_META[receipt.district];

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.3em] text-[var(--muted)]">NIGHTSTRIP RECEIPT</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-white">
        Paid rank locked
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Advertising slot only. No bets processed. No adult media hosted.
      </p>
      <dl className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm">
        <Row label="Receipt" value={receipt.id} />
        <Row label="District" value={meta.label} accent={meta.hex} />
        <Row label="Listing" value={receipt.name} />
        <Row label="Rank at purchase" value={`#${receipt.rank}`} />
        <Row label="Bid" value={usd(receipt.bid)} />
        <Row label="Paid" value={usd(receipt.amountPaid)} />
        <Row label="Mode" value={receipt.demo ? "Demo credits" : "NOWPayments"} />
        <Row label="When" value={new Date(receipt.createdAt).toISOString()} />
      </dl>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--cta)] px-6 font-semibold text-black"
      >
        Back to the Board
      </Link>
    </main>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-medium" style={accent ? { color: accent } : undefined}>
        {value}
      </dd>
    </div>
  );
}
