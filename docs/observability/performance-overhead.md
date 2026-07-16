# Observability performance overhead

Measured locally on 2026-07-16 with identical production builds and headless Chromium. The disabled control used `NEXT_PUBLIC_OBSERVABILITY_ENABLED=false`; the enabled run used the documented default sampling. These figures are measurements of this machine and build, not claims about real-user Production performance.

## Build output

- Baseline static JavaScript on `origin/main` (`09f6356c`): 10,852,748 bytes across 620 files.
- Phase build static JavaScript: 10,915,360 bytes across 625 files.
- Repository-wide delta, including the admin-only dashboard: 62,612 bytes uncompressed (0.577%).
- Deferred RUM chunk: 19,552 bytes uncompressed / 6,767 bytes gzip.
- Homepage initial JavaScript increased from 233.1 KiB gzip to 234.1 KiB gzip and remains below the configured 239.3 KiB budget.
- All configured performance budgets pass after moving RUM behind the idle-loaded boundary.

## Browser run

The exact `origin/main` control loaded 36 resources, made no observability request, loaded no observability resource, recorded no long task, and reported the Chromium heap sample as 10,000,000 bytes at both measurement points.

Four enabled six-second runs each loaded 37 resources in total, identified two observability resources, transferred 7,393 observability bytes, and made one batched ingestion request. The deferred observability initialization marks were 0, 0, 0, and approximately 0.1 ms. These marks are timer-resolution proxies and do not prove zero initialization cost. No run recorded a long task. Chromium reported the same 10,000,000-byte heap sample at both points; this coarse result means no difference was measurable with that API, not that memory overhead is exactly zero.

The RUM chunk is requested after the initial render through an idle callback. Ingestion is non-render-blocking. When the local database configuration was absent, the failed ingestion produced no retry loop during the measurement window.

The script `scripts/measure-observability-overhead.mjs` provides the repeatable browser measurement. Production field overhead must be reviewed again during the staged Preview and Production observation windows.
