# Smart Analyzer detail evidence repair

## Reproduction and causes

Production baseline: commit `88372608ecd532b14cc115ac3fbf5ae01e8bf062`,
deployment `dpl_Gjvu2PswijSMJWmddgEcsdkcMAgK`.

- AAPL recommendations retained 320 candles and computed indicators while the
  dedicated technical endpoint returned `technicalAvailable: false` solely
  because its current quote was stale.
- XAUUSD quote/history requests used the legacy Yahoo alias `GC=F` as the
  input to other provider adapters. The spot feed requires its own mapping.
- Full symbol details still called the legacy analysis/signal/history routes,
  unlike Quick View. Its final card then hid agreement, samples and risk behind
  the single current-recommendation availability flag.

## Changed behavior

- SFM passes canonical symbols to each provider adapter. Gold/silver aliases
  resolve to the same spot instrument; explicit futures are not substituted for
  spot. Canonical asset type survives provider labels such as Physical Currency.
- The adapter retains usable dated history even when the quote request fails.
  A historical close is explicitly a daily reference, never a current quote.
- Daily research contains dated indicators, eligible strategy agreement,
  sample/coverage checks, a rules-based confidence score and measured risk.
  Short or old histories retain available indicators but withhold confidence.
  No win-rate or calibrated probability is claimed.
- Risk shows ATR/close, sample-standard-deviation volatility over 20 daily
  returns (252 sessions for conventional assets; 365 days for crypto), and
  maximum drawdown over up to 120 daily closes. Missing values remain null.
- Histories are ordered and deduplicated by date; invalid/future observations
  do not count toward sample sufficiency.
- Full details uses one canonical recommendations response for price, history
  and analysis; profile/news remain separate. Quick View and analysis routes
  preserve research while executable targets/confidence remain guarded.
- Arabic, English and French explain the history date, confidence methodology,
  risk window and pending-current-quote state. A full-detail refresh button
  forwards `refresh=1`; SFM drawer routes receive the quote request timeout.

## Validation

Local Node 22.13.0 / pnpm 11.1.3 frozen offline installation passed.
The full local suite passed 2,998 Vitest tests (23 skipped); 96 Node tests pass.
Focused route/provider tests additionally cover closed quotes, total quote
failure with valid history, total evidence failure, and five gold/silver aliases.
TypeScript, ESLint debt, translations and maintainability checks passed.

Browser regression cases cover AR/EN/FR full details reached from Quick View,
research confidence/risk/technical/strategy cards, absent follow-trade controls,
canonical route usage and refresh forwarding across desktop/mobile projects.
CI results, exact candidate/deployment identifiers and production read-only
verification are recorded in the pull request before completion.

The workspace build compiled and generated all 216 pages, but hit the existing
scratch filesystem `ENOTEMPTY` cleanup fault. A clean temporary-directory build
and the required CI/Vercel builds remain release gates; this is not marked as a
successful local production build.

No auth, permissions, database schemas, provider keys or subscriptions change.
Previous production baseline above is the rollback reference. Preserve any later
main changes when applying or rolling forward this repair. Production runtime
checks are point-in-time evidence, not a claim of sustained RUM/SLO coverage.
