"use client";

import Image from "next/image";

type Props = {
  name: string;
  district: "casino" | "red";
  rank: number;
  className?: string;
  mediaUrl?: string;
};

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TeaserArt({ name, district, rank, className, mediaUrl }: Props) {
  const seed = hash(name + district);
  const x = 30 + (seed % 40);
  const y = 28 + ((seed >> 4) % 36);
  const gold = district === "casino";

  if (mediaUrl) {
    return (
      <div className={`teaser-art teaser-media ${className ?? ""}`}>
        <Image
          src={mediaUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 32vw, 100vw"
          className="object-cover"
        />
        <div className="teaser-media-shade" />
      </div>
    );
  }

  return (
    <div className={`teaser-art ${gold ? "teaser-gold" : "teaser-red"} ${className ?? ""}`}>
      <div className="orb" style={{ left: `${x}%`, top: `${y}%` }} />
      <div className="orb orb-2" />
      <div className="scan" />
      {district === "red" ? (
        <div className="badges">
          <span>SFW</span>
          <span>TEASER</span>
          <span>18+</span>
        </div>
      ) : rank === 1 ? (
        <div className="badges">
          <span>SFW FEED</span>
        </div>
      ) : null}
    </div>
  );
}
