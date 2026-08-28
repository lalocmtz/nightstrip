import { DISTRICT_META, DEMO_GRANT_USD, type District } from "./constants";
import { parseIdentity } from "./identity";
import { newId } from "./format";
import {
  createNowpaymentsInvoice,
  nowpaymentsConfigured,
} from "./nowpayments";
import { appUrl } from "./board";
import {
  applyClaim,
  listingsForDistrict,
  quoteClaim,
  rankOf,
} from "./ranking";
import { getWallet, withStore } from "./store";
import type { Quote, Receipt } from "./types";

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

  const demo = !nowpaymentsConfigured();

  return withStore(async (state) => {
    const wallet = getWallet(state, input.walletId);
    const quote = quoteClaim({
      listings: state.listings,
      district: input.district,
      walletId: input.walletId,
      requestedBid: input.requestedBid,
      targetListingId: input.targetListingId,
    });

    if (quote.amountDue <= 0) {
      return { ok: false, error: "Nothing due.", status: 400 };
    }

    if (demo) {
      if (wallet.credits < quote.amountDue) {
        return {
          ok: false,
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
      return { ok: true, receipt, demo: true };
    }

    const orderId = newId("ord");
    state.pendingClaims.push({
      orderId,
      walletId: input.walletId,
      district: input.district,
      name: identity.name,
      handle: identity.handle,
      url: identity.url,
      bid: quote.requiredBid,
      amountDue: quote.amountDue,
      createdAt: Date.now(),
    });

    const origin = appUrl();
    try {
      const invoice = await createNowpaymentsInvoice({
        priceAmount: quote.amountDue,
        orderId,
        description: `NIGHTSTRIP ${DISTRICT_META[input.district].label} · ${identity.name} · $${quote.requiredBid}`,
        successUrl: `${origin}/r/pending?order=${orderId}`,
        cancelUrl: origin,
        ipnCallbackUrl: `${origin}/api/webhooks/nowpayments`,
      });
      return { ok: true, payUrl: invoice.invoiceUrl };
    } catch (error) {
      state.pendingClaims = state.pendingClaims.filter((item) => item.orderId !== orderId);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Payment create failed",
        status: 502,
      };
    }
  });
}

export function commitClaim(
  state: import("./types").StoreState,
  input: {
    walletId: string;
    district: District;
    identity: { name: string; handle: string; url: string };
    bid: number;
    amountPaid: number;
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
  const receipt: Receipt = {
    id: newId("rcpt"),
    listingId: applied.listing.id,
    walletId: input.walletId,
    district: input.district,
    name: input.identity.name,
    handle: input.identity.handle,
    amountPaid: input.amountPaid,
    bid: input.bid,
    rank,
    createdAt: now,
    demo: input.demo,
  };
  state.receipts.unshift(receipt);
  state.receipts = state.receipts.slice(0, 500);
  state.allTimePot += input.amountPaid;
  state.activity.unshift({
    id: newId("act"),
    district: input.district,
    name: input.identity.name,
    handle: input.identity.handle,
    rank,
    bid: input.bid,
    createdAt: now,
  });
  state.activity = state.activity.slice(0, 40);
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
