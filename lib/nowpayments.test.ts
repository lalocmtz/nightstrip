import { test } from "node:test";
import assert from "node:assert/strict";
import {
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
