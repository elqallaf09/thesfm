# Evidence-source reliability follow-up

## Baseline and verified defect

Baseline `88372608ecd532b14cc115ac3fbf5ae01e8bf062`, Production `dpl_Gjvu2PswijSMJWmddgEcsdkcMAgK`, includes PRs #185 and #183. This batch preserves those changes. No schema migration, provider subscription, production financial-row update, or new valuation adapter is involved.

The [official Boubyan interim report](https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf) is accessible. Its statement uses an apostrophe before the thousands unit and complete dates in each balance-sheet column. The parser accepted neither combination. Interim income also exposes an explicit start/end range; using the first date silently selected its January start. These are confirmed format defects, distinct from a missing PDF.

## Changes

- Accept the observed thousands notation and exact current/audited-prior-year/prior-interim column order. Reject unsupported units, date reordering, invalid dates and non-year-to-date ranges. Extract only existing allowed financial fields; total liabilities remain an upper bound on debt, never exact debt.
- Carry safe failure codes from the regional adapter into the screening record. Distinguish unsupported layout, mismatched issuer/origin, conflicting values, limits, timeout, rate limits and generic retrieval failures. Do not persist raw upstream messages.
- Bound optional issuer-directory discovery to three seconds with no retry, retaining the reviewed filing fallback and the overall caller deadline.
- Reconcile the saved roadmap with the actual PR #185 release and require hosted authenticated validation to finish before merge deletes its isolated database.
- Repair the investment money reader so SQL nulls, blank strings, booleans and objects cannot become synthetic zero/one amounts or mask a valid later value. Preserve explicit zero and require the existing currency match. This does not certify the full multi-currency reporting or canonical import cutover.
- Tighten canonical read-cutover readiness: a verification must belong to the position's actual legacy row and its source timestamp must match exactly. Unknown or earlier source timestamps are not proof of a synchronized import. No stored verification state is changed.
- Cancel superseded CI runs within the same pull request; main runs have unique groups and cannot be canceled by a PR. This preserves every check on the current candidate while limiting redundant build/browser work. See [GitHub's concurrency contract](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

The KFH report has not been validated end-to-end in this follow-up. The native-canvas warning alone was disproven as an extraction blocker in the prior packaged positive-PDF test. Do not add speculative dependencies or claim KFH fixed. Boubyan source-format tests use synthetic amounts; a successful unit test is not a production refresh.

## Acceptance and release

Local targeted regression suite passed before release preparation. Required full CI/build and protected merge remain release gates, with their final exact SHA/results to be recorded in the PR. Keep development Previews disabled; prepare one designated release Preview after local checks. Wait for hosted authenticated validation before merging if an isolated target is available. Never point its tests at Production.

Observe the public market/protected-route behavior and changed-route error logs for at least five minutes after READY. Roll back application code to the immutable baseline above on an auth leak, new sustained changed-route 5xx, or broken source processing. Source availability and real-user performance remain separately measured; unavailable controls are not marked passed.

## Remaining product acceptance

| Track | Evidence needed before calling it complete |
| --- | --- |
| Exchange coverage | Independent exchange totals, verified identifiers, per-market quote availability and source times; address unconnected regional markets. |
| Property valuation | One jurisdiction with reusable transaction rights, reliable area and arm's-length classification, valid comparables/FX, and documented holdout backtesting. Four research contexts alone do not satisfy valuation readiness. |
| Finance/imports | Owner-isolated multi-currency round trips, duplicate/rejected-import handling, exact legacy-to-canonical reconciliation and explicit cutover gates. Do not mark unresolved real positions verified. |
| Advisors | Current source grounding, bounded provider failures and observed authenticated task completion. One isolated historical 503 has no established root cause. |
| Membership/community | Approved product rules, owner/moderator isolation, abuse handling, entitlement and billing lifecycle tests before release. |
| Mobile/TV | Defined device scope, keyboard/remote/touch navigation, responsive accessibility and release/distribution acceptance. |

These are outstanding acceptance requirements, not features silently marked complete by this source-parser release.
