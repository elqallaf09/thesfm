# Full stock-category scanner

The category news destinations no longer rely on a small fixed symbol list as their primary discovery mechanism.

## Coverage

- Growth: US fundamental growth screener using recent completed-quarter growth data.
- Energy: all active US common-stock candidates classified as Energy.
- Banking: active US Financial Services companies identified as banking businesses.
- Defensive: Consumer Defensive, Healthcare, Utilities, plus telecom-oriented Communication Services.
- Cyclical: Consumer Cyclical, Industrials, Basic Materials and Real Estate.
- Dividend/high-income: active US stocks with a positive annual cash dividend and indicated yield >= 1.5%.
- Sharia: the persisted SFM screening catalog; Sharia status is never inferred from price or sector.

The US universe is discovered from NASDAQ, NYSE and AMEX through the configured Financial Modeling Prep integration. The full universe is scanned before category matching. Responses are bounded for page performance, while `universe_count` and `matched_count` report the real scanned coverage.

## Data truthfulness

Scanner rows can include price, daily change, market cap, volume, beta, dividend data, growth fields, exchange/sector/industry, and Sharia evidence fields where applicable. Missing provider fields remain unavailable; they are never replaced by synthetic numbers.

When an upstream provider is unavailable or not configured, the API explicitly enters `fallback_watchlist` mode and returns a degraded status instead of presenting the fallback as full coverage.

## Refresh

The scanner UI refreshes every five minutes and supports a manual force refresh. Server responses use bounded caching to reduce upstream load. Existing ticker and mover surfaces consume scanner output so their symbol coverage follows the dynamic category universe rather than the former hard-coded lists.
