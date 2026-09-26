# SFM Macro Simulation Lab — sequential decision game

Route: `/economic-intelligence/simulator/game`. The lab and game have a shared
translated navigation bar. The game is a separate route so its interactive
module is not imported into the normal lab page.

## Implemented

- Three untimed fictional rounds: a rate surprise, an oil supply shock and a
  growth slowdown. The full fixed assumptions are visible before each decision.
- User-selected virtual starting USD capital; the same nine abstract asset
  sleeves as the educational lab. This is not an instrument or execution account.
- Explicit choice to keep existing holdings or rebalance. New weights must be
  finite, bounded and sum to 100%; invalid weights are not normalized.
- A 10–600-character rationale is required before each reveal. This is a length
  constraint, not AI assessment, semantic validation or a score for reasoning.
- Immutable, gated planning -> revealed -> next/finished transitions. The
  reference outcome can be credited only once and past decisions cannot be edited.
- Cumulative holdings, a genuine initial-holdings comparator, three sensitivity
  outcomes per round, contribution attribution, a balance plot and a decision
  journal with an accessible table. Arabic, English and French are supported.
- An explicit two-step session reset and identity-keyed component remounting.

## Accounting and model limits

The underlying uncalibrated coefficients in `engine.ts` are unchanged.
Each round uses a NEW independent one-day shock. Holdings carry forward; economic
state, covariance and policy paths do not. This is not historical replay, a
continuous macro model or a probabilistic market forecast.

`holding_after = holding_before * (1 + illustrative_asset_return / 100)`.
Keeping holdings uses their actual current values, never rounded display weights.
Rebalancing allocates the current total to the explicit new weights. Display
weights use a largest-remainder allocation in hundredths of a percent; those
weights are used only if the user explicitly chooses to rebalance.

The comparator starts with identical holdings, never trades, and lets weights
drift. It is not a periodically rebalanced fixed-weight portfolio. Returns
compound; they are not added. The other sensitivity paths are hypothetical
alternatives from the same opening holdings, not separate credited balances.
Only the reference path changes the session balance. None has a probability.

USD cash has zero nominal return. Fees, taxes, dividends, carry, FX translation,
liquidity, leverage and actual execution are absent. The displayed drawdown is
computed solely from the initial value and revealed round-end values; it is not
an intraround low, VaR, future loss bound or measure of investment skill.

## Privacy and boundaries

No new endpoints, LLM calls, provider requests, credentials, migrations, billing,
auth bypass or dependencies. No real trades. The session is page-memory-only;
navigating away, reloading or changing accounts clears it. No game import,
cloud persistence, competitive leaderboard, timer or anti-cheat claim.
Rationales are plain React text, never HTML. The existing protected workspace
and guest flow remain unchanged.

## Verification

`src/__tests__/unit/macroSimulatorGame.test.ts` contains 19 cases for provenance,
phase gating, accounting, holdings drift, cash, strict allocations, state
immutability, compounding, drawdown, input ceilings and trilingual completeness.
Local strict TypeScript for the pure engine/game/copy/tests and all 19 exact test
bodies passed using a Node test-runner adapter for the Vitest describe/it imports.
The original engine copy was verified against Git blob
`d659b04d9990770dfafddd6b8f0b452561cf7aba`. That is not a full app build or Vitest run.

`tests/smoke/macro-simulator-game.spec.ts` covers normal guest entry, the route
handoff, pre-reveal validation, locked decisions, all three rounds, invalid
weights, cash, the journal, chart, mobile overflow and reset confirmation.
It disables login/account screenshots, video and trace recording. The browser
test is authored but was not run locally. Repository CI must still verify full
TypeScript, lint, i18n, typography, production build, budgets and browser behavior.

Historical data, statistical calibration, natural-language AI interpretation,
live data adapters, timed/multiplayer games and persistence remain unimplemented.
