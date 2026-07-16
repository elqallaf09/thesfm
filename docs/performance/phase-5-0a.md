# Phase 5.0A — Platform performance and scalability

## Measurement method

- Baseline source: `origin/main` at `02614b2c`.
- Build comparison: Next.js 15.5.20 production builds on the same Windows host and Node.js runtime.
- Lighthouse comparison: Lighthouse 12.6.1 mobile preset, simulated throttling, Chromium headless. The baseline is the recorded pre-change run; the optimized result is the median of three post-change runs.
- Interaction comparison: mobile Chromium at 390 × 844 with 4× CPU throttling, ten menu-toggle interactions. The reported value is the lab p98 Event Timing sample and is an INP proxy, not field INP.
- Memory check: Chromium heap sampling after forced garbage collection and repeated menu toggles.

## Production build

| Route | Baseline first-load JS | Optimized | Change |
| --- | ---: | ---: | ---: |
| `/` | 370 kB | 206 kB | −164 kB (−44.3%) |
| `/dashboard` | 346 kB | 180 kB | −166 kB (−48.0%) |
| `/today` | 366 kB | 200 kB | −166 kB (−45.4%) |
| `/invest` | 364 kB | 198 kB | −166 kB (−45.6%) |
| `/business-hub` | 393 kB | 227 kB | −166 kB (−42.2%) |
| `/market-analysis` | 442 kB | 275 kB | −167 kB (−37.8%) |

- Largest raw client chunk: 631.2 KiB → 545.5 KiB (−85.7 KiB, −13.6%).
- Built font assets: 40 files / 392.4 KiB → 36 files / 338.8 KiB (−53.6 KiB, −13.7%).
- Removed 8 unused direct dependencies and 26 installed packages after deduplication.

## Lighthouse and runtime

| Metric | Baseline | Optimized median | Change |
| --- | ---: | ---: | ---: |
| Performance | 0.75 | 0.82 | +0.07 |
| FCP | 1,964 ms | 1,661 ms | −303 ms (−15.4%) |
| LCP | 6,023 ms | 4,584 ms | −1,439 ms (−23.9%) |
| TBT | 155 ms | 63.9 ms | −91.1 ms (−58.8%) |
| CLS | 0.0390 | 0.0390 | no regression |
| Total transfer | 800.0 KiB | 607.7 KiB | −192.3 KiB (−24.0%) |
| Script transfer | 482.3 KiB | 292.0 KiB | −190.3 KiB (−39.5%) |
| Requests | 45 | 40 | −5 (−11.1%) |
| Main-thread work | 1,257 ms | 1,059 ms | −198 ms (−15.8%) |
| Accessibility | 1.00 | 1.00 | unchanged |
| Best Practices | 1.00 | 1.00 | unchanged |
| SEO | 1.00 | 1.00 | unchanged |
| Lab interaction p98 | 56 ms | 48 ms | −8 ms (−14.3%) |

## Implementation changes

- Public pages use a compact translation provider containing only auth, common, and navigation catalogs. The full workspace catalog loads only when entering an application route.
- The authenticated header/sidebar/command shell is a deferred workspace-only client island; public routes no longer parse or hydrate it.
- The landing-page navigation imports only its navigation catalog.
- Analytics reuses the session already initialized by the auth provider for page views, avoiding a redundant session read.
- The currency context value and setter are stable, preventing unrelated consumers from rerendering when an ancestor rerenders.
- The unused IBM Plex Sans Arabic 300 weight was removed; all weights referenced by production CSS remain loaded.
- CI now blocks route/chunk/font/image budget regressions and runs Lighthouse three times plus the cross-browser performance regression suite.
- Lighthouse CI uses three-run medians with GitHub-hosted-runner guardrails of performance >= 0.70, LCP <= 7.0 s, TBT <= 300 ms, CLS <= 0.05, and accessibility >= 0.98. These environment-specific regression limits are separate from the same-host before/after measurements above.

## Images, memory, and deferred work

- The audited LCP element is the hero heading, not an image. The priority logo is already transformed by `next/image` to WebP at approximately 1.6 KiB, so no image implementation change was justified.
- No uncleaned timers, observers, subscriptions, or global listeners were found in the modified provider/shell paths. Forced-GC heap samples after 0/100/200/500 menu toggles were 3.96/5.35/5.48/5.67 MB; growth slowed substantially rather than remaining linear.
- The root stylesheet remains 61.2 KiB gzip for `/`, with Lighthouse estimating about 28 KiB unused on that route. Route-level extraction was deferred because the current cascade deliberately applies global compatibility overrides and moving those rules would carry visual-regression risk.
- Recharts 2 and several React 19 peer-range warnings remain. Dependency upgrades were deferred because they require feature-level migration work outside an implementation-only performance phase.

## Visual comparison

The phase introduces no intentional UI changes. Baseline and optimized desktop captures are stored in `docs/performance/screenshots` for review. Their SHA-256 hashes are identical (`BD5F8038CDE174DB96133946A5C56C376E2814D13E96B34D6AB46202A9E2CE96`).
