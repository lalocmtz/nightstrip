"use client";

import Link from "next/link";
import { useState } from "react";
import type { District } from "@/lib/constants";
import { DISTRICT_META } from "@/lib/constants";

export function LeaveGate({
  id,
  name,
  district,
  url,
  aged,
}: {
  id: string;
  name: string;
  district: District;
  url: string;
  aged: boolean;
}) {
  const [allowed, setAllowed] = useState(aged || district === "casino");
  const [busy, setBusy] = useState(false);
  const meta = DISTRICT_META[district];
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  async function confirmAge() {
    setBusy(true);
    await fetch("/api/age", { method: "POST" });
    setAllowed(true);
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.3em] text-[var(--muted)]">LEAVING NIGHTSTRIP</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-white">
        {name}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        NIGHTSTRIP hosts zero adult media and processes zero bets. Visitar sends you
        off-site to <span className="text-white">{host}</span>
        {district === "red"
          ? " — an 18+ destination we do not control or cache."
          : " — an advertiser destination we do not control."}
      </p>
      <p className="mt-2 text-xs" style={{ color: meta.hex }}>
        {meta.label}
      </p>
      {!allowed ? (
        <button
          type="button"
          disabled={busy}
          onClick={confirmAge}
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--cta)] px-6 font-semibold text-black"
        >
          I am 18 or older
        </button>
      ) : (
      <Link
        href={`/api/visit/${id}`}
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--cta)] px-6 font-semibold text-black"
      >
        Continue off-site
      </Link>
      )}
      <Link href="/" className="mt-4 text-center text-sm text-white/50">
        Cancel
      </Link>
    </main>
  );
}
