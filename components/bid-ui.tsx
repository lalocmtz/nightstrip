"use client";

import { useEffect, useMemo, useState } from "react";
import { DISTRICT_META, MIN_BID_USD, TAKE_STEP_USD, type District } from "@/lib/constants";
import { usd } from "@/lib/money";

export type ClientListing = {
  id: string;
  district: District;
  name: string;
  handle: string;
  url: string;
  bid: number;
  clicks: number;
  createdAt: number;
  updatedAt: number;
  rank: number;
  nights: number;
};

export type ClientBoard = {
  generatedAt: number;
  demoPayments: boolean;
  boardValue: number;
  allTimePot: number;
  districts: Record<
    District,
    { listings: ClientListing[]; boardValue: number; takeNumberOne: number }
  >;
};

export function BidForm({
  district,
  takeNumberOne,
  identity,
  onIdentity,
  bid,
  onBid,
  busy,
  error,
  onSubmit,
  compact,
  amountDue,
  alreadyListed,
}: {
  district: District;
  takeNumberOne: number;
  identity: string;
  onIdentity: (value: string) => void;
  bid: number;
  onBid: (value: number) => void;
  busy: boolean;
  error: string;
  onSubmit: () => void;
  compact?: boolean;
  amountDue?: number;
  alreadyListed?: boolean;
}) {
  const meta = DISTRICT_META[district];
  const min = Math.max(MIN_BID_USD, takeNumberOne);
  const amount = Math.max(min, bid);
  const due = amountDue ?? amount;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          {alreadyListed ? "Raise your bid to" : "Claim this spot at"}
        </p>
        <span className="text-[11px] uppercase tracking-wider" style={{ color: meta.hex }}>
          {meta.short} only
        </span>
      </div>
      <div className="flex items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <button
          type="button"
          className="h-12 w-12 text-xl text-white/70"
          onClick={() => onBid(Math.max(min, amount - TAKE_STEP_USD))}
          aria-label="Decrease bid"
        >
          −
        </button>
        <div className="flex-1 text-center font-[family-name:var(--font-display)] text-2xl text-white">
          {usd(amount)}
        </div>
        <button
          type="button"
          className="h-12 w-12 text-xl text-white/70"
          onClick={() => onBid(amount + TAKE_STEP_USD)}
          aria-label="Increase bid"
        >
          +
        </button>
      </div>
      <input
        value={identity}
        onChange={(event) => onIdentity(event.target.value)}
        placeholder="Name, URL or @handle."
        className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--cta)]"
      />
      <button
        type="submit"
        disabled={busy}
        className="h-12 rounded-2xl bg-[var(--cta)] text-sm font-bold text-black disabled:opacity-60"
      >
        Claim · pay {usd(due)}
      </button>
      {error ? <p className="text-xs text-[var(--magenta)]">{error}</p> : null}
      {alreadyListed ? (
        <p className="text-[11px] leading-5 text-white/55">
          Your total bid becomes {usd(amount)}. You only pay the {usd(due)} difference.
        </p>
      ) : null}
      {!compact ? (
        <p className="text-[11px] leading-5 text-white/40">
          Min +$5 · pay the difference · stay ranked until outbid · this side only.
        </p>
      ) : null}
    </form>
  );
}

export function DistrictToggle({
  value,
  onChange,
}: {
  value: District;
  onChange: (value: District) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-full border border-white/10 p-1">
      {(["casino", "red"] as District[]).map((item) => {
        const active = value === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className="rounded-full py-2 text-xs font-semibold"
            style={{
              color: active ? DISTRICT_META[item].hex : "rgba(255,255,255,0.45)",
              boxShadow: active ? `inset 0 0 0 1px ${DISTRICT_META[item].hex}` : undefined,
            }}
          >
            {DISTRICT_META[item].short}
          </button>
        );
      })}
    </div>
  );
}

export function useBoard(initial: {
  board: ClientBoard;
  credits: number;
  demoPayments: boolean;
}) {
  const [board, setBoard] = useState<ClientBoard | null>(initial.board);
  const [credits, setCredits] = useState(initial.credits);
  const [demoPayments, setDemoPayments] = useState(initial.demoPayments);

  async function refresh() {
    const [boardRes, meRes] = await Promise.all([fetch("/api/board"), fetch("/api/me")]);
    const boardJson = (await boardRes.json()) as ClientBoard;
    const meJson = (await meRes.json()) as {
      credits: number;
      demoPayments: boolean;
    };
    setBoard(boardJson);
    setCredits(meJson.credits);
    setDemoPayments(meJson.demoPayments);
  }

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 12000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const latest = useMemo(() => {
    if (!board) return [];
    return [...board.districts.casino.listings, ...board.districts.red.listings]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6);
  }, [board]);

  return { board, credits, demoPayments, refresh, setCredits, latest };
}
