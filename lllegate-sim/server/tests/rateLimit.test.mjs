import assert from "node:assert/strict";
import test from "node:test";
import { hitRateLimit, resetRateLimits } from "../src/security/rateLimit.js";

test("the rate-limit cache stays bounded and removes expired keys", () => {
  resetRateLimits();

  const now = 1_000_000;
  for (let index = 0; index < 10_000; index += 1) {
    assert.equal(
      hitRateLimit(`phone:${index}`, { limit: 1, windowMs: 60_000, now }).ok,
      true,
    );
  }

  assert.equal(hitRateLimit("phone:overflow", { limit: 1, windowMs: 60_000, now }).ok, false);
  assert.equal(
    hitRateLimit("phone:recycled", { limit: 1, windowMs: 60_000, now: now + 60_001 }).ok,
    true,
  );
  assert.equal(
    hitRateLimit("phone:overflow", { limit: 1, windowMs: 60_000, now: now + 60_001 }).ok,
    true,
  );

  resetRateLimits();
});
