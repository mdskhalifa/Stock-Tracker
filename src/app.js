import { getProviderSettings } from "./config.js";
import { fetchMarketQuotes } from "./providers.js";
import {
  buildAllocation,
  formatDateTime,
  formatSignedCurrency,
  getValueTone,
  summarizeHoldings,
  toCurrency,
  toPercent,
  normalizeHolding
} from "./portfolio.js";
import { loadPortfolioState, savePortfolioState } from "./storage.js";

const elements = {
  addHoldingBtn: document.getElementById("add-holding-btn"),
  refreshPricesBtn: document.getElementById("refresh-prices-btn"),
  searchInput: document.getElementById("search-input"),
  filterSelect: document.getElementById("filter-select"),
  tickerFilterWrap: document.getElementById("ticker-filter-wrap"),
  tickerFilter: document.getElementById("ticker-filter"),
  lastRefreshTime: document.getElementById("last-refresh-time"),
  holdingsBody: document.getElementById("holdings-body"),
  allocationChart: document.getElementById("allocation-chart"),
  allocationList: document.getElementById("allocation-list"),
  modal: document.getElementById("position-modal"),
  modalTitle: document.getElementById("modal-title"),
  closeModal: document.getElementById("close-modal"),
  cancelModal: document.getElementById("cancel-modal"),
  positionForm: document.getElementById("position-form"),
  positionId: document.getElementById("position-id"),
  positionSymbol: document.getElementById("position-symbol"),
  positionCompany: document.getElementById("position-company"),
  positionQuantity: document.getElementById("position-quantity"),
  positionPrice: document.getElementById("position-price"),
  sortButtons: [...document.querySelectorAll(".sort-btn")]
};

const state = {
  holdings: [],
  realizedGain: 0,
  lastRefresh: null,
  quoteCache: {},
  sortKey: "symbol",
  sortDirection: "asc",
  filter: "all",
  search: "",
  tickerFilter: "",
  modalMode: "add",
  editingId: null
};

function getSafeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function setStatus(message) {
  elements.lastRefreshTime.textContent = message;
}

function persistState() {
  savePortfolioState({
    holdings: state.holdings,
    realizedGain: state.realizedGain,
    lastRefresh: state.lastRefresh
  });
}

function loadState() {
  const persisted = loadPortfolioState();
  state.holdings = Array.isArray(persisted.holdings) ? persisted.holdings.map(normalizeHolding) : [];
  state.realizedGain = Number(persisted.realizedGain) || 0;
  state.lastRefresh = persisted.lastRefresh || null;
}

function openModal(mode = "add", holding = null) {
  state.modalMode = mode;
  state.editingId = holding ? holding.id : null;
  elements.positionId.value = holding ? holding.id : "";
  elements.positionSymbol.value = holding ? holding.symbol : "";
  elements.positionCompany.value = holding ? holding.company : "";
  elements.positionQuantity.value = holding ? holding.quantity : "";
  elements.positionPrice.value = holding ? holding.avgPrice : "";

  const title = mode === "edit" ? "Edit Position" : mode === "buy" ? "Buy More Shares" : "Add Position";
  elements.modalTitle.textContent = title;
  elements.modal.classList.remove("hidden");
  elements.positionSymbol.focus();
}

function closeModal() {
  elements.modal.classList.add("hidden");
  elements.positionForm.reset();
  state.editingId = null;
  state.modalMode = "add";
}

function toSignedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const numeric = Number(value);
  const sign = numeric >= 0 ? "+" : "−";
  return `${sign}${Math.abs(numeric).toFixed(2)}%`;
}

function formatPercentageCell(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const numeric = Number(value);
  return `${numeric >= 0 ? "+" : "−"}${Math.abs(numeric).toFixed(2)}%`;
}

