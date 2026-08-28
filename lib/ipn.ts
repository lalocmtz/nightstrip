import { commitClaim } from "./claim";
import { getWallet } from "./store";
import type { OrphanIpn, StoreState } from "./types";

export const AMOUNT_TOLERANCE_USD = 0.5;

export type NowpaymentsIpnBody = Record<string, unknown>;

export type IpnResult =
  | { error: "missing_payment_id" }
  | { idempotent: true }
  | { ignored: string }
  | { receiptId: string; credited: number };

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function recordIssue(state: StoreState, issue: OrphanIpn): void {
  const duplicate = state.orphanIpns.some(
    (item) => item.paymentId === issue.paymentId && item.reason === issue.reason,
  );
  if (!duplicate) state.orphanIpns.push(issue);
  state.orphanIpns = state.orphanIpns.slice(-500);
}

export function processNowpaymentsIpn(
  state: StoreState,
  body: NowpaymentsIpnBody,
  receivedAt = Date.now(),
): IpnResult {
  const paymentId = String(body.payment_id ?? body.id ?? "");
  const orderId = String(body.order_id ?? "");
  const status = String(body.payment_status ?? "").toLowerCase();
  const priceAmount = numberOrNull(body.price_amount);
  const priceCurrency = String(body.price_currency ?? "").toLowerCase();
  const actuallyPaid = numberOrNull(body.actually_paid);
  const payCurrency = String(body.pay_currency ?? "").toLowerCase();

  if (!paymentId) return { error: "missing_payment_id" };
  if (state.processedIpnIds.includes(paymentId)) return { idempotent: true };

  // Only `finished` means NOWPayments has completed settlement to the merchant.
  if (status !== "finished") return { ignored: status || "unknown_status" };

  const issueBase = {
    paymentId,
    orderId,
    status,
    priceAmount,
    priceCurrency,
    actuallyPaid,
    payCurrency,
    receivedAt,
  };
  const pending = state.pendingClaims.find((item) => item.orderId === orderId);
  if (!pending) {
    recordIssue(state, { ...issueBase, reason: "unknown_order" });
    return { ignored: "unknown_order" };
  }

  // `price_amount` is the signed fiat invoice amount, not the crypto quantity.
  // Bind it to our order; `finished` is the provider's settlement signal.
  const amountMatches =
    priceAmount !== null &&
    Math.abs(priceAmount - pending.amountDue) <= AMOUNT_TOLERANCE_USD;
  const actualIsPlausible = actuallyPaid === null || actuallyPaid > 0;
  if (priceCurrency !== "usd" || !amountMatches || !actualIsPlausible) {
    recordIssue(state, { ...issueBase, reason: "amount_mismatch" });
    return { ignored: "amount_mismatch" };
  }

  const wallet = getWallet(state, pending.walletId);
  const existing = state.listings.find(
    (item) =>
      item.walletId === pending.walletId &&
      item.district === pending.district &&
      !item.disabled,
  );
  const previousBid = existing?.bid ?? 0;
  const grossAmountDue = pending.grossAmountDue ?? pending.amountDue;

  state.processedIpnIds.push(paymentId);
  state.processedIpnIds = state.processedIpnIds.slice(-2000);
  state.pendingClaims = state.pendingClaims.filter((item) => item.orderId !== orderId);

  const receipt = commitClaim(state, {
    walletId: pending.walletId,
    district: pending.district,
    identity: {
      name: pending.name,
      handle: pending.handle,
      url: pending.url,
    },
    bid: pending.bid,
    amountPaid: grossAmountDue,
    potContribution: pending.amountDue,
    demo: false,
  });

  // Concurrent raises can make part of an older invoice redundant. Preserve
  // that already-paid value as account credit instead of silently consuming it.
  const appliedIncrease = Math.max(0, receipt.bid - previousBid);
  const credited = Math.max(0, grossAmountDue - appliedIncrease);
  wallet.credits += credited;

  return { receiptId: receipt.id, credited };
}
