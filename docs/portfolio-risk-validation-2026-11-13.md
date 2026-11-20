# Portfolio risk validation — 13 November 2026

## Confirmed prior head

At `9bd0a877e71533aaafdffc0a5ee620eec5b698ed`, CI run `43247125230`
passed the production build **and unchanged performance budget**, TypeScript,
lint, i18n, launch guards, clean migrations and native compilation. The full
unit job failed the visual-system guard: radius fallbacks in
`PortfolioRisk.module.css` and the unused older `PortfolioRiskPanel.tsx` still
contained raw visual values. Required authenticated smoke did not run because
that prerequisite failed. The new code consumes the existing shared tokens;
no guard, threshold or baseline allowance is relaxed.

## Historical method correction (`risk-v2`)

Historical VaR is the generalized inverse empirical loss CDF at 95%, clamped
to zero for a gains-only threshold. For ascending daily returns, its index is
`floor(n / 20)`. Expected shortfall integrates exactly 5% of empirical probability
mass: `floor(n / 20)` full observations plus `(n % 20) / 20` of the boundary
observation. At n=61, this is 3.05 observations, not 4. Ties do not increase the
tail's probability mass. Zero loss metrics do not imply an absence of risk.

Sample volatility uses Welford's variance calculation and the caller's
annualization calendar (252 remains the low-level default). Drawdown tracks
wealth relative to its running peak, avoiding overflow of cumulative wealth.
Non-finite arithmetic returns a typed failure, not a misleading number.
The historical snapshot version is now `risk-v2`; current concentration's
separate response contract is not changed.

## Database isolation

`portfolio-risk-security.yml` runs the full migration chain once in an empty
Postgres 17 service, followed by `tests/database/portfolio-risk-security.sql`.
The test requires an explicit disposable-CI marker and the repository's
bootstrap `auth.uid()` stand-in before seeding any synthetic data. Tests use
the real migrated RLS policies under `authenticated` and `anon`, not the
service-role bypass. Both owners must successfully read their own data before
cross-owner denial assertions can pass. All fixtures and temporary changes
roll back. No production credentials or database migrations are performed.

## Release gates still apply

Keep the feature flags off until the applicable full CI and authenticated
browser checks pass. PostgreSQL isolation tests complement, not replace,
authenticated browser/session tests. A populated current-position table is
not evidence of complete historical NAV, cash flows, FX or ownership history.
No imported row is promoted to VERIFIED and no NAV is manufactured by this
change. Historical metrics stay unavailable until that evidence is supplied
through a trustworthy source adapter.