function getFilteredHoldings(holdings) {
  const searchTerm = state.search.trim().toLowerCase();
  const tickerTerm = state.tickerFilter.trim().toUpperCase();

  let filtered = holdings.filter((holding) => {
    const matchesSearch = !searchTerm || holding.symbol.toLowerCase().includes(searchTerm) || holding.company.toLowerCase().includes(searchTerm);
    const matchesTicker = !tickerTerm || holding.symbol.toUpperCase().includes(tickerTerm);

    let matchesFilter = true;
    if (state.filter === "profitable") {
      matchesFilter = Number(holding.unrealizedGain) > 0;
    } else if (state.filter === "losing") {
      matchesFilter = Number(holding.unrealizedGain) < 0;
    } else if (state.filter === "ticker") {
      matchesFilter = matchesTicker;
    }

    return matchesSearch && matchesTicker && matchesFilter;
  });

  filtered.sort((a, b) => {
    let left = a[state.sortKey];
    let right = b[state.sortKey];

    if (state.sortKey === "symbol") {
      left = String(left || "").toUpperCase();
      right = String(right || "").toUpperCase();
      return state.sortDirection === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    }

    left = getSafeNumber(left);
    right = getSafeNumber(right);
    return state.sortDirection === "asc" ? left - right : right - left;
  });

  return filtered;
}

