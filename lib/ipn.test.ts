import { test } from "node:test";
import assert from "node:assert/strict";
import { processNowpaymentsIpn } from "./ipn";
import { emptyState } from "./store";
import type { PendingClaim, StoreState } from "./types";

function pending(overrides: Partial<PendingClaim> = {}): PendingClaim {
  return {
    orderId: "ord-1",
    walletId: "wallet-1",
    district: "casino",
    name: "Example",
    handle: "@example",
    url: "https://example.com",
    bid: 10,
    amountDue: 10,
    grossAmountDue: 10,
    creditApplied: 0,
    createdAt: 1,
    ...overrides,
  };
}

function stateWithPending(claim = pending()): StoreState {
  const state = emptyState();
  state.pendingClaims.push(claim);
  return state;
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    payment_id: "pay-1",
    order_id: "ord-1",
    payment_status: "finished",
    price_amount: 10,
    price_currency: "usd",
    actually_paid: 9.8,
    pay_currency: "usdttrc20",
    ...overrides,
  };
}

test("intermediate NOWPayments statuses never fulfill", async (t) => {
  for (const status of [
    "waiting",
    "confirming",
    "sending",
    "partially_paid",
    "failed",
    "refunded",
    "expired",
    "confirmed",
  ]) {
    await t.test(status, () => {
      const state = stateWithPending();
      assert.deepEqual(processNowpaymentsIpn(state, body({ payment_status: status })), {
        ignored: status,
      });
      assert.equal(state.listings.length, 0);
    });
  }
});

test("finished USD payment fulfills and replay is idempotent", () => {
  const state = stateWithPending();
  const first = processNowpaymentsIpn(state, body());
  assert.equal("receiptId" in first, true);
  assert.equal(state.listings.length, 1);
  assert.deepEqual(processNowpaymentsIpn(state, body()), { idempotent: true });
  assert.equal(state.listings.length, 1);
});

test("amount and fiat currency mismatches are recorded without fulfillment", () => {
  const amountState = stateWithPending();
  assert.deepEqual(processNowpaymentsIpn(amountState, body({ price_amount: 1 })), {
    ignored: "amount_mismatch",
  });
  assert.equal(amountState.listings.length, 0);
  assert.equal(amountState.orphanIpns[0]?.reason, "amount_mismatch");

  const currencyState = stateWithPending();
  processNowpaymentsIpn(currencyState, body({ price_currency: "eur" }));
  assert.equal(currencyState.listings.length, 0);
  assert.equal(currencyState.orphanIpns[0]?.priceCurrency, "eur");
});

test("unknown finished order is retained for reconciliation", () => {
  const state = emptyState();
  assert.deepEqual(processNowpaymentsIpn(state, body()), { ignored: "unknown_order" });
  assert.equal(state.orphanIpns.length, 1);
  assert.equal(state.orphanIpns[0]?.paymentId, "pay-1");
});

test("redundant concurrent raise is returned as wallet credit", () => {
  const state = stateWithPending(pending({ bid: 30, amountDue: 10, grossAmountDue: 10 }));
  state.listings.push({
    id: "listing-1",
    district: "casino",
    walletId: "wallet-1",
    name: "Example",
    handle: "@example",
    url: "https://example.com",
    bid: 30,
    clicks: 0,
    createdAt: 1,
    updatedAt: 2,
  });
  const result = processNowpaymentsIpn(state, body());
  assert.equal("credited" in result ? result.credited : 0, 10);
  assert.equal(state.wallets[0]?.credits, 10);
});

test("missing payment id is rejected by the state machine", () => {
  const state = stateWithPending();
  assert.deepEqual(processNowpaymentsIpn(state, body({ payment_id: "" })), {
    error: "missing_payment_id",
  });
});
