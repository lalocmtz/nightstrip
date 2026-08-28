"use client";

import { useState } from "react";

export function AgeGate({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function accept() {
    setBusy(true);
    await fetch("/api/age", { method: "POST" });
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0a14] p-6 shadow-[0_0_80px_#ff4d8d22]">
        <p className="text-xs tracking-[0.35em] text-[var(--magenta)]">18+ ONLY</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-white">
          NIGHTSTRIP is an adults-only ad board
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Two paid-rank districts. The feed is SFW. Explicit destinations stay behind
          Visitar. We host zero porn and process zero bets. Ranking is advertising,
          not gambling.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={accept}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[var(--cta)] text-sm font-semibold text-black"
        >
          I am 18 or older — enter
        </button>
        <p className="mt-3 text-center text-[11px] text-white/35">
          Built by @lalodtc · English UI · no nightly reset
        </p>
      </div>
    </div>
  );
}
