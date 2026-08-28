import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHttpUrl, parseIdentity } from "./identity";

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

test("destination URLs must use https", () => {
  assert.equal(normalizeHttpUrl("http://example.com"), null);
});

test("destination URLs reject literal IPs and userinfo", () => {
  assert.equal(normalizeHttpUrl("https://127.0.0.1/path"), null);
  assert.equal(normalizeHttpUrl("https://user:pass@example.com/path"), null);
});

test("destination URLs reject shorteners and punycode lookalikes", () => {
  assert.equal(normalizeHttpUrl("https://bit.ly/offer"), null);
  assert.equal(normalizeHttpUrl("https://xn--pple-43d.com"), null);
});

test("destination URLs accept ordinary https and Telegram", () => {
  assert.equal(normalizeHttpUrl("https://example.com/offer#section"), "https://example.com/offer");
  assert.equal(normalizeHttpUrl("https://t.me/nightstrip"), "https://t.me/nightstrip");
});
