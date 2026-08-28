"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AgeGate } from "@/components/AgeGate";
import {
  BidForm,
  DistrictToggle,
  useBoard,
  type ClientListing,
} from "@/components/bid-ui";
import { HeroCard, RankRow, RankingRail } from "@/components/BoardBits";
import { ReelFeed } from "@/components/ReelFeed";
import { DISTRICT_META, MIN_BID_USD, type District } from "@/lib/constants";
import { timeAgo, usd } from "@/lib/money";
import type { Quote } from "@/lib/types";

const AGE_KEY = "ns_18";

export function NightstripApp({
  initialBoard,
  initialCredits,
  demoPayments: demoFromServer,
}: {
  initialBoard: import("@/components/bid-ui").ClientBoard;
  initialCredits: number;
  demoPayments: boolean;
}) {
  const { board, credits, demoPayments, refresh, setCredits, latest } = useBoard({
    board: initialBoard,
    credits: initialCredits,
    demoPayments: demoFromServer,
  });
  const [aged, setAged] = useState(false);
  const [district, setDistrict] = useState<District>("casino");
  const [sheet, setSheet] = useState(false);
  const [identity, setIdentity] = useState("");
  const [delta, setDelta] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (document.cookie.includes("ns_18=1") || localStorage.getItem(AGE_KEY) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 18+ cookie hydrate
      setAged(true);
    }
  }, []);

  const takeOne = board?.districts[district].takeNumberOne ?? MIN_BID_USD;
  const ranked = board?.districts[district].listings ?? [];
  const targetListing = ranked.find((item) => item.id === target);
  const floor = targetListing ? targetListing.bid + 5 : takeOne;
  const requestedBid = floor + delta;
  const bid = Math.max(requestedBid, quote?.requiredBid ?? requestedBid);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      district,
      bid: String(requestedBid),
    });
    if (target) params.set("target", target);

    void fetch(`/api/claim/quote?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Quote failed");
        return (await res.json()) as Quote;
      })
      .then(setQuote)
      .catch((quoteError: unknown) => {
        if (quoteError instanceof DOMException && quoteError.name === "AbortError") return;
        setQuote(null);
      });

    return () => controller.abort();
  }, [board?.generatedAt, district, requestedBid, target]);

  const openTake = useCallback(
    (next: District, listing?: ClientListing) => {
      setDistrict(next);
      setTarget(listing && listing.rank !== 1 ? listing.id : undefined);
      setSheet(true);
      setDelta(0);
      setQuote(null);
      setError("");
    },
    [],
  );

  async function claim() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        district,
        name: identity,
        bid,
        targetListingId: target,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      receiptUrl?: string;
      payUrl?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Claim failed.");
      return;
    }
    if (data.payUrl) {
      window.location.href = data.payUrl;
      return;
    }
    setSheet(false);
    setIdentity("");
    await refresh();
  }

  async function demoCredits() {
    const res = await fetch("/api/credits/demo", { method: "POST" });
    const data = (await res.json()) as { credits?: number; error?: string };
    if (!res.ok) {
      setError(data.error || "Demo credits unavailable.");
      return;
    }
    setCredits(data.credits ?? 0);
    await refresh();
  }

  const casino = board?.districts.casino.listings ?? [];
  const red = board?.districts.red.listings ?? [];

  return (
    <div className="ns-root">
      <AgeGate
        open={!aged}
        onDone={() => {
          localStorage.setItem(AGE_KEY, "1");
          setAged(true);
        }}
      />

      <header className="ns-header">
        <div className="brand">
          <Link href="/" className="logo">
            NIGHTSTRIP
          </Link>
          <span className="plus18">18+</span>
        </div>
        <nav className="desk-nav">
          {(["casino", "red"] as District[]).map((item) => (
            <button
              key={item}
              type="button"
              className={district === item ? "on" : ""}
              style={{ color: DISTRICT_META[item].hex }}
              onClick={() => setDistrict(item)}
            >
              {DISTRICT_META[item].label}
            </button>
          ))}
        </nav>
        <div className="header-flags">
          <span>Until outbid</span>
          <span>No nightly reset</span>
        </div>
        <div className="header-value">
          <p className="label">Board value</p>
          <p className="amount">{usd(board?.boardValue ?? 0)}</p>
        </div>
        <div className="header-credits">
          <p>Credits {usd(credits)}</p>
          {demoPayments ? (
            <button type="button" className="demo-btn" onClick={demoCredits}>
              +$5,000 demo
            </button>
          ) : null}
        </div>
      </header>

      <div className="mobile-only">
        {aged ? (
          <ReelFeed
            key={district}
            casino={casino}
            red={red}
            district={district}
            onDistrict={setDistrict}
            onTake={openTake}
            muted={muted}
            onMuted={setMuted}
          />
        ) : (
          <div className="h-[80dvh]" />
        )}
      </div>

      <main className="desk-only board">
        <DistrictColumn
          district="casino"
          listings={casino}
          value={board?.districts.casino.boardValue ?? 0}
          vacant={board?.districts.casino.takeNumberOne ?? MIN_BID_USD}
          onTake={openTake}
        />
        <DistrictColumn
          district="red"
          listings={red}
          value={board?.districts.red.boardValue ?? 0}
          vacant={board?.districts.red.takeNumberOne ?? MIN_BID_USD}
          onTake={openTake}
        />
        <aside className="side">
          <div className="pot">
            <p className="all">{usd(board?.allTimePot ?? 0)} all-time pot</p>
            <p className="now">{usd(board?.boardValue ?? 0)} board value</p>
          </div>
          <DistrictToggle value={district} onChange={setDistrict} />
          <BidForm
            district={district}
            takeNumberOne={floor}
            identity={identity}
            onIdentity={setIdentity}
            bid={bid}
            onBid={(value) => setDelta(Math.max(0, value - floor))}
            busy={busy}
            error={error}
            onSubmit={claim}
            amountDue={quote?.amountDue}
            alreadyListed={quote?.alreadyListed}
          />
          <div>
            <p className="side-label">Latest activity</p>
            {latest.length === 0 ? (
              <p className="text-xs text-white/35">No bids yet.</p>
            ) : (
              <ul className="space-y-2 text-xs text-white/70">
                {latest.map((item) => (
                  <li key={item.id}>
                    {item.handle} · #{item.rank} · {usd(item.bid)} · {timeAgo(item.updatedAt)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="side-label">{DISTRICT_META[district].label} ranking</p>
            <div className="space-y-3">
              {ranked.length === 0 ? (
                <p className="text-xs text-white/35">Take #1 for {usd(MIN_BID_USD)}.</p>
              ) : (
                ranked.map((item) => (
                  <RankRow
                    key={item.id}
                    listing={item}
                    onOutbid={() => openTake(district, item)}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="ns-footer">
        <p>
          Built by{" "}
          <a href="https://x.com/lalodtc" target="_blank" rel="noreferrer">
            @lalodtc
          </a>
        </p>
        <p className="opacity-60">Mentioned on X</p>
        {demoPayments ? <span className="demo-pill">DEMO</span> : <span className="demo-pill live">LIVE PAY</span>}
        <p className="disclaimer">
          SFW feed · explicit only behind Visitar · host zero porn · process zero bets
        </p>
      </footer>

      {sheet ? (
        <div className="sheet-backdrop" onClick={() => setSheet(false)} role="presentation">
          <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
            <BidForm
              district={district}
              takeNumberOne={floor}
              identity={identity}
              onIdentity={setIdentity}
              bid={bid}
              onBid={(value) => setDelta(Math.max(0, value - floor))}
              busy={busy}
              error={error}
              onSubmit={claim}
              amountDue={quote?.amountDue}
              alreadyListed={quote?.alreadyListed}
            />
            <button type="button" className="mt-3 w-full text-sm text-white/40" onClick={() => setSheet(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DistrictColumn({
  district,
  listings,
  value,
  vacant,
  onTake,
}: {
  district: District;
  listings: ClientListing[];
  value: number;
  vacant: number;
  onTake: (district: District, listing?: ClientListing) => void;
}) {
  const meta = DISTRICT_META[district];
  return (
    <section className="district">
      <div className="district-head">
        <div>
          <h2 style={{ color: meta.hex }}>{meta.label}</h2>
          <p>{meta.kicker}</p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-2xl" style={{ color: meta.hex }}>
            {usd(value)}
          </p>
          <p className="text-[11px] tracking-wider text-white/40">ON THE BOARD</p>
        </div>
      </div>
      <HeroCard
        listing={listings[0]}
        district={district}
        vacantPrice={vacant}
        onTake={onTake}
      />
      <RankingRail listings={listings} district={district} />
    </section>
  );
}
