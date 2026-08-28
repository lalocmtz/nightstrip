"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type TouchEvent } from "react";
import { TeaserArt } from "@/components/TeaserArt";
import { DISTRICT_META, type District } from "@/lib/constants";
import { timeAgo, usd } from "@/lib/money";
import type { ClientListing } from "@/components/bid-ui";

export function ReelFeed({
  casino,
  red,
  district,
  onDistrict,
  onTake,
  muted,
  onMuted,
}: {
  casino: ClientListing[];
  red: ClientListing[];
  district: District;
  onDistrict: (district: District) => void;
  onTake: (district: District, listing?: ClientListing) => void;
  muted: boolean;
  onMuted: (value: boolean) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);

  const listings = district === "casino" ? casino : red;
  const meta = DISTRICT_META[district];

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const next = Math.round(el.scrollTop / el.clientHeight);
    setIndex(next);
  }, []);

  function onTouchStart(event: TouchEvent) {
    startX.current = event.touches[0]?.clientX ?? 0;
    startY.current = event.touches[0]?.clientY ?? 0;
  }

  function onTouchEnd(event: TouchEvent) {
    const x = event.changedTouches[0]?.clientX ?? 0;
    const y = event.changedTouches[0]?.clientY ?? 0;
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      onDistrict(dx < 0 ? "red" : "casino");
    }
  }

  const active = listings[index];

  return (
    <div className="reel-shell">
      <div className="reel-top">
        <div className="flex gap-2">
          {(["casino", "red"] as District[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${district === item ? "on" : ""}`}
              style={{
                color: DISTRICT_META[item].hex,
                borderColor: district === item ? DISTRICT_META[item].hex : "transparent",
              }}
              onClick={() => onDistrict(item)}
            >
              {DISTRICT_META[item].short}
            </button>
          ))}
        </div>
        <button type="button" className="chip" onClick={() => onMuted(!muted)}>
          {muted ? "Muted" : "Sound on"}
        </button>
      </div>

      <div
        ref={scroller}
        className="reel-scroller"
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {listings.length === 0 ? (
          <section className="reel-slide">
            <div className="reel-frame vacant">
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <p className="text-xs tracking-[0.3em] text-white/40">{meta.label}</p>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-white">
                  Take #1 for $10
                </h2>
                <p className="mt-3 text-sm text-white/50">
                  Empty district. No placeholder ads.
                </p>
              </div>
            </div>
          </section>
        ) : (
          listings.map((item, itemIndex) => (
            <section key={item.id} className="reel-slide">
              <div className={`reel-frame ${item.district}`}>
                <TeaserArt
                  name={item.name}
                  district={item.district}
                  rank={item.rank}
                  className="absolute inset-0"
                />
                <div className="reel-copy">
                  <p className="text-xs tracking-[0.25em] text-white/50">#{item.rank} · {meta.label}</p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-white">
                    {item.name}
                  </h2>
                  <p className="mt-2 text-sm text-white/60">{item.handle}</p>
                  <p className="mt-3 font-[family-name:var(--font-display)] text-3xl" style={{ color: meta.hex }}>
                    {usd(item.bid)}
                  </p>
                  <p className="mt-2 text-[11px] text-white/45">
                    {timeAgo(item.updatedAt)} · {item.clicks.toLocaleString()} clicks · {item.nights} nights
                  </p>
                  {itemIndex > 0 && muted ? (
                    <p className="mt-3 text-[11px] text-white/35">Muted until you unmute.</p>
                  ) : null}
                </div>
              </div>
            </section>
          ))
        )}
      </div>

      <div className="reel-dock">
        <Link
          className="ghost"
          href={active ? `/v/${active.id}` : "/"}
          aria-disabled={!active}
        >
          Visitar
        </Link>
        <button
          type="button"
          className="cta"
          onClick={() => onTake(district, active)}
        >
          Take this spot
        </button>
      </div>
    </div>
  );
}
