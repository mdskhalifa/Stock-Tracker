# US Stock Portfolio Tracker

A responsive US stock portfolio tracker built with HTML, CSS, and vanilla JavaScript for GitHub Pages. It stores portfolio data in browser `localStorage`, fetches live quotes from a configurable stock data provider, computes portfolio metrics, and includes automated tests for finance and storage behaviors.

## Provider selection and comparison

The app is designed so the provider is configurable without rewriting the screens. The default provider is `Alpha Vantage` with the public `demo` key for easy testing and demo functionality. For production, replace the key in `src/config.js` or create a custom configuration object before deployment.

Recommended providers for this project:

- Alpha Vantage
  - Cost: Free demo key for limited usage; paid tiers thereafter.
  - Quote delay: Often delayed on free tier; not ideal for real-time monitoring.
  - API limits: Very limited on free plan; usually sufficient for small portfolios.
  - Browser access: Yes, from browser JS if you use `fetch` and CORS is enabled.
  - Symbols: US equities supported.
  - Real-time: Limited or delayed; not ideal for active trading.

- Twelve Data
  - Cost: Free trial and low-cost paid plans.
  - Quote delay: Near real-time on paid tiers; delayed on some free/test plans.
  - API limits: Better than most free tiers; can handle portfolio refreshes well.
  - Browser access: Yes, from browser JS with an API key.
  - Symbols: Broad US stock symbol coverage.
  - Real-time: Very good on paid plans.

- Yahoo Finance public endpoints
  - Cost: Free, no API key required.
  - Quote delay: Usually delayed; not an official market data API.
  - API limits: Unofficial and variable; can rate-limit or change suddenly.
  - Browser access: Works in some browsers but may be blocked or change without notice.
  - Symbols: Broad coverage with US equities.
  - Real-time: Not guaranteed.

Why this app uses a configurable adapter:
- It avoids hard-coding one provider deep into the UI.
- It allows a production environment to use a paid provider without changing dashboard logic.
- It keeps the architecture simple enough for GitHub Pages.

## Project structure

- `index.html` — dashboard shell
- `styles.css` — responsive financial dashboard styling
- `src/config.js` — provider configuration and default settings
- `src/providers.js` — stock provider adapters
- `src/portfolio.js` — portfolio calculations and formatting
- `src/storage.js` — localStorage management
- `src/app.js` — UI rendering and actions
- `tests/*.test.js` — unit tests

## Local development

1. Clone the repository.
2. Open a terminal in the project folder.
3. Run:
   ```bash
   npm test
   ```
4. To serve locally:
   ```bash
   python3 -m http.server 8000
   ```
5. Open http://localhost:8000

## GitHub Pages deployment

1. Push the project to a GitHub repository.
2. In GitHub, open the repository settings.
3. Navigate to Pages.
4. Select the default branch and root folder (`/`).
5. Save. GitHub will publish the site.

The app uses only static files and browser storage, so GitHub Pages can host it without a backend.

## Important note on API keys and security

Do not commit private API keys to a public repository. The default configuration uses the Alpha Vantage `demo` key so the app works immediately without secret credentials. For production, move the key into a serverless or environment-based setup, or set it in a non-public configuration file that is not checked into Git.

## Features included

- Portfolio summary cards
- Stock holdings table with sorting, search, and filtering
- Refresh prices action with loading state
- Price and P/L calculations using real quote data when available
- Add, edit, buy, sell, and delete holdings
- Local persistence in browser storage
- Responsive layout for desktop, tablet, and mobile
- Automated tests for portfolio math and storage behavior

## Financial calculation conventions

- Total invested = sum of remaining cost basis for current holdings.
- Current portfolio value = sum of current market values.
- Unrealized gain/loss = current value - remaining cost basis.
- Today's gain/loss = sum of daily change estimates based on current price minus previous close, scaled by shares.
- Realized gain/loss = net gain or loss from completed sales.
- Total return (%) = ((current portfolio value + realized gain/loss - total invested) / total invested) * 100.

## Market trading-day handling

The app treats weekend days as market-closed and uses the latest available previous-close estimate when a live price is unavailable. If no valid quote is found, the row and metrics display the last valid data or zero values rather than a fabricated price.

## Future improvements

- Add CSV import/export for holdings.
- Add charting and historical performance analytics.
- Add OAuth-backed user accounts.
- Move secret API keys to a secure serverless API or a backend endpoint.
