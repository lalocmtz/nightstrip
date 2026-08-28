import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_BID_USD, TAKE_STEP_USD } from "./constants";
import {
  applyClaim,
  boardValue,
  listingsForDistrict,
  quoteClaim,
  rankOf,
  sortListings,
} from "./ranking";
import type { Listing } from "./types";

function listing(partial: Partial<Listing> & Pick<Listing, "id" | "bid">): Listing {
  return {
    district: "casino",
    walletId: partial.walletId ?? `w-${partial.id}`,
    name: partial.name ?? partial.id,
    handle: partial.handle ?? `@${partial.id}`,
    url: partial.url ?? `https://example.com/${partial.id}`,
    clicks: 0,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt ?? 1,
    ...partial,
  };
}

test("empty district quotes Take #1 for $10", () => {
  const quote = quoteClaim({
    listings: [],
    district: "casino",
    walletId: "w1",
  });
  assert.equal(quote.requiredBid, MIN_BID_USD);
  assert.equal(quote.amountDue, MIN_BID_USD);
  assert.equal(quote.vacant, true);
});

test("Take #1 is current #1 plus $5", () => {
  const listings = [listing({ id: "a", bid: 100, createdAt: 1 })];
  const quote = quoteClaim({
    listings,
    district: "casino",
    walletId: "w2",
  });
  assert.equal(quote.requiredBid, 100 + TAKE_STEP_USD);
  assert.equal(quote.amountDue, 105);
});

test("already listed pays the difference", () => {
  const listings = [
    listing({ id: "a", bid: 100, walletId: "w1", createdAt: 1 }),
    listing({ id: "b", bid: 80, walletId: "w2", createdAt: 2 }),
  ];
  const quote = quoteClaim({
    listings,
    district: "casino",
    walletId: "w2",
  });
  assert.equal(quote.requiredBid, 105);
  assert.equal(quote.amountDue, 25);
  assert.equal(quote.alreadyListed, true);
});

test("client requested bid cannot go below the server floor", () => {
  const listings = [listing({ id: "a", bid: 40, createdAt: 1 })];
  const quote = quoteClaim({
    listings,
    district: "casino",
    walletId: "w2",
    requestedBid: 12,
  });
  assert.equal(quote.requiredBid, 45);
});

test("client may raise the bid above the floor", () => {
  const listings = [listing({ id: "a", bid: 40, createdAt: 1 })];
  const quote = quoteClaim({
    listings,
    district: "casino",
    walletId: "w2",
    requestedBid: 90,
  });
  assert.equal(quote.requiredBid, 90);
  assert.equal(quote.amountDue, 90);
});

test("order is bid DESC, created_at ASC", () => {
  const listings = [
    listing({ id: "late-high", bid: 50, createdAt: 30 }),
    listing({ id: "early-high", bid: 50, createdAt: 10 }),
    listing({ id: "low", bid: 20, createdAt: 1 }),
  ];
  const ordered = sortListings(listings).map((item) => item.id);
  assert.deepEqual(ordered, ["early-high", "late-high", "low"]);
});

test("districts are independent auctions", () => {
  const listings = [
    listing({ id: "c", bid: 80, district: "casino" }),
    listing({ id: "r", bid: 200, district: "red", walletId: "wr" }),
  ];
  const casino = listingsForDistrict(listings, "casino");
  const red = listingsForDistrict(listings, "red");
  assert.equal(casino.length, 1);
  assert.equal(red[0]?.bid, 200);
  assert.equal(quoteClaim({ listings, district: "casino", walletId: "x" }).requiredBid, 85);
  assert.equal(quoteClaim({ listings, district: "red", walletId: "x" }).requiredBid, 205);
});

test("outbid a specific listing uses that bid + $5", () => {
  const listings = [
    listing({ id: "one", bid: 90, createdAt: 1 }),
    listing({ id: "two", bid: 40, createdAt: 2 }),
  ];
  const quote = quoteClaim({
    listings,
    district: "casino",
    walletId: "w3",
    targetListingId: "two",
  });
  assert.equal(quote.requiredBid, 45);
});

test("applyClaim inserts then ranking recomputes on the server", () => {
  const first = applyClaim({
    listings: [],
    district: "red",
    walletId: "w1",
    name: "Ada",
    handle: "@ada",
    url: "https://t.me/ada",
    bid: 10,
    now: 100,
    listingId: "L1",
  });
  const second = applyClaim({
    listings: first.listings,
    district: "red",
    walletId: "w2",
    name: "Bea",
    handle: "@bea",
    url: "https://t.me/bea",
    bid: 15,
    now: 200,
    listingId: "L2",
  });
  assert.equal(rankOf(second.listings, "L2"), 1);
  assert.equal(rankOf(second.listings, "L1"), 2);
  assert.equal(boardValue(second.listings, "red"), 25);
});

test("rebid keeps createdAt so older equal bids stay ahead", () => {
  const first = applyClaim({
    listings: [],
    district: "casino",
    walletId: "w1",
    name: "Ada",
    handle: "@ada",
    url: "https://example.com",
    bid: 10,
    now: 100,
    listingId: "L1",
  });
  const rival = applyClaim({
    listings: first.listings,
    district: "casino",
    walletId: "w2",
    name: "Bea",
    handle: "@bea",
    url: "https://example.com/b",
    bid: 10,
    now: 200,
    listingId: "L2",
  });
  const raised = applyClaim({
    listings: rival.listings,
    district: "casino",
    walletId: "w2",
    name: "Bea",
    handle: "@bea",
    url: "https://example.com/b",
    bid: 10,
    now: 300,
    listingId: "L2",
  });
  const bea = raised.listings.find((item) => item.walletId === "w2");
  assert.equal(bea?.createdAt, 200);
});
