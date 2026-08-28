import { DISTRICTS } from "./constants";
import { nowpaymentsConfigured } from "./nowpayments";
import {
  boardValue,
  listingsForDistrict,
  minTakeNumberOne,
  withRanks,
} from "./ranking";
import { readStore } from "./store";
import type { BoardPayload } from "./types";

export async function readBoard(): Promise<BoardPayload> {
  return readStore((state) => {
    const now = Date.now();
    const districts = {} as BoardPayload["districts"];
    for (const district of DISTRICTS) {
      const listings = withRanks(listingsForDistrict(state.listings, district), now);
      districts[district] = {
        listings,
        boardValue: boardValue(state.listings, district),
        takeNumberOne: minTakeNumberOne(listings[0]?.bid),
      };
    }
    return {
      generatedAt: now,
      demoPayments: !nowpaymentsConfigured(),
      boardValue: boardValue(state.listings),
      allTimePot: state.allTimePot,
      districts,
    };
  });
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  );
}

export function publicListing<T extends { walletId: string }>(
  listing: T,
): Omit<T, "walletId"> {
  const { walletId, ...rest } = listing;
  void walletId;
  return rest;
}

export function serializeBoard(board: BoardPayload) {
  return {
    ...board,
    districts: {
      casino: {
        ...board.districts.casino,
        listings: board.districts.casino.listings.map(publicListing),
      },
      red: {
        ...board.districts.red,
        listings: board.districts.red.listings.map(publicListing),
      },
    },
  };
}
