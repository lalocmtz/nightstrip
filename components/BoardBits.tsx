"use client";

import Link from "next/link";
import { TeaserArt } from "@/components/TeaserArt";
import { TAKE_STEP_USD, DISTRICT_META, type District } from "@/lib/constants";
import { timeAgo, usd } from "@/lib/money";
import type { ClientListing } from "@/components/bid-ui";

export function HeroCard({
  listing,
  district,
  vacantPrice,
  onTake,
}: {
  listing: ClientListing | undefined;
  district: District;
  vacantPrice: number;
  onTake: (district: District, listing?: ClientListing) => void;
}) {
  const meta = DISTRICT_META[district];
  const gold = district === "casino";

  if (!listing) {
    return (
      <article className={`hero-card vacant ${gold ? "gold" : "red"}`}>
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-xs tracking-[0.25em] text-white/40">VACANT</p>
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-white">
            Take #1 for {usd(vacantPrice)}
          </h3>
          <p className="mt-2 text-sm text-white/50">
            No fake listings. First bid holds until outbid.
          </p>
          <button
            type="button"
            className="cta mt-6"
            onClick={() => onTake(district)}
          >
            Take #1
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className={`hero-card ${gold ? "gold" : "red"}`}>
      <TeaserArt name={listing.name} district={district} rank={listing.rank} />
      <div className="hero-overlay">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-white">
              {listing.name}
            </p>
            <p className="text-xs text-white/55">{listing.handle}</p>
          </div>
          <div className="text-right">
            <span className="rank-badge">RANK #{listing.rank}</span>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl" style={{ color: meta.hex }}>
              {usd(listing.bid)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/45">
          {timeAgo(listing.updatedAt)} · {listing.clicks.toLocaleString()} clicks · {listing.nights} nights
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/v/${listing.id}`} className="ghost">
            Visitar
          </Link>
          <button type="button" className="cta" onClick={() => onTake(district, listing)}>
            Take #1
          </button>
        </div>
      </div>
    </article>
  );
}

export function RankingRail({
  listings,
  district,
}: {
  listings: ClientListing[];
  district: District;
}) {
  const rest = listings.filter((item) => item.rank >= 2).slice(0, 9);
  if (rest.length === 0) {
    return (
      <p className="mt-4 text-center text-[11px] text-white/30">
        Ranks #2–#10 stay empty until someone bids.
      </p>
    );
  }
  return (
    <div className="rail">
      {rest.map((item, index) => (
        <div
          key={item.id}
          className={`rail-slot ${index === 0 ? "lg" : ""}`}
          style={{ opacity: Math.max(0.35, 1 - index * 0.08) }}
          title={`${item.name} ${usd(item.bid)}`}
        >
          <TeaserArt name={item.name} district={district} rank={item.rank} />
          <span>#{item.rank}</span>
        </div>
      ))}
    </div>
  );
}

export function RankRow({
  listing,
  onOutbid,
}: {
  listing: ClientListing;
  onOutbid: () => void;
}) {
  const meta = DISTRICT_META[listing.district];
  return (
    <div className="rank-row">
      <div className="flex items-center gap-3">
        <span className="w-8 font-[family-name:var(--font-display)] text-white/50">
          #{listing.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{listing.name}</p>
          <p className="truncate text-[11px] text-white/40">
            {timeAgo(listing.updatedAt)} · {listing.clicks.toLocaleString()} clicks
          </p>
        </div>
        <span className="font-semibold" style={{ color: meta.hex }}>
          {usd(listing.bid)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className="cta slim" onClick={onOutbid}>
          Outbid {usd(listing.bid + TAKE_STEP_USD)}
        </button>
        <Link href={`/v/${listing.id}`} className="ghost slim">
          Visitar
        </Link>
      </div>
    </div>
  );
}
