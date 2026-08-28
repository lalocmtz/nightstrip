import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasTooManyPendingClaims,
  MAX_PENDING_GLOBAL,
  PENDING_CLAIM_TTL_MS,
  prunePendingClaims,
  prunePendingClaimsInState,
} from "./claim";
import { emptyState } from "./store";
import type { PendingClaim } from "./types";

function pending(orderId: string, walletId: string, createdAt: number): PendingClaim {
  return {
    orderId,
    walletId,
    district: "casino",
    name: "Example",
    handle: "@example",
    url: "https://example.com",
    bid: 10,
    amountDue: 10,
    createdAt,
  };
}

test("a wallet cannot create a fourth active pending payment", () => {
  const claims = [
    pending("1", "wallet", 1),
    pending("2", "wallet", 2),
    pending("3", "wallet", 3),
  ];
  assert.equal(hasTooManyPendingClaims(claims, "wallet"), true);
  assert.equal(hasTooManyPendingClaims(claims, "other"), false);
});

test("pending payments expire after 24 hours", () => {
  const now = PENDING_CLAIM_TTL_MS + 1_000;
  const claims = [pending("expired", "w", 999), pending("active", "w", 1_001)];
  assert.deepEqual(prunePendingClaims(claims, now).map((item) => item.orderId), ["active"]);
});

test("expiring a pending payment restores reserved account credit", () => {
  const state = emptyState();
  state.wallets.push({ id: "wallet", credits: 0, demoGranted: false, createdAt: 1 });
  state.pendingClaims.push({
    ...pending("expired", "wallet", 1),
    amountDue: 5,
    grossAmountDue: 10,
    creditApplied: 5,
  });
  prunePendingClaimsInState(state, PENDING_CLAIM_TTL_MS + 2);
  assert.equal(state.pendingClaims.length, 0);
  assert.equal(state.wallets[0]?.credits, 5);
});

test("pending payment storage leaves room for the next claim", () => {
  const claims = Array.from({ length: MAX_PENDING_GLOBAL + 20 }, (_, index) =>
    pending(String(index), `w-${index}`, index + 1),
  );
  const kept = prunePendingClaims(claims, PENDING_CLAIM_TTL_MS - 1);
  assert.equal(kept.length, MAX_PENDING_GLOBAL - 1);
  assert.equal(kept.at(-1)?.orderId, String(claims.length - 1));
});
