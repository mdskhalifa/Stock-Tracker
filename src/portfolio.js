export function toCurrency(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function toPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const numeric = Number(value);
  return `${numeric >= 0 ? "+" : "−"}${Math.abs(numeric).toFixed(2)}%`;
}

export function formatSignedCurrency(value) {
  const numeric = Number(value) || 0;
  const sign = numeric >= 0 ? "+" : "−";
  return `${sign}${toCurrency(Math.abs(numeric))}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function calculateCostBasis(quantity, avgPrice) {
  return Number(quantity || 0) * Number(avgPrice || 0);
}

export function calculateMarketValue(quantity, currentPrice) {
  return Number(quantity || 0) * Number(currentPrice || 0);
}

export function calculateUnrealizedGain(marketValue, costBasis) {
  return marketValue - costBasis;
}

export function calculateUnrealizedPercent(marketValue, costBasis) {
  if (!costBasis || Number(costBasis) === 0) {
    return 0;
  }

  return ((marketValue - costBasis) / costBasis) * 100;
}

export function calculateDailyValue(quantity, currentPrice, previousClose) {
  return Number(quantity || 0) * (Number(currentPrice || 0) - Number(previousClose || currentPrice || 0));
}

export function normalizeHolding(holding) {
  const symbol = String(holding.symbol || "").trim().toUpperCase();
  const quantity = Number(holding.quantity) || 0;
  const avgPrice = Number(holding.avgPrice) || 0;

  return {
    ...holding,
    id: holding.id || `${symbol}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol,
    company: String(holding.company || "Unknown Company").trim(),
    quantity,
    avgPrice,
    currentPrice: Number(holding.currentPrice) || null,
    previousClose: Number(holding.previousClose) || null,
    changePercent: Number(holding.changePercent) || 0,
    costBasis: calculateCostBasis(quantity, avgPrice),
    marketValue: 0,
    unrealizedGain: 0,
    unrealizedPercent: 0,
    todayValue: 0,
    lastQuoteUpdate: holding.lastQuoteUpdate || null,
    quoteStatus: holding.quoteStatus || "latest available",
    realizedGain: Number(holding.realizedGain) || 0
  };
}

export function summarizeHoldings(holdings, quotesBySymbol = {}, realizedGain = 0) {
  const normalized = (holdings || []).map(normalizeHolding);

  const enriched = normalized.map((holding) => {
    const quote = quotesBySymbol[holding.symbol] || {};
    const currentPrice = Number(quote.price ?? holding.currentPrice ?? 0) || 0;
    const previousClose = Number(quote.previousClose ?? holding.previousClose ?? currentPrice) || 0;
    const costBasis = calculateCostBasis(holding.quantity, holding.avgPrice);
    const marketValue = calculateMarketValue(holding.quantity, currentPrice);
    const unrealizedGain = calculateUnrealizedGain(marketValue, costBasis);
    const unrealizedPercent = calculateUnrealizedPercent(marketValue, costBasis);
    const todayValue = calculateDailyValue(holding.quantity, currentPrice, previousClose);

    return {
      ...holding,
      currentPrice,
      previousClose,
      changePercent: typeof quote.changePercent === "number" ? quote.changePercent : Number(holding.changePercent) || 0,
      costBasis,
      marketValue,
      unrealizedGain,
      unrealizedPercent,
      todayValue,
      lastQuoteUpdate: quote.updatedAt || holding.lastQuoteUpdate || null,
      quoteStatus: quote.status || holding.quoteStatus || "latest available"
    };
  });

  const totalInvested = enriched.reduce((sum, holding) => sum + Number(holding.costBasis || 0), 0);
  const currentValue = enriched.reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0);
  const todayGain = enriched.reduce((sum, holding) => sum + Number(holding.todayValue || 0), 0);
  const unrealized = currentValue - totalInvested;
  const totalReturn = totalInvested === 0 ? 0 : ((currentValue + Number(realizedGain || 0) - totalInvested) / totalInvested) * 100;

  return {
    holdings: enriched,
    totalInvested,
    currentValue,
    unrealized,
    todayGain,
    realizedGain: Number(realizedGain) || 0,
    totalReturn
  };
}

export function getValueTone(value) {
  if (Number(value) > 0) {
    return "positive";
  }
  if (Number(value) < 0) {
    return "negative";
  }
  return "neutral";
}

export function buildAllocation(holdings) {
  const active = (holdings || []).filter((holding) => Number(holding.marketValue || 0) > 0);
  const total = active.reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0);

  if (!active.length || total <= 0) {
    return { segments: [], gradient: "#dfe8f5" };
  }

  const palette = ["#1d5ef7", "#31b57b", "#f7b731", "#ff7e67", "#8b5cf6", "#0ea5e9", "#f97316", "#14b8a6"];
  let cursor = 0;

  const segments = active.map((holding, index) => {
    const share = (Number(holding.marketValue || 0) / total) * 100;
    const start = cursor;
    const end = cursor + share;
    cursor = end;
    return {
      ...holding,
      share,
      start,
      end,
      color: palette[index % palette.length]
    };
  });

  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return { segments, gradient };
}
