import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoPaymentsEnabled,
  isPaidStatus,
  nowpaymentsConfigured,
  signNowpaymentsBody,
  verifyNowpaymentsSignature,
} from "./nowpayments";

test("NOWPayments signature matches official JSON.stringify key sort", () => {
  const body = {
    payment_status: "finished",
    payment_id: 123,
    order_id: "abc",
    price_amount: 10,
  };
  const secret = "ipn-secret";
  const signature = signNowpaymentsBody(secret, body);
  assert.equal(verifyNowpaymentsSignature({ ipnSecret: secret, signature, body }), true);
  assert.equal(
    verifyNowpaymentsSignature({
      ipnSecret: secret,
      signature: "00".repeat(64),
      body,
    }),
    false,
  );
  assert.equal(
    verifyNowpaymentsSignature({ ipnSecret: secret, signature: null, body }),
    false,
  );
});

test("idempotent verify is stable for the same payload", () => {
  const body = { b: 1, a: 2 };
  const secret = "x";
  const first = signNowpaymentsBody(secret, body);
  const second = signNowpaymentsBody(secret, { a: 2, b: 1 });
  assert.equal(first, second);
});

test("live payments require a durable database", () => {
  const previous = {
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
    databaseUrl: process.env.DATABASE_URL,
  };
  try {
    process.env.NOWPAYMENTS_API_KEY = "key";
    process.env.NOWPAYMENTS_IPN_SECRET = "secret";
    delete process.env.DATABASE_URL;
    assert.equal(nowpaymentsConfigured(), false);
    process.env.DATABASE_URL = "postgres://example";
    assert.equal(nowpaymentsConfigured(), true);
  } finally {
    setOrDelete("NOWPAYMENTS_API_KEY", previous.apiKey);
    setOrDelete("NOWPAYMENTS_IPN_SECRET", previous.ipnSecret);
    setOrDelete("DATABASE_URL", previous.databaseUrl);
  }
});

test("only finished is a fulfillment status", () => {
  assert.equal(isPaidStatus("finished"), true);
  assert.equal(isPaidStatus("confirmed"), false);
  assert.equal(isPaidStatus("partially_paid"), false);
});

test("demo payments are local-only", () => {
  const previous = {
    vercel: process.env.VERCEL,
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
    databaseUrl: process.env.DATABASE_URL,
  };
  try {
    delete process.env.NOWPAYMENTS_API_KEY;
    delete process.env.NOWPAYMENTS_IPN_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
    assert.equal(demoPaymentsEnabled(), true);
    process.env.VERCEL = "1";
    assert.equal(demoPaymentsEnabled(), false);
  } finally {
    setOrDelete("VERCEL", previous.vercel);
    setOrDelete("NOWPAYMENTS_API_KEY", previous.apiKey);
    setOrDelete("NOWPAYMENTS_IPN_SECRET", previous.ipnSecret);
    setOrDelete("DATABASE_URL", previous.databaseUrl);
  }
});

function setOrDelete(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
