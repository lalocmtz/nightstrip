import type { District } from "./constants";

export type Listing = {
  id: string;
  district: District;
  walletId: string;
  name: string;
  handle: string;
  url: string;
  bid: number;
  clicks: number;
  createdAt: number;
  updatedAt: number;
};

export type Wallet = {
  id: string;
  credits: number;
  demoGranted: boolean;
  createdAt: number;
};

export type Receipt = {
  id: string;
  listingId: string;
  walletId: string;
  district: District;
  name: string;
  handle: string;
  amountPaid: number;
  bid: number;
  rank: number;
  createdAt: number;
  demo: boolean;
};

export type PendingClaim = {
  orderId: string;
  walletId: string;
  district: District;
  name: string;
  handle: string;
  url: string;
  bid: number;
  amountDue: number;
  createdAt: number;
};

export type Activity = {
  id: string;
  district: District;
  name: string;
  handle: string;
  rank: number;
  bid: number;
  createdAt: number;
};

export type StoreState = {
  listings: Listing[];
  wallets: Wallet[];
  receipts: Receipt[];
  pendingClaims: PendingClaim[];
  processedIpnIds: string[];
  activity: Activity[];
  allTimePot: number;
};

export type RankedListing = Listing & {
  rank: number;
  nights: number;
};

export type BoardPayload = {
  generatedAt: number;
  demoPayments: boolean;
  boardValue: number;
  allTimePot: number;
  districts: Record<
    District,
    {
      listings: RankedListing[];
      boardValue: number;
      takeNumberOne: number;
    }
  >;
};

export type Quote = {
  district: District;
  requiredBid: number;
  amountDue: number;
  alreadyListed: boolean;
  currentBid: number;
  vacant: boolean;
};
