import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCostBasis,
  calculateMarketValue,
  calculateUnrealizedGain,
  calculateUnrealizedPercent,
  summarizeHoldings
} from "../src/portfolio.js";

test("calculateCostBasis returns quantity times average purchase price", () => {
  assert.equal(calculateCostBasis(25, 182.5), 4562.5);
});

test("calculateMarketValue multiplies quantity by current price", () => {
  assert.equal(calculateMarketValue(12, 210.75), 2529);
});

test("calculateUnrealizedGain is market value minus cost basis", () => {
  const gain = calculateUnrealizedGain(2529, 2400);
  assert.equal(gain, 129);
});

test("calculateUnrealizedPercent handles zero cost basis safely", () => {
  assert.equal(calculateUnrealizedPercent(1000, 0), 0);
});

test("summarizeHoldings aggregates portfolio metrics correctly", () => {
  const holdings = [
    { id: "a", symbol: "AAPL", company: "Apple Inc.", quantity: 10, avgPrice: 180, currentPrice: 200, previousClose: 198, quoteStatus: "real-time" },
    { id: "b", symbol: "MSFT", company: "Microsoft", quantity: 5, avgPrice: 300, currentPrice: 280, previousClose: 290, quoteStatus: "real-time" }
  ];

  const summary = summarizeHoldings(holdings, {
    AAPL: { price: 200, previousClose: 198, changePercent: 1.01, status: "real-time", updatedAt: "2026-10-23T15:00:00Z" },
    MSFT: { price: 280, previousClose: 290, changePercent: -3.45, status: "real-time", updatedAt: "2026-10-23T15:00:00Z" }
  }, 150);

  assert.equal(summary.totalInvested, 3300);
  assert.equal(summary.currentValue, 3400);
  assert.equal(summary.unrealized, 100);
  assert.equal(summary.todayGain, -30);
  assert.equal(summary.totalReturn, ((3400 + 150 - 3300) / 3300) * 100);
  assert.equal(summary.holdings.length, 2);
});