function renderSummary(summary) {
  const values = {
    totalInvested: summary.totalInvested,
    portfolioValue: summary.currentValue,
    unrealized: summary.unrealized,
    todayGain: summary.todayGain,
    realizedGain: summary.realizedGain,
    totalReturn: summary.totalReturn
  };

  for (const [key, value] of Object.entries(values)) {
    const element = document.getElementById(
      key === "totalInvested"
        ? "total-invested"
        : key === "portfolioValue"
          ? "portfolio-value"
          : key === "unrealized"
            ? "unrealized-gain"
            : key === "todayGain"
              ? "today-gain"
              : key === "realizedGain"
                ? "realized-gain"
                : "total-return"
    );

    if (!element) {
      continue;
    }

    let displayValue = "$0.00";
    if (key === "totalReturn") {
      displayValue = `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
    } else {
      displayValue = toCurrency(value);
    }

    if (key === "realizedGain" || key === "unrealized" || key === "todayGain") {
      displayValue = formatSignedCurrency(value);
    }

    element.textContent = displayValue;
    const tone = getValueTone(value);
    element.classList.remove("positive", "negative", "neutral");
    element.classList.add(tone);
  }

  const totalReturnEl = document.getElementById("total-return");
  totalReturnEl.textContent = `${summary.totalReturn >= 0 ? "+" : "−"}${Math.abs(summary.totalReturn).toFixed(2)}%`;
  totalReturnEl.classList.remove("positive", "negative", "neutral");
  totalReturnEl.classList.add(getValueTone(summary.totalReturn));

  if (summary.totalInvested === 0 && summary.currentValue === 0) {
    setStatus("No holdings yet. Add a position to begin tracking.");
  }
}

function renderAllocation(summary) {
  const segments = buildAllocation(summary.holdings).segments;
  const chart = document.getElementById("allocation-chart");

  if (!segments.length) {
    chart.style.background = "#edf3f9";
    elements.allocationList.innerHTML = "<li class=\"empty-state\">Add positions to see allocation.</li>";
    return;
  }

  const total = summary.currentValue || 1;
  chart.style.background = `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})`;

  elements.allocationList.innerHTML = segments
    .map((segment) => {
      const percent = (segment.marketValue / total) * 100;
      return `
        <li class="allocation-item">
          <span class="swatch" style="background:${segment.color};"></span>
          <span>${segment.symbol}</span>
          <strong>${percent.toFixed(1)}%</strong>
        </li>
      `;
    })
    .join("");
}

function renderTable(holdings) {
  const tbody = elements.holdingsBody;
  if (!holdings.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="empty-state">No matching positions</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = holdings
    .map((holding) => {
      const costBasis = getSafeNumber(holding.costBasis);
      const marketValue = getSafeNumber(holding.marketValue);
      const unrealized = getSafeNumber(holding.unrealizedGain);
      const unrealizedPercent = getSafeNumber(holding.unrealizedPercent);
      const currentPrice = holding.currentPrice != null ? getSafeNumber(holding.currentPrice) : null;
      const prevClose = holding.previousClose != null ? getSafeNumber(holding.previousClose) : null;
      const dayPercent = currentPrice && prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
      const latestTimestamp = holding.lastQuoteUpdate ? formatDateTime(holding.lastQuoteUpdate) : "Not available";
      const statusText = holding.quoteStatus ? holding.quoteStatus : "latest available";

      return `
        <tr data-id="${holding.id}">
          <td class="ticker-cell">${holding.symbol}</td>
          <td class="company-cell">${holding.company}</td>
          <td>${Number(holding.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
          <td>${toCurrency(holding.avgPrice)}</td>
          <td>${currentPrice !== null ? toCurrency(currentPrice) : "—"}</td>
          <td class="${dayPercent >= 0 ? "positive" : "negative"}">${formatPercentageCell(dayPercent)}</td>
          <td>${toCurrency(costBasis)}</td>
          <td>${toCurrency(marketValue)}</td>
          <td class="${unrealized >= 0 ? "positive" : "negative"}">${formatSignedCurrency(unrealized)}</td>
          <td class="${unrealizedPercent >= 0 ? "positive" : "negative"}">${formatPercentageCell(unrealizedPercent)}</td>
          <td>
            <div>${latestTimestamp}</div>
            <small>${statusText}</small>
          </td>
          <td>
            <div class="action-buttons">
              <button type="button" class="tiny-btn edit-btn" data-action="edit" data-id="${holding.id}">Edit</button>
              <button type="button" class="tiny-btn buy-btn" data-action="buy" data-id="${holding.id}">Buy More</button>
              <button type="button" class="tiny-btn sell-btn" data-action="sell" data-id="${holding.id}">Sell</button>
              <button type="button" class="tiny-btn delete-btn danger" data-action="delete" data-id="${holding.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  const summary = summarizeHoldings(state.holdings, state.quoteCache, state.realizedGain);
  const visibleHoldings = getFilteredHoldings(summary.holdings);

  renderSummary(summary);
  renderAllocation(summary);
  renderTable(visibleHoldings);

  if (state.lastRefresh) {
    setStatus(`Last refreshed: ${formatDateTime(state.lastRefresh)}`);
  } else if (!state.holdings.length) {
    setStatus("No holdings yet. Add a position to begin tracking.");
  }

  const filterSelectValue = state.filter;
  elements.filterSelect.value = filterSelectValue;
  elements.tickerFilterWrap.classList.toggle("hidden", filterSelectValue !== "ticker");
  elements.tickerFilter.value = state.tickerFilter;
}

function addOrUpdateHolding(payload) {
  const symbol = String(payload.symbol).trim().toUpperCase();
  const company = String(payload.company).trim();
  const quantity = Number(payload.quantity);
  const avgPrice = Number(payload.avgPrice);

  if (!symbol || !company || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(avgPrice) || avgPrice <= 0) {
    return false;
  }

  if (state.modalMode === "edit" && state.editingId) {
    const index = state.holdings.findIndex((holding) => holding.id === state.editingId);
    if (index >= 0) {
      state.holdings[index] = {
        ...state.holdings[index],
        symbol,
        company,
        quantity,
        avgPrice,
        currentPrice: state.holdings[index].currentPrice ?? null,
        previousClose: state.holdings[index].previousClose ?? null,
        quoteStatus: state.holdings[index].quoteStatus || "latest available"
      };
    }
  } else if (state.modalMode === "buy" && state.editingId) {
    const target = state.holdings.find((holding) => holding.id === state.editingId);
    if (target) {
      const combinedQuantity = Number(target.quantity) + quantity;
      const weightedAverage = ((Number(target.quantity) * Number(target.avgPrice)) + (quantity * avgPrice)) / combinedQuantity;
      target.quantity = combinedQuantity;
      target.avgPrice = weightedAverage;
      target.company = company || target.company;
      target.currentPrice = target.currentPrice ?? null;
    }
  } else {
    state.holdings.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      symbol,
      company,
      quantity,
      avgPrice,
      currentPrice: null,
      previousClose: null,
      changePercent: 0,
      lastQuoteUpdate: null,
      quoteStatus: "latest available",
      realizedGain: 0
    });
  }

  persistState();
  render();
  closeModal();
  return true;
}

function handleDelete(holdingId) {
  const target = state.holdings.find((holding) => holding.id === holdingId);
  if (!target) {
    return;
  }

  const confirmed = window.confirm(`Delete ${target.symbol} from your portfolio?`);
  if (!confirmed) {
    return;
  }

  state.holdings = state.holdings.filter((holding) => holding.id !== holdingId);
  persistState();
  render();
}

