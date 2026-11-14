# Screener pagination and listing synchronization

FMP changed Company Screener filtering before pagination on 2026-11-03:
https://site.financialmodelingprep.com/developer/docs/changelog

Both stock category and growth universes now walk explicit zero-based pages and
probe after a short final page. A repeated identity, malformed response, short
nonterminal page, provider failure or safety cap rejects that exchange's scan.
Other successful category exchanges remain available with a partial-coverage
reason. Unknown primary exchanges remain null; the request filter never supplies
an actual or primary listing exchange. US scanners select the actual requested
venue, including cross listings whose primary venue differs.

## Verification

`pnpm exec vitest run src/__tests__/unit/screenerPagination.test.ts src/__tests__/unit/stockCategoryScanner.test.ts`

`FMP_API_KEY=... node --experimental-strip-types scripts/check-fmp-screener.mjs`

The live check is read-only by default. It compares complete scans with page sizes
1000 and 800 and then replays 1000; the composite key sets must match, not merely
the counts. It reports empty/unsupported regional codes and HTTP entitlement or
rate-limit errors as unverified. It cannot prove coverage of symbols absent from
all provider scans; official exchange reconciliation is a separate coverage test.
`FMP_SCREENER_EXCHANGES` accepts provider codes. Default regional probes are Kuwait,
Saudi Arabia, Dubai, Qatar, London and Xetra, plus NASDAQ. They do not assert the
subscription covers these venues. Fixtures in unit/SQL tests are synthetic.

## Database rollout

Apply the new migration before running the updated import scripts. It adds
`primary_exchange` and `requested_exchange` and a service-role-only, SECURITY
INVOKER RPC. The existing `(exchange, symbol)` unique index remains. The older
`(symbol, asset_type, provider_symbol)` constraint is removed because it prevents
the same provider ticker from being represented on two venues. No current writer
uses that old conflict target. No rows, IDs, references or review fields are deleted.

Official directory, CSV and optional FMP imports use one transaction, with
exclusive writer serialization and before/after reconciliation. Missing
identities and duplicate input keys fail before writing; database errors roll
back the entire batch. Unspecified metadata and existing Shariah reviews survive.
A null incoming primary exchange does not erase a previously known value.
Known Kuwait aliases retain the existing `Boursa Kuwait` identity in the database.
Imports are additive: absence from a scan does not mark an instrument inactive.
The FMP `--sync` flag requires every requested exchange to pass the live audit.

The clean-chain CI executes `tests/database/market-symbol-sync.sql` only with
`PGOPTIONS='-c sfm.disposable_ci=1'`; fixtures are rolled back. This covers
idempotency, two venues with the same symbol, metadata retention, atomic failure,
counts and denied public execution.

Rollback: restore the previous application revision and stop symbol imports;
leave the additive columns/RPC intact. Do not recreate the old uniqueness
constraint after new cross listings have been imported without reconciling them.
No user-facing UI, authentication, pricing, provider plan or dependency change.
