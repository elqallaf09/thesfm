# Event sensitivity explorer

Available inside `/economic-intelligence/simulator` after an explicit lab run.
Hidden in the learning challenge, before and after reveal; not part of the game.

The explorer varies the magnitude of one existing shock across five legal input
steps, including the exact last-run magnitude. At bounds it shifts the window
instead of duplicating clamped endpoints. Expectations, priced-in attenuation,
other shocks, regime, horizon, capital and weights stay fixed. The user chooses
one of the original contained/reference/amplified paths; no path is a probability.

All calculations call the original `simulate` model. Coefficients and versions
are unchanged. The gold/oil/portfolio graph and table show hypothetical percentage
changes. Portfolio deltas are percentage-point differences from the last run for
the selected path, not relative percentage changes. The magnitude axis is numeric,
not temporal. Lines between the five computed points are visual interpolation.

The explorer reads the last valid report, not a live draft. Using a magnitude
edits only that shock in the draft; it never auto-runs or submits a trade. Any
changed draft visibly marks the comparison stale and disables applying its rows
until another explicit run. The exact original magnitude is not an editable row.

No network requests, providers, LLMs, stored outputs, database changes, new keys,
packages, cloud persistence or portfolio access are added. Existing challenge,
checkpoint and authentication boundaries are unchanged. This remains uncalibrated
educational arithmetic, not market advice or predicted prices.

`macroSensitivity.test.ts` exercises all event bounds, model paths, independent
input copies, rate expectations, fully priced shocks, gold-only isolation and
translation parity. `macro-simulator-sensitivity.spec.ts` covers the three UI
languages under desktop Chromium, mobile Chromium and mobile WebKit, draft
application, stale output, challenge isolation, theme captures and overflow.
Screenshots are scoped to synthetic sensitivity output, not account/login DOM.

The markets workspace now includes `TR_MACRO_SIMULATOR` in its actual runtime
translation bundle. The global dictionary alone was insufficient and previously
rendered `nav_macro_simulator` in the production header/sidebar. A runtime-bundle
unit test and the trilingual browser test guard this regression.
