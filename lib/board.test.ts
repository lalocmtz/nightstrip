import { test } from "node:test";
import assert from "node:assert/strict";
import { boardFromState, serializeBoard } from "./board";
import type { Listing, StoreState } from "./types";

function state(listings: Listing[] = []): StoreState {
  return {
    listings,
    wallets: [],
    receipts: [],
    pendingClaims: [],
    processedIpnIds: [],
    orphanIpns: [],
    allTimePot: 0,
  };
}

test("empty districts show $0 sponsored house cards without faking board value", () => {
  const board = boardFromState(state(), 1_000);

  for (const district of ["casino", "red"] as const) {
    const card = board.districts[district].listings[0];
    assert.equal(card?.house, true);
    assert.equal(card?.label, "SPONSORED");
    assert.equal(card?.bid, 0);
    assert.equal(card?.rank, 1);
    assert.equal(card?.nights, 0);
    assert.equal(board.districts[district].listings.length, 1);
    assert.equal(board.districts[district].boardValue, 0);
    assert.equal(board.districts[district].takeNumberOne, 10);
  }
  assert.equal(board.boardValue, 0);
  assert.equal(board.allTimePot, 0);
});

test("a real $10 listing unseats only its district house card", () => {
  const real: Listing = {
    id: "real-casino",
    district: "casino",
    walletId: "wallet-1",
    name: "Real buyer",
    handle: "@real",
    url: "https://example.com",
    bid: 10,
    clicks: 0,
    createdAt: 10,
    updatedAt: 10,
  };
  const board = boardFromState(state([real]), 1_000);

  assert.equal(board.districts.casino.listings[0]?.id, real.id);
  assert.equal(board.districts.casino.listings[0]?.house, undefined);
  assert.equal(board.districts.casino.takeNumberOne, 15);
  assert.equal(board.districts.red.listings[0]?.house, true);
  assert.equal(board.boardValue, 10);
});

test("serialized house cards never expose their internal wallet marker", () => {
  const serialized = serializeBoard(boardFromState(state(), 1_000));
  const card = serialized.districts.casino.listings[0];
  assert.equal(card?.house, true);
  assert.equal("walletId" in (card ?? {}), false);
});
