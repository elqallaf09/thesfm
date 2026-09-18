# Regional coverage and next-plan delivery

This is the next batch after PR #179 / Production `3693b10`. It expands reference directories, repairs partial quote recovery and makes source limitations visible. It does not purchase or change any data subscription.

## Source verification — September 18, 2026

Read-only calls to Twelve Data's public stock-reference endpoint returned these records. The parser admits Common Stock only, with matching MIC/currency, an explicit symbol format and unique provider identity. Saudi alternate aliases such as `.SABE`, cross-market rows, unsupported symbols and non-stock records are excluded. These are provider directory counts; independently verified exchange totals remain unknown.

| Directory | Before | Returned records | Accepted unique stocks | Currency | Reference endpoint |
| --- | ---: | ---: | ---: | --- | --- |
| Saudi Arabia | 6 selected | 531 | 394 | SAR | https://api.twelvedata.com/stocks?mic_code=XSAU |
| Abu Dhabi | 5 selected | 84 | 84 | AED | https://api.twelvedata.com/stocks?mic_code=XADS |
| Qatar | 4 selected | 58 | 55 | QAR | https://api.twelvedata.com/stocks?mic_code=DSMD |
| Egypt | 0 | 266 | 245 | EGP | https://api.twelvedata.com/stocks?mic_code=XCAI |

The provider's [exchange catalog](https://twelvedata.com/exchanges) lists distinct quote plans for these markets. A successful public reference request does not establish current account price entitlement or real-time data access. Bahrain, Oman, Jordan and Morocco did not return a usable directory through the checked reference queries and remain a separate source-integration task.

## Implemented behavior

- Explicit internal `TD:<MIC>:<symbol>` quote identities avoid sending Egyptian provider identifiers or ambiguous Gulf symbols to a US quote endpoint. Proven curated mappings continue to use their existing price source.
- Validate returned quote symbol, MIC, currency, positive price and provider timestamp. Quotes older than seven calendar days are withheld as stale; no request time is substituted for a missing source timestamp. Other accepted regional prices are labeled delayed.
- New reference reads are shared and cached for one day. Short, malformed or failed responses retain the last good in-process directory, otherwise preserve the existing selected list. Degraded results retry after five minutes.
- Quote reads share pending work, cache available observations for five minutes, limit concurrency to three and bound the waiting queue. A 429 pauses queued work for one minute; an access failure pauses only that exchange. Partial HTTP responses have a short CDN lifetime.
- Browser directory pages expire after five minutes. A partial quote response exposes retry, and retry clears failed observations instead of permanently reusing them. An unavailable strip quote no longer prevents fetching a directory quote.
- Coverage includes imported count, source record/exclusion counts, last successful retrieval, latest attempt and a bounded error reason. `expectedCount` remains null when no independent exchange total is verified. Retrieval time and source-observation time remain separate.
- The UI displays available/unavailable/pending counts for the currently displayed results only, with source-limit/access explanations and known quote timestamps. Arabic, English and French are maintained, with Latin digits.

## Limits and remaining plan

This batch does not complete all P0 source operations: the cache/cooldown is per process, not global across serverless instances. Historical aggregate error counts and independent exchange totals still need durable operations work. New directory rows have no fabricated sectors, translations, prices or source timestamps. Quote access can remain unavailable under the existing provider plan.

No database schema, authentication policy or saved financial records are changed. Property valuation remains gated. Phase 7.35 account isolation and production hardening, followed by property evidence qualification and the finance/investment workflow audit, remain next in the [economic-platform roadmap](economic-intelligence-roadmap.md).

## Release gates and cost

Run typecheck, lint, translations, maintainability, unit/integration, build/budgets and directory browser checks. Tests cover provider identity, stale observations, quota/entitlement failures, shared requests, retained directories, missing data and successful retry. Record exact results and Production verification in the release PR.

Use one designated release branch only after local validation, one required Vercel Preview and one Production deployment after protected merge. Rollback target is Production `dpl_Z9u7YdAqHewMUz2e7UUU7tuufnwP` / commit `3693b10ff89e8c2106465e01d5f31617aa456aac`. No new paid provider service is provisioned.
