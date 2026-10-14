# Market data register and FMP disclosure checks

This register links displayed datasets to the actual upstream provider, the
reviewed subscription record, commercial display/redistribution rights and delay.
It is evidence tracking, not a new provider entitlement or an automatic access
switch. Existing display/fallback behavior is unchanged.

## Read the register

An authenticated administrator with `admin_dashboard` permission can request
`GET /api/admin/market-data/registry`. The shared admin policy protects this
route, rate limits it and returns private/no-store responses.

The response contains:

- Dataset fields, implementation paths and principal API routes (not an exhaustive
  list of every UI consumer or legacy route).
- Provider identities; OpenBB and THE SFM are integration layers. Their software
  licenses do not license upstream data.
- Separate review rows for Kuwait, Tadawul, ADX, DFM, Nasdaq Dubai, Qatar,
  Bahrain, Muscat, Nasdaq, NYSE and named European exchanges. These are review
  targets, not verified coverage. Europe is not treated as one licensed exchange.
- Reviewed plan/evidence records, including expiry. No API keys or credentials.

The new `dataRecord`/`dataRecords` metadata accompanies SFM v1 quotes and owned
history, World Stocks and market-directory quote responses, market news, trader
calendars, the aggregate economic calendar and sentiment. Existing consumer
fields remain compatible. News retains the original publisher/source URLs and
records the transport provider separately. Merged economic events retain each
contributing provider. Directory/profile datasets also have inventory entries;
their individual responses do not yet carry the new metadata.

`coverage: unverified` never becomes complete merely because a request succeeds.
`delay.reported` describes adapter metadata, while `delay.contractual` and
`delay.minutes` require subscription evidence. A response timestamp, local cache
TTL or a configured key cannot establish real-time rights. Scope uses explicit
exchange IDs/MIC aliases. A plain symbol does not imply a US exchange.
Calendar retrieval time is recorded separately from source observation time;
unknown observation timestamps and cache flags stay null.

## Record actual subscription evidence

Set the **server-only** environment variable `MARKET_DATA_ENTITLEMENTS_JSON` to
a JSON array of records with these fields:

| Field | Required content |
| --- | --- |
| `id` | Non-sensitive opaque registry ID; not a contract/account number |
| `providerId` | Actual upstream ID, e.g. `fmp` or `twelve_data` |
| `dataset` | Exact key from `MARKET_DATASETS` |
| `scope` | `{ "exchange": "BOURSA_KUWAIT", "country": "KW" }`, or another exact scope |
| `planName` | Actual reviewed plan, never inferred from an API key |
| `commercialDisplay`, `redistribution` | Independently `allowed`, `denied`, or `unverified` |
| `delayType`, `delayMinutes` | `realtime`, `delayed`, `eod`, or `unknown`; minutes may be `null` |
| `evidenceReference` | Internal reference to the written agreement/permission; no credentials |
| `reviewedAt`, `validUntil` | ISO timestamps for evidence review and expiry/review deadline |

No account agreement is seeded by this change. Missing configuration gives
`unverified`; malformed/ambiguous configuration gives `invalid` and grants
nothing. Expired/future evidence grants nothing. Scope is exact after exchange
alias normalization: Kuwait cannot authorize Saudi Arabia, quotes cannot
authorize news, and a primary provider cannot authorize its fallback. An
exchange-scoped grant infers the country only from a known exchange identity;
country-scoped evidence cannot grant an exchange-scoped quote. No wildcards.

Only the protected registry returns plan names and internal evidence references.
Public metadata returns the opaque record ID, status and rights/delay fields.
Do not use this advisory metadata as an authorization decision: public responses
may be cached, and this change does not implement license-based blocking.

After configuring evidence, fetch the admin registry and a representative quote
for that exact exchange. Verify provider/scope, plan status and contractual
delay, then test a different Gulf exchange and a fallback provider remain
unverified. Prove full symbol coverage separately against an official directory.

## FMP disclosure pagination audit

No Senate/House ingestion exists on the base branch. This change adds a bounded,
on-demand audit, not a new feed or background quota consumer.

