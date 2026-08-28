import { DISTRICT_META, DEMO_GRANT_USD, type District } from "./constants";
import { parseIdentity } from "./identity";
import { newId } from "./format";
import {
  createNowpaymentsInvoice,
  demoPaymentsEnabled,
  nowpaymentsConfigured,
} from "./nowpayments";
import { appUrl, invalidateBoardCache } from "./board";
import {
  applyClaim,
  listingsForDistrict,
  quoteClaim,
  rankOf,
} from "./ranking";
import { getWallet, withStore } from "./store";
import type { Quote, Receipt, StoreState } from "./types";

export const PENDING_CLAIM_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PENDING_PER_WALLET = 3;
export const MAX_PENDING_GLOBAL = 500;

export function prunePendingClaims(
  claims: import("./types").PendingClaim[],
  now = Date.now(),
): import("./types").PendingClaim[] {
  return claims
    .filter((claim) => now - claim.createdAt < PENDING_CLAIM_TTL_MS)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-(MAX_PENDING_GLOBAL - 1));
}

export function hasTooManyPendingClaims(
  claims: import("./types").PendingClaim[],
  walletId: string,
): boolean {
  return claims.filter((claim) => claim.walletId === walletId).length >= MAX_PENDING_PER_WALLET;
}

export function prunePendingClaimsInState(state: StoreState, now = Date.now()): void {
  const kept = new Set(prunePendingClaims(state.pendingClaims, now).map((claim) => claim.orderId));
  for (const claim of state.pendingClaims) {
    if (!kept.has(claim.orderId) && claim.creditApplied) {
      getWallet(state, claim.walletId).credits += claim.creditApplied;
    }
  }
  state.pendingClaims = state.pendingClaims.filter((claim) => kept.has(claim.orderId));
}

export function quoteFor(
  listings: Parameters<typeof quoteClaim>[0]["listings"],
  district: District,
  walletId: string,
  requestedBid?: number,
  targetListingId?: string,
): Quote {
  return quoteClaim({
    listings,
    district,
    walletId,
    requestedBid,
    targetListingId,
  });
}

export async function performClaim(input: {
  walletId: string;
  district: District;
  name: string;
  url?: string;
  requestedBid?: number;
  targetListingId?: string;
}): Promise<
  | { ok: true; receipt: Receipt; demo: boolean }
  | { ok: false; error: string; status: number }
  | { ok: true; payUrl: string }
