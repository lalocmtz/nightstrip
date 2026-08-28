import { test } from "node:test";
import assert from "node:assert/strict";
import { claimRateLimit, hasAllowedOrigin } from "./request-security";

test("origin check accepts same-origin and rejects cross-origin browser posts", () => {
  assert.equal(
    hasAllowedOrigin(
      new Request("https://nightstrip.com/api/claim", {
        headers: { origin: "https://nightstrip.com" },
      }),
    ),
    true,
  );
  assert.equal(
    hasAllowedOrigin(
      new Request("https://nightstrip.com/api/claim", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
});

test("claim limiter blocks the sixth attempt in a ten-minute window", () => {
  const request = new Request("https://nightstrip.com/api/claim", {
    headers: { "x-forwarded-for": "203.0.113.77" },
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(claimRateLimit(request, 1_000).allowed, true);
  }
  const blocked = claimRateLimit(request, 1_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 600);
});
