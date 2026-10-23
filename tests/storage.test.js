import test from "node:test";
import assert from "node:assert/strict";

import { loadPortfolioState, savePortfolioState } from "../src/storage.js";

test("storage loads and saves portfolio state", () => {
  globalThis.localStorage = {
    data: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
    removeItem(key) {
      delete this.data[key];
    }
  };

  const before = loadPortfolioState();
  assert.deepEqual(before, { holdings: [], realizedGain: 0, lastRefresh: null });

  savePortfolioState({
    holdings: [{ id: "1", symbol: "AAPL", quantity: 3, avgPrice: 180.2 }],
    realizedGain: 35.25,
    lastRefresh: "2026-10-23T15:00:00Z"
  });

  const after = loadPortfolioState();
  assert.equal(after.holdings.length, 1);
  assert.equal(after.realizedGain, 35.25);
  assert.equal(after.lastRefresh, "2026-10-23T15:00:00Z");
});
