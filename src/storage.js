export const STORAGE_KEY = "stock-portfolio-tracker.v1";

function safeStorage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

export function loadPortfolioState() {
  const storage = safeStorage();
  if (!storage) {
    return { holdings: [], realizedGain: 0, lastRefresh: null };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { holdings: [], realizedGain: 0, lastRefresh: null };
    }

    const parsed = JSON.parse(raw);
    return {
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      realizedGain: Number(parsed.realizedGain) || 0,
      lastRefresh: parsed.lastRefresh || null
    };
  } catch (error) {
    return { holdings: [], realizedGain: 0, lastRefresh: null };
  }
}

export function savePortfolioState(state) {
  const storage = safeStorage();
  if (!storage) {
    return false;
  }

  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      holdings: state.holdings,
      realizedGain: Number(state.realizedGain) || 0,
      lastRefresh: state.lastRefresh || null
    })
  );

  return true;
}

export function loadPortfolio() {
  return loadPortfolioState().holdings;
}

export function savePortfolio(holdings, extraState = {}) {
  const state = {
    holdings: Array.isArray(holdings) ? holdings : [],
    realizedGain: Number(extraState.realizedGain) || 0,
    lastRefresh: extraState.lastRefresh || null
  };
  return savePortfolioState(state);
}
