# SFM Macro Simulation Lab — V2 educational beta

Route: `/economic-intelligence/simulator` in Markets & Trading.

## Implemented

- Arabic-first responsive interface, English/French parity, shared theme tokens.
- Six shock types, eight exercise presets and up to four simultaneous shocks.
- Explicit rate expectations, priced-in non-rate shocks and three macro regimes.
- Three sensitivity paths (contained/reference/amplified), seven horizons,
  SVG curves with a corresponding accessible data table, transmission channels.
- Nine hypothetical asset sleeves, editable USD capital and strictly validated
  weights, contribution attribution and like-for-like pinned-run comparison.
- Learning challenge that hides output until the user selects a gold direction
  and supplies a rationale. It evaluates consistency with the model, NOT skill.
- Per-user/per-tab explicit session drafts; validated JSON export/import.
- Rule-based explanations, inspectable sensitivities, source and limitation panel.

## Truth boundary

`src/domain/macro-simulator/engine.ts` is a deterministic, uncalibrated teaching
model. No source supports its numerical coefficients. Research background:
Gurkaynak, Sack and Swanson, FEDS 2004-66, on policy decisions versus expected
policy paths. This motivates separating announcement and expectations; it does
not validate the implementation or quantify a predictive confidence level.

Rate surprise = (announced basis-point change - expected change) / 25.
Other surprise units = magnitude / scale * (1 - pricedIn / 100), where the
scale is 0.5 percentage points for inflation, 10 percent for supply-driven oil,
and 1 for the remaining event types. Rates ignore the non-rate pricedIn field.

Surprises are added through the explicitly declared TRANSMISSION factors,
modified by the chosen macro regime, multiplied by SENSITIVITY, supplemented
with explicit oil/gold shock exposure, and scaled by 0.55/1/1.6 per path.
The horizon response is constructed: 0, .28, .48, .68, .87, 1, 1.06, .82 at
pre-event, 5m, 1h, 1d, 1w, 1m, 3m, 12m. The time axis is categorical.
These are not historical paths, random draws, probabilities, confidence
intervals, best/worst cases, or market-price predictions. Output clipping to
-95%/+200% is a computation guard, NOT an economic or financial guarantee.

Gold-only input does not propagate to USD/oil. Risk aversion does not assume an
oil supply interruption. USD cash has zero nominal return; the USD index sleeve
is a distinct non-investable proxy. Bonds mean price returns, not yield changes.
GCC is an illustrative aggregate, not any particular country or company.
Portfolio results are fixed-weight USD exposures, without leverage, fees,
taxes, distributions, carry, FX translation, or actual holdings.

Time is hypothetical Kuwait UTC+3 metadata, not a scheduled real-world event.
Text is notes only: no hidden LLM extraction or arbitrary-event interpretation.
No new server endpoints, provider calls, API keys, migrations, dependencies,
subscription changes or trades. Existing authentication and workspace routing
remain in place. The account-keyed component resets when account identity changes.
Snapshots store assumptions only; imported results are not trusted or loaded.

## Explicitly not complete

Live provider adapters and real portfolios; historical replay using point-in-time
licensed data; AI free-text interpretation; calibrated regime-dependent model
estimation; out-of-sample evaluation; probabilistic scenarios; cloud persistence;
multiround timed games; PDF reports. Links to current gold/oil engines are
navigation, not data integration. Do not market these as implemented features.

## Verification

`src/__tests__/unit/macroSimulator.test.ts` covers provenance, expectations,
no double pricing attenuation, zero surprise, gold-only isolation, cash USD,
portfolio arithmetic, timeline consistency, invalid inputs, snapshot validation,
determinism, supported parameter extremes and trilingual completeness.

Run repository-required typecheck/lint/i18n/maintainability/visual-system,
unit tests and production build. Browser checks must include AR RTL and EN/FR,
phone/tablet/desktop, invalid weights, rerun/stale output, compound presets,
challenge gating, file import/export, session drafts and keyboard operation.
Do not interpret isolated engine checks as proof of a full production build.
