import { ImageResponse } from "next/og";
import { SocialCard } from "@/components/SocialCard";

export const alt = "NIGHTSTRIP — The paid-rank ad board";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<SocialCard />, size);
}
