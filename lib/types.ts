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
  disabled?: boolean;
  /** Presentation-only inventory owned by NIGHTSTRIP; never persisted as a paid bid. */
  house?: boolean;
  label?: "SPONSORED";
  line?: string;
  mediaUrl?: string;
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
  /** Cash still due through NOWPayments after account credit was applied. */
  amountDue: number;
  /** Total value applied to the listing, including account credit. */
  grossAmountDue?: number;
  creditApplied?: number;
  createdAt: number;
};

export type OrphanIpn = {
  paymentId: string;
  orderId: string;
  status: string;
  priceAmount: number | null;
  priceCurrency: string;
  actuallyPaid: number | null;
  payCurrency: string;
  receivedAt: number;
  reason: "unknown_order" | "amount_mismatch";
};

export type StoreState = {
  listings: Listing[];
  wallets: Wallet[];
  receipts: Receipt[];
  pendingClaims: PendingClaim[];
  processedIpnIds: string[];
  orphanIpns: OrphanIpn[];
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
