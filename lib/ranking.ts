import { MIN_BID_USD, TAKE_STEP_USD, type District } from "./constants";
import type { Listing, Quote } from "./types";

export function sortListings(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    if (b.bid !== a.bid) return b.bid - a.bid;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });
}

export function listingsForDistrict(
  listings: Listing[],
  district: District,
): Listing[] {
  return sortListings(listings.filter((item) => item.district === district));
}

export function nightsHeld(createdAt: number, now: number): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((now - createdAt) / day) + 1);
}

export function withRanks(
  listings: Listing[],
  now: number,
): Array<Listing & { rank: number; nights: number }> {
  return sortListings(listings).map((item, index) => ({
    ...item,
    rank: index + 1,
    nights: nightsHeld(item.createdAt, now),
  }));
}

export function minTakeNumberOne(currentNumberOneBid: number | undefined): number {
  if (currentNumberOneBid == null) return MIN_BID_USD;
  return currentNumberOneBid + TAKE_STEP_USD;
}

export function minOutbid(targetBid: number): number {
  return Math.max(MIN_BID_USD, targetBid + TAKE_STEP_USD);
}

/**
 * Server-side quote. Client amounts are never used as the floor.
 * `requestedBid` may only raise the price, never lower it.
 */
export function quoteClaim(input: {
  listings: Listing[];
  district: District;
  walletId: string;
  requestedBid?: number;
  targetListingId?: string;
}): Quote {
  const ranked = listingsForDistrict(input.listings, input.district);
  const existing = ranked.find((item) => item.walletId === input.walletId);
  const vacant = ranked.length === 0;

  let requiredBid = MIN_BID_USD;

  if (input.targetListingId) {
    const target = ranked.find((item) => item.id === input.targetListingId);
    requiredBid = target ? minOutbid(target.bid) : minTakeNumberOne(ranked[0]?.bid);
  } else {
    requiredBid = minTakeNumberOne(ranked[0]?.bid);
  }

  if (existing) {
    requiredBid = Math.max(requiredBid, existing.bid + TAKE_STEP_USD);
  }

  if (
    typeof input.requestedBid === "number" &&
    Number.isFinite(input.requestedBid)
  ) {
    const requested = Math.floor(input.requestedBid);
    if (requested > requiredBid) requiredBid = requested;
  }

  const currentBid = existing?.bid ?? 0;
  const amountDue = existing ? requiredBid - existing.bid : requiredBid;

  return {
    district: input.district,
    requiredBid,
    amountDue,
    alreadyListed: Boolean(existing),
    currentBid,
    vacant,
  };
}

export function applyClaim(input: {
  listings: Listing[];
  district: District;
  walletId: string;
  name: string;
  handle: string;
  url: string;
  bid: number;
  now: number;
  listingId: string;
}): { listings: Listing[]; listing: Listing } {
  const existing = input.listings.find(
    (item) => item.district === input.district && item.walletId === input.walletId,
  );

  if (existing) {
    const listing: Listing = {
      ...existing,
      name: input.name,
      handle: input.handle,
      url: input.url,
      // A delayed payment for an older invoice must never lower a newer bid.
      bid: Math.max(existing.bid, input.bid),
      updatedAt: input.now,
    };
    return {
      listings: input.listings.map((item) =>
        item.id === existing.id ? listing : item,
      ),
      listing,
    };
  }

  const listing: Listing = {
    id: input.listingId,
    district: input.district,
    walletId: input.walletId,
    name: input.name,
    handle: input.handle,
    url: input.url,
    bid: input.bid,
    clicks: 0,
    createdAt: input.now,
    updatedAt: input.now,
  };

  return { listings: [...input.listings, listing], listing };
}

export function rankOf(listings: Listing[], listingId: string): number {
  const index = sortListings(listings).findIndex((item) => item.id === listingId);
  return index >= 0 ? index + 1 : 0;
}

export function boardValue(listings: Listing[], district?: District): number {
  return listings
    .filter((item) => (district ? item.district === district : true))
    .reduce((sum, item) => sum + item.bid, 0);
}
