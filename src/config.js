export const appConfig = {
  provider: "alpha-vantage",
  apiKey: "demo",
  quoteDelay: "Delayed on the free demo plan; real-time and lower latency require a paid tier.",
  providerMeta: {
    "alpha-vantage": {
      name: "Alpha Vantage",
      cost: "Free demo key / paid plans",
      quoteDelay: "Usually delayed on the free tier",
      browserAccess: true,
      supportedSymbols: "US-listed equities",
      realTime: "Available on paid plans"
    },
    "twelve-data": {
      name: "Twelve Data",
      cost: "Low-cost paid subscriptions",
      quoteDelay: "Near real-time on paid tiers",
      browserAccess: true,
      supportedSymbols: "Broad US equity coverage",
      realTime: "Yes"
    }
  }
};

export function getProviderSettings() {
  return appConfig;
}
