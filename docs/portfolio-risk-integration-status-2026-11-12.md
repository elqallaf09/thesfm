# Portfolio risk integration — 2026-11-12

Related: #354 / #355. Disabled by default; no production environment or database writes.

## Implemented
- Shared dashboard/chat request service: verified session identity, MFA enforcement, fail-closed provider errors, no malformed-Authorization cookie fallback, per-process user rate limit and user-scoped canonical reads.
- Current concentration groups repeated holdings of the same asset, validates FX timestamps and arithmetic, rejects truncated reads, and reports actual oldest observation time.
- Explicit personal-risk questions in Arabic/English/French route through the existing intelligence chat API to the shared service, without asking a language model to invent missing metrics or consuming LLM usage.
- Dedicated /investments/risk workspace with gated entry in the investments center. Removed the injection in the oversized /invest page; did not raise maintainability thresholds.
- Three languages, design tokens for light/dark mode, account-switch isolation, partial-data explanations, user-input hypothetical scenarios and JSON export.
- Calendar errors distinguish missing/invalid calendars from incomplete NAV history. External-flow adjustment assumes end-of-period flows; intraday cash flows require sub-period valuations for exact TWR.

## Evidence blocker
Read-only aggregate checks of the linked production canonical tables found 12 imported positions, zero VERIFIED positions, zero investment_valuations rows and zero investment_transactions rows. No row financial values were accessed and no imports were marked verified.

Historical volatility, VaR, CVaR, drawdown and an overall score remain unavailable until authentic valuation/transaction history, calendar coverage and flow timing are verified. Current recorded assets are not net NAV; debt, leverage and fund look-through are excluded. Unknown values remain null.

## Verification / release
- Isolated strict TypeScript compilation and 9 Node tests for the new pure current-risk/intent boundary passed locally. These are not full app or real two-user integration tests.
- Added Vitest tests for current risk, session/MFA boundary, chat results and historical-calendar validation. Read new-head CI independently before merging.
- Earlier-head TypeScript and build jobs passed but lint, maintainability and unit checks failed. Earlier successful jobs do not certify these new changes.
- Keep SFM_PORTFOLIO_RISK_ENABLED and NEXT_PUBLIC_SFM_PORTFOLIO_RISK_ENABLED unset in production until data readiness and authenticated end-to-end checks pass. Skipped checks do not count as successful validation.
