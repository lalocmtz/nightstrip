import { DISTRICTS } from "./constants";
import { demoPaymentsEnabled } from "./nowpayments";
import { houseListing } from "./house";
import {
  boardValue,
  listingsForDistrict,
  minTakeNumberOne,
  withRanks,
} from "./ranking";
import { readStore } from "./store";
import type { BoardPayload } from "./types";

const BOARD_CACHE_MS = 7_500;

type BoardGlobals = typeof globalThis & {
  __nightstripBoardCache?: { value: BoardPayload; expiresAt: number };
};

export function boardFromState(
  state: import("./types").StoreState,
  now = Date.now(),
): BoardPayload {
  const districts = {} as BoardPayload["districts"];
  for (const district of DISTRICTS) {
    const paidListings = listingsForDistrict(state.listings, district);
    const listings =
      paidListings.length === 0
        ? [{ ...houseListing(district), rank: 1, nights: 0 }]
        : withRanks(paidListings, now);
    districts[district] = {
      listings,
      boardValue: boardValue(state.listings, district),
      // House cards are $0 presentation inventory, not auction bids.
      takeNumberOne: minTakeNumberOne(paidListings[0]?.bid),
    };
  }
  return {
    generatedAt: now,
    demoPayments: demoPaymentsEnabled(),
    boardValue: boardValue(state.listings),
    allTimePot: state.allTimePot,
    districts,
  };
}

export function cacheBoard(board: BoardPayload): void {
  const globals = globalThis as BoardGlobals;
  globals.__nightstripBoardCache = {
    value: board,
    expiresAt: Date.now() + BOARD_CACHE_MS,
  };
}

export function invalidateBoardCache(): void {
  delete (globalThis as BoardGlobals).__nightstripBoardCache;
}

export async function readBoard(): Promise<BoardPayload> {
  const globals = globalThis as BoardGlobals;
  const cached = globals.__nightstripBoardCache;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const board = await readStore((state) => boardFromState(state));
  cacheBoard(board);
  return board;
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
