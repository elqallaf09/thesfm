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
- Explicit per-account/per-tab checkpoints, resume confirmation, scoped deletion
  and versioned JSON export/import. See the checkpoint contract below.

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
auth bypass or dependencies. No real trades. Page memory resets on navigation,
reload or identity change; an explicitly saved checkpoint can be manually loaded
in the same account/tab. No automatic save, automatic restore, cloud persistence,
competitive leaderboard, timer or anti-cheat claim. Checkpoints are not encrypted;
a same-origin script or person using the browser can read them. Account-keyed
storage is a UI namespace, not authorization or a security boundary. Avoid
sensitive rationales and delete saves on shared devices. Exported files exclude
account identifiers but contain decision rationales. Rationales are React text,
never HTML. Existing protected workspace and guest flows remain unchanged.

## Checkpoint contract

`game-session.ts` stores only format/version, game/model version, initial capital,
phase, ordered round IDs and decisions, plus the pending draft in planning phase.
It does NOT save balances, returns, paths or benchmark values. Restore validates
exact keys, at most three ordered decisions, model compatibility, UTF-8 size
(maximum 20,000 bytes), rationale bounds and strict allocations. It reconstructs
all outcomes through the original state transitions. A saved revealed round
stays locked and is not credited twice. A short pending rationale can be saved
but still cannot settle a round. Holding ignores dormant allocation edits.

`GameSessionControls` accesses `sessionStorage` only on explicit save/load/delete.
There is no cross-tab/device synchronization; closing the tab may remove its
checkpoint. File export/import is a manual transfer option, not cloud storage.
Every restore/import needs confirmation before replacing memory. Invalid files
leave the open session unchanged. Storage failures are distinguished from invalid
input and never reported as successful saves. Delete is scoped to this account's
checkpoint, not all origin storage, and needs confirmation. Restarting page
memory does not delete a checkpoint or an exported file. Re-saving overwrites
the last checkpoint. Old async file reads are discarded after a newer action.

This is not anti-cheat: a user can edit valid decisions and reconstruct different
hypothetical results. No saved file proves performance or decision timing.
Model/game behavior changes must bump their version before accepting old saves.

## Verification

`src/__tests__/unit/macroSimulatorGame.test.ts` contains the original 19 game
cases. `macroSimulatorSession.test.ts` adds 27 cases covering all seven legal
checkpoints, planning drafts, locked restoration, exactly-once credit, benchmark
drift, schema/version/UTF-8 boundaries, invalid allocations, account namespaces,
non-mutation and Arabic/English/French copy completeness.

The local source copies of the unchanged engine and game match Git blobs
`d659b04d9990770dfafddd6b8f0b452561cf7aba` and
`064104a76f654c3f3a3450fe5a8c4c28cc6559da`.
Local Node-adapter checks are not full repository Vitest/build/browser evidence.

`tests/smoke/macro-simulator-game.spec.ts` covers the original game. The added
`macro-simulator-session.spec.ts` covers normal guest access, save/reload/restore,
planning and locked fields, cancellation, real downloads, corrupt/forged/valid
imports, next-round accounting, deletion and phone/tablet overflow. It disables
login/account screenshots, video and traces. Browser tests are authored, not
claimed to have run locally. Repository CI must verify the exact final head.

Historical data, statistical calibration, natural-language AI interpretation,
live data adapters, timed/multiplayer games and cloud persistence remain unimplemented.
