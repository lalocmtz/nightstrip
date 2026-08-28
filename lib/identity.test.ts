import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIdentity } from "./identity";

test("accepts @handle as a Telegram destination", () => {
  const parsed = parseIdentity("@laura_vip");
  assert.ok(!("error" in parsed));
  if ("error" in parsed) return;
  assert.equal(parsed.handle, "@laura_vip");
  assert.equal(parsed.url, "https://t.me/laura_vip");
});

test("rejects javascript URLs", () => {
  const parsed = parseIdentity("nope", "javascript:alert(1)");
  assert.ok("error" in parsed);
});

test("accepts a named https listing", () => {
  const parsed = parseIdentity("TipsterPro NBA", "https://example.com/nba");
  assert.ok(!("error" in parsed));
  if ("error" in parsed) return;
  assert.equal(parsed.name, "TipsterPro NBA");
  assert.equal(parsed.url, "https://example.com/nba");
});