async function refreshQuotes() {
  if (!state.holdings.length) {
    setStatus("No holdings available to refresh.");
    return;
  }

  const symbols = state.holdings.map((holding) => holding.symbol);
  elements.refreshPricesBtn.disabled = true;
  setStatus("Refreshing quotes…");

  try {
    const updatedQuotes = await fetchMarketQuotes(symbols);
    state.quoteCache = updatedQuotes;

    state.holdings = state.holdings.map((holding) => {
      const quote = updatedQuotes[holding.symbol] || {};
      const currentPrice = quote.price != null ? Number(quote.price) : holding.currentPrice;
      const previousClose = quote.previousClose != null ? Number(quote.previousClose) : holding.previousClose ?? currentPrice;
      const dayPercent = currentPrice && previousClose && previousClose !== 0 ? ((currentPrice - previousClose) / previousClose) * 100 : Number(holding.changePercent) || 0;

      return {
        ...holding,
        currentPrice: currentPrice ?? holding.currentPrice ?? null,
        previousClose: previousClose ?? holding.previousClose ?? currentPrice ?? null,
        changePercent: Number.isFinite(dayPercent) ? dayPercent : Number(holding.changePercent) || 0,
        lastQuoteUpdate: quote.updatedAt || holding.lastQuoteUpdate || new Date().toISOString(),
        quoteStatus: quote.status || holding.quoteStatus || "latest available"
      };
    });

    state.lastRefresh = new Date().toISOString();
    persistState();
    render();
    setStatus(`Last refreshed: ${formatDateTime(state.lastRefresh)}`);
  } catch (error) {
    setStatus("Price refresh failed. Please try again.");
  } finally {
    elements.refreshPricesBtn.disabled = false;
  }
}

function handlePositionAction(action, holdingId) {
  const target = state.holdings.find((holding) => holding.id === holdingId);
  if (!target) {
    return;
  }

  if (action === "edit") {
    openModal("edit", target);
    return;
  }

  if (action === "buy") {
    openModal("buy", target);
    return;
  }

  if (action === "delete") {
    handleDelete(holdingId);
    return;
  }

  if (action === "sell") {
    const quantityInput = window.prompt(`How many shares of ${target.symbol} would you like to sell?`, String(Math.min(target.quantity, 1)));
    if (quantityInput === null) {
      return;
    }

    const qtyToSell = Number(quantityInput);
    if (!Number.isFinite(qtyToSell) || qtyToSell <= 0 || qtyToSell > Number(target.quantity)) {
      window.alert("Please enter a valid number of shares to sell.");
      return;
    }

    const salePrice = target.currentPrice ?? target.avgPrice ?? 0;
    const realized = qtyToSell * (salePrice - target.avgPrice);
    state.realizedGain += realized;

    const remainingQty = Number(target.quantity) - qtyToSell;
    if (remainingQty <= 0) {
      state.holdings = state.holdings.filter((holding) => holding.id !== holdingId);
    } else {
      target.quantity = remainingQty;
    }

    persistState();
    render();
  }
}

function bindEvents() {
  elements.addHoldingBtn.addEventListener("click", () => openModal("add"));
  elements.closeModal.addEventListener("click", closeModal);
  elements.cancelModal.addEventListener("click", closeModal);
  elements.refreshPricesBtn.addEventListener("click", refreshQuotes);

  elements.filterSelect.addEventListener("change", (event) => {
    state.filter = event.target.value;
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  elements.tickerFilter.addEventListener("input", (event) => {
    state.tickerFilter = event.target.value;
    render();
  });

  elements.sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = "asc";
      }

      render();
    });
  });

  elements.positionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      symbol: elements.positionSymbol.value,
      company: elements.positionCompany.value,
      quantity: elements.positionQuantity.value,
      avgPrice: state.modalMode === "buy" && state.editingId ? elements.positionPrice.value : elements.positionPrice.value
    };

    if (!addOrUpdateHolding(payload)) {
      window.alert("Please enter valid details for the position.");
    }
  });

  elements.holdingsBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const holdingId = button.dataset.id;
    handlePositionAction(action, holdingId);
  });

  window.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });
}

loadState();
bindEvents();
render();

const providerSettings = getProviderSettings();
console.info(`Portfolio tracker initialized with provider: ${providerSettings.providerMeta[providerSettings.provider]?.name || "configured provider"}`);