> {
  const identity = parseIdentity(input.name, input.url);
  if ("error" in identity) {
    return { ok: false, error: identity.error, status: 400 };
  }

  const live = nowpaymentsConfigured();
  const demo = demoPaymentsEnabled();

  if (!live && !demo) {
    return {
      ok: false,
      error: "Payments are unavailable in this environment.",
      status: 503,
    };
  }

  if (demo) {
    return withStore((state) => {
      const wallet = getWallet(state, input.walletId);
      const quote = quoteClaim({
        listings: state.listings,
        district: input.district,
        walletId: input.walletId,
        requestedBid: input.requestedBid,
        targetListingId: input.targetListingId,
      });

      if (quote.amountDue <= 0) {
        return { ok: false as const, error: "Nothing due.", status: 400 };
      }
      if (wallet.credits < quote.amountDue) {
        return {
          ok: false as const,
          error: `Need ${quote.amountDue} credits. Add demo credits first.`,
          status: 402,
        };
      }
      wallet.credits -= quote.amountDue;
      const receipt = commitClaim(state, {
        walletId: input.walletId,
        district: input.district,
        identity,
        bid: quote.requiredBid,
        amountPaid: quote.amountDue,
        demo: true,
      });
      return { ok: true as const, receipt, demo: true };
    });
  }

  const orderId = newId("ord");
  const prepared = await withStore((state) => {
    prunePendingClaimsInState(state);
    if (hasTooManyPendingClaims(state.pendingClaims, input.walletId)) {
      return {
        ok: false as const,
        error: "Too many pending payments. Finish or wait for one to expire.",
        status: 429,
      };
    }

    const wallet = getWallet(state, input.walletId);
    const quote = quoteClaim({
      listings: state.listings,
      district: input.district,
      walletId: input.walletId,
      requestedBid: input.requestedBid,
      targetListingId: input.targetListingId,
    });

    if (quote.amountDue <= 0) {
      return { ok: false as const, error: "Nothing due.", status: 400 };
    }

    const creditApplied = Math.min(wallet.credits, quote.amountDue);
    const cashDue = quote.amountDue - creditApplied;
    wallet.credits -= creditApplied;

    if (cashDue <= 0) {
      const receipt = commitClaim(state, {
        walletId: input.walletId,
        district: input.district,
        identity,
        bid: quote.requiredBid,
        amountPaid: quote.amountDue,
        potContribution: 0,
        demo: false,
      });
      return { ok: true as const, receipt, direct: true as const };
    }

    state.pendingClaims.push({
      orderId,
      walletId: input.walletId,
      district: input.district,
      name: identity.name,
      handle: identity.handle,
      url: identity.url,
      bid: quote.requiredBid,
      amountDue: cashDue,
      grossAmountDue: quote.amountDue,
      creditApplied,
      createdAt: Date.now(),
    });
    return { ok: true as const, quote, cashDue };
  });

  if (!prepared.ok) return prepared;
  if ("direct" in prepared && prepared.direct && prepared.receipt) {
    return { ok: true, receipt: prepared.receipt, demo: false };
  }

  const origin = appUrl();
  try {
    const invoice = await createNowpaymentsInvoice({
      priceAmount: prepared.cashDue,
      orderId,
      description: `NIGHTSTRIP ${DISTRICT_META[input.district].label} · ${identity.name} · $${prepared.quote.requiredBid}`,
      successUrl: `${origin}/r/pending?order=${orderId}`,
      cancelUrl: origin,
      ipnCallbackUrl: `${origin}/api/webhooks/nowpayments`,
    });
    return { ok: true, payUrl: invoice.invoiceUrl };
  } catch (error) {
    try {
      await withStore((state) => {
        const pending = state.pendingClaims.find((item) => item.orderId === orderId);
        if (pending?.creditApplied) {
          getWallet(state, pending.walletId).credits += pending.creditApplied;
        }
        state.pendingClaims = state.pendingClaims.filter((item) => item.orderId !== orderId);
      });
    } catch {
      // A stale unpaid pending claim is harmless and can be pruned later.
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Payment create failed",
      status: 502,
    };
  }
}

export function commitClaim(
  state: import("./types").StoreState,
  input: {
    walletId: string;
    district: District;
    identity: { name: string; handle: string; url: string };
    bid: number;
    amountPaid: number;
    potContribution?: number;
    demo: boolean;
  },
): Receipt {
  const now = Date.now();
  const applied = applyClaim({
    listings: state.listings,
    district: input.district,
    walletId: input.walletId,
    name: input.identity.name,
    handle: input.identity.handle,
    url: input.identity.url,
    bid: input.bid,
    now,
    listingId: newId("lst"),
  });
  state.listings = applied.listings;
  const rankedDistrict = listingsForDistrict(state.listings, input.district);
  const rank = rankOf(rankedDistrict, applied.listing.id);
  const effectiveBid = applied.listing.bid;
  const receipt: Receipt = {
    id: newId("rcpt"),
    listingId: applied.listing.id,
    walletId: input.walletId,
    district: input.district,
    name: input.identity.name,
    handle: input.identity.handle,
    amountPaid: input.amountPaid,
    bid: effectiveBid,
    rank,
    createdAt: now,
    demo: input.demo,
  };
  state.receipts.unshift(receipt);
  let demoReceipts = 0;
  state.receipts = state.receipts.filter((item) => {
    if (!item.demo) return true;
    demoReceipts += 1;
    return demoReceipts <= 500;
  });
  state.allTimePot += input.potContribution ?? input.amountPaid;
  invalidateBoardCache();
  return receipt;
}

export function grantDemoCredits(walletId: string): Promise<{ credits: number; granted: number }> {
  return withStore((state) => {
    const wallet = getWallet(state, walletId);
    wallet.credits += DEMO_GRANT_USD;
    wallet.demoGranted = true;
    return { credits: wallet.credits, granted: DEMO_GRANT_USD };
  });
}
