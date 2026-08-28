import type { District } from "./constants";
import type { Listing } from "./types";

const HOUSE_LISTINGS: Record<District, Listing> = {
  casino: {
    id: "house-casino",
    district: "casino",
    walletId: "house:casino",
    name: "THE HOUSE",
    handle: "Sports. Tipsters. Bonuses. Rank is the price.",
    line: "Sports. Tipsters. Bonuses. Rank is the price.",
    url: "",
    bid: 0,
    clicks: 0,
    createdAt: 0,
    updatedAt: 0,
    house: true,
    label: "SPONSORED",
    mediaUrl: "/media/founder-casino.webp",
  },
  red: {
    id: "house-red",
    district: "red",
    walletId: "house:red",
    name: "THE OTHER SIDE",
    handle: "Creators. Paid links. SFW teaser, rest behind Visitar.",
    line: "Creators. Paid links. SFW teaser, rest behind Visitar.",
    url: "",
    bid: 0,
    clicks: 0,
    createdAt: 0,
    updatedAt: 0,
    house: true,
    label: "SPONSORED",
    mediaUrl: "/media/founder-red.webp",
  },
};

export function houseListing(district: District): Listing {
  return { ...HOUSE_LISTINGS[district] };
}
