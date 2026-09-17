# Stock category scanner API

`GET /api/stock-categories/scanner?category=<id>&limit=<n>` scans the configured category universe and returns bounded rich rows plus the full scanned/matched counts.

Supported category ids: `energy`, `banking`, `sharia`, `growth`, `defensive`, `cyclical`, `dividend`.

Add `refresh=1` to bypass response caching and request a fresh upstream scan. The route returns `screening_mode` and `degraded_reason`; clients must not present `fallback_watchlist` as full scanner coverage.
