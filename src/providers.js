import { appConfig } from "./config.js";

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace(/[$,%\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function getQuoteStatus() {
  const isWeekend = [0, 6].includes(new Date().getDay());
  if (isWeekend) {
    return "latest available";
  }

  if (appConfig.apiKey === "demo") {
    return "delayed";
  }

  return "real-time";
}

function normalizeQuote(symbol, data = {}) {
  const price = toNumber(data["05. price"] ?? data.price ?? data.last ?? data.value);
  const previousClose = toNumber(data["08. previous close"] ?? data.previousClose ?? data.prevClose ?? data.close);
  const changePercent = toNumber(data["10. change percent"] ?? data.changePercent ?? data.pctChange);
  const updatedAt = data["07. latest trading day"] || data.lastUpdated || new Date().toISOString();

  return {
    symbol: (data["01. symbol"] || symbol || "").toUpperCase(),
    price,
    previousClose,
    changePercent,
    updatedAt,
    status: getQuoteStatus(),
    source: "Alpha Vantage"
  };
}

async function fetchAlphaVantageQuote(symbol) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(appConfig.apiKey || "demo")}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload.Note || payload.Information) {
      return {
        symbol: symbol.toUpperCase(),
        price: null,
        previousClose: null,
        changePercent: null,
        updatedAt: new Date().toISOString(),
        status: "latest available",
        source: "Alpha Vantage"
      };
    }

    return normalizeQuote(symbol, payload["Global Quote"] || {});
  } catch (error) {
    return {
      symbol: symbol.toUpperCase(),
      price: null,
      previousClose: null,
      changePercent: null,
      updatedAt: new Date().toISOString(),
      status: "latest available",
      source: "Alpha Vantage"
    };
  }
}

export async function fetchMarketQuotes(symbols) {
  const uniqueSymbols = [...new Set((symbols || []).map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean))];

  if (!uniqueSymbols.length) {
    return {};
  }

  const quoteMap = {};
  const allQuotes = await Promise.all(uniqueSymbols.map((symbol) => fetchAlphaVantageQuote(symbol)));

  for (const quote of allQuotes) {
    quoteMap[quote.symbol] = {
      ...quote,
      updatedAt: quote.updatedAt || new Date().toISOString(),
      status: quote.status || "latest available"
    };
  }

  return quoteMap;
}