An authenticated admin can send
`POST /api/admin/market-data/disclosures` with JSON
`{ "chamber": "senate" }` or `{ "chamber": "house" }`.
The server uses `FMP_API_KEY` and the existing shared FMP queue/cooldown. It makes
at most four sequential requests per run (25-second shared deadline):

1. Page 0 with limit 50, as the reference before reading.
2. Pages 0 and 1 with limit 25 each.
3. Page 0 with limit 50 again, to check reference stability.

The report contains counts only: duplicate fingerprints, missing/unexpected
records, ordering differences, invalid dates and date mismatches. It never
returns raw provider filings, personal names, URLs or credentials. Repeated
identical fingerprints require review: FMP does not supply a guaranteed unique
line ID, and a shared filing URL alone is not a unique trade ID.

- `passed` means the **two-page window** agrees with a stable wider reference.
- `failed` identifies malformed pages/dates or a mismatch within that window.
- `inconclusive` means the reference changed during reading or was empty. No
  skipped-record count is claimed while the reference is moving.
- 401/403 account restrictions, 429 quota and provider/server errors remain
  distinct. The first failed request stops the run; no blind retries.

`officialFilingDatesVerified` is always false for this live probe: comparing two
FMP reads cannot catch a uniform provider date error. The date regression tests
prove that the calendar date is preserved across UTC offsets and that one-day
differences between reference/page records are detected. Independent official
filings are still needed to verify FMP's dates themselves. Gaps outside the
sample, intra-request changes that revert before the final read, and archive
completeness are not established by this audit.

Tests use synthetic fixtures only. Standard `pnpm test:run` runs the regression,
provider error, entitlement-scope and admin authorization checks without live
keys. Never commit downloaded provider payloads or real agreements.

## Primary references (reviewed 2026-10-12)

- [FMP changelog, 2026-10-08](https://site.financialmodelingprep.com/developer/docs/changelog): stable disclosure pagination and exact filed calendar dates.
- [Senate endpoint](https://site.financialmodelingprep.com/developer/docs/stable/senate-latest) and [House endpoint](https://site.financialmodelingprep.com/developer/docs/stable/house-latest): zero-based `page` and `limit`.
- [FMP terms](https://site.financialmodelingprep.com/terms-of-service), [Finnhub terms](https://finnhub.io/terms-of-service), [Twelve Data terms](https://twelvedata.com/terms): use these together with the actual account agreement; a successful API call is not commercial display permission.

## Evidence review and stricter validation (2026-10-14)

See [the account-evidence review and handoff](market-data-rights-review-2026-10-14.md).
The protected registry now includes `policyReview`, linking public policy sources
to separate provider and exchange review rows. These references never create
entitlements. `evidenceType: public_policy_only` and `grantsAccountRights: false`
make the distinction explicit. Missing references mean further policy review is
needed, not that an exchange permits reuse.

Record IDs must be opaque alphanumeric/hyphen/underscore identifiers. Country
codes must be two letters. Known exchange/country contradictions, wildcard or
combined exchange identifiers, and inconsistent delay values invalidate the
configuration. `delayed` requires positive `delayMinutes`; `realtime` permits
`0` or `null`; `eod` and `unknown` require `null`. Do not infer 1440 minutes for
EOD, or use cache age as a licensed delay. Unknown delay remains unknown.

`planStatus: verified` means an active, structurally valid server-configured
record was matched. It does **not** authenticate a provider account, inspect an
agreement, compare the live billing plan, check cancellations, or approve a
license. The reviewer must independently verify `planName`, licensed entity,
feed product, permitted audience/platforms, storage, attribution and reporting
obligations in the private evidence referenced by `evidenceReference`.

The current key is provider + dataset + exchange + country. It cannot represent
two different feed products/plans/audiences for the same tuple: duplicate tuples
are rejected. Do not collapse conflicting agreements into one broad grant; keep
that scope unverified until a separate feed/audience-aware review is implemented.
This remains advisory metadata and does not enforce contractual delay or access.
