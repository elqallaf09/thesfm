# Reviewed US listing sources (2026-11-16)

## Implemented scope

The new-stocks page now has an independent source-backed listing panel. Its registry
is **partial, manually reviewed coverage**, not a comprehensive exchange directory
or an automatically discovered IPO feed. No FMP subscription or database migration
is required. The default 90-calendar-day window is displayed explicitly; news keeps
its separate 30-day publication window. Records expire on `reviewAfter` (at most
30 days after review). An old filing is not a newly verified trading event merely
because its URL still resolves.

Three factual records were read at the linked primary documents:

| Symbol | First US trading date | Classification | Primary evidence |
| --- | --- | --- | --- |
| AGLT | 2026-11-05 | Business combination, not conventional IPO | [SEC 8-K/A Exhibit 99.4](https://www.sec.gov/Archives/edgar/data/2074973/000121390026119809/ea031195901ex99-4.htm), Recent Developments |
| AMRO | 2026-10-15 | New US listing; ASX CDIs existed previously | [SEC 10-Q](https://www.sec.gov/Archives/edgar/data/2141616/000119312526453527/ck0002141616-20260930.htm), Subsequent Events |
| ADRX | 2026-09-25 | IPO | [SEC 8-K Exhibit 99.1](https://www.sec.gov/Archives/edgar/data/1802369/000119312526458321/adrx-ex99_1.htm), Recent Business Highlights |

Only common stock is included. AGLTW warrants and SPAC units such as PAXGU/HYACU
are excluded. Splits, symbol changes, registration effectiveness, offering close,
pricing and *expected* trading dates are not first-trade evidence. No verified NYSE
row has been added yet; supported venue validation is not a coverage claim.

## Rights are separate

- [SEC Webmaster FAQ](https://www.sec.gov/about/webmaster-frequently-asked-questions)
  expressly permits reuse of public EDGAR filing content. This registry stores
  factual metadata and attribution links, not photography, logos or entire filings.
- [SEC Developer Resources](https://www.sec.gov/about/developer-resources) documents
  submissions APIs, latest-filings RSS and daily indexes. Automated requests must be
  efficient and stay below the aggregate 10 requests/second limit.
- SEC reuse permission **does not license quotes**. [Finnhub terms](https://finnhub.io/terms-of-service)
  require written approval for third-party redistribution; API success alone is not
  proof of commercial rights. [Yahoo terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html)
  likewise do not provide a blanket commercial redistribution grant.
- Consequently this new feature's quote requests/display are **off by default**.
  Only after the operator records applicable commercial rights for the existing
  Yahoo/Finnhub quote path may `NEW_LISTING_QUOTES_RIGHTS_CONFIRMED=true` be set on
  the server. This change does not set the flag, change credentials, buy a plan,
  authorize that setting, or alter other pages' existing quote behavior.
- If enabled, only fresh (under four days, to accommodate non-trading days), positive,
  dated USD equity quotes with matching symbol, venue and issuer name enter the
  ticker. Missing/ambiguous prices are omitted rather than invented. Price source,
  timestamp and possible delay remain distinct from filing provenance.

## Sources considered but not silently activated

- [FMP IPO calendar](https://site.financialmodelingprep.com/developer/docs/stable/ipos-calendar)
  describes scheduled IPOs. The site's current IPO route returned provider HTTP402
  `Restricted Endpoint` on 2026-11-16. It is neither a working fallback nor proof of
  completed first trade.
- [Nasdaq Daily List](https://www.nasdaqtrader.com/Trader.aspx?id=dailylistpd) is a
  subscription product. Do not scrape gated access.
- [Nasdaq DTN2026-26](https://www.nasdaqtrader.com/TraderNews.aspx?id=DTN2026-26)
  announces future free issuer/security information with Data Link modernization
  before June 30, 2027. No live documented free endpoint has been verified here.

## Maintainable update procedure

1. Run `SEC_USER_AGENT='Application name authorized-contact@example.com' node
   scripts/market-listings/discover-sec-candidates.mjs` to retrieve one recent
   8-K Atom feed. Use an authorized real contact, not the example. Output is only
   **unreviewed candidates**, not records to import. Do not commit downloaded feed
   payloads. Respect HTTP403/429; no retry loops or alternate-identity bypasses.
2. Open a candidate's securities table and exhibits. Corroborate issuer/CIK,
   actual first-trade date, common-stock class, US venue and event type. Expand
   research through the SEC daily index or issuer's SEC filings for missed 10-Qs.
   Recent 8-Ks alone are not comprehensive discovery.
3. Add/change reviewed metadata in `src/data/market-listings/verified-us-listings.json`
   with exact document link and section. Do not use prospective wording as evidence.
   Never bump review dates automatically on an HTTP200 response.
4. Run `vitest run src/__tests__/unit/verifiedListings.test.ts
   src/__tests__/unit/specialMarketNews.test.ts` plus repository checks and review.
   Verify new records against original sources. Records naturally disappear at
   review expiry or when older than 90 days; this prevents permanent old listings.
5. Verify final deployed page and API. Source integration, current quote access,
   quote rights, and complete market coverage are distinct acceptance criteria.

Rollback: revert this application change; no data/schema changes need reversal.

## Advisory freshness audit

Run `node scripts/market-listings/audit-freshness.mjs` locally and
`node --test scripts/market-listings/audit-freshness.test.mjs` for boundary tests.
The weekly Wednesday 06:17 UTC/manual `Reviewed listings freshness (advisory)`
workflow reports date-current, review-due within seven calendar days, expired,
aged-out, and invalid-date rows in its job summary. Date-current is not a fresh
verification of evidence or a promise that a row passes all runtime identity checks.
Expiry is exclusive at midnight UTC; the 90-day first-trade window is inclusive.
Aged-out rows take precedence over expired rows and do not need renewal.

The audit makes no provider requests, uses no secrets, changes no registry data,
and never renews evidence. Freshness warnings remain advisory, separate from
required PR checks; malformed files or broken audit code can still fail its job.
Scheduled runs start only after this workflow reaches the default branch. GitHub
scheduling can be delayed, and warning annotations do not guarantee someone is
notified or completes a review. Use the manual procedure above to review evidence
before the deadline. The initial three records are due for attention December 9,
2026 and expire December 16, 2026 unless genuinely reviewed again. This audit is
not automatic listing discovery and grants no provider or quote-display rights.

## Font-budget investigation (2026-11-16)

The first PR build completed but the unchanged 380,000-byte font budget failed
at approximately 387.3 KiB. Base `676c0591` and candidate `649fb691` have identical
font declarations, lockfile and Next configuration. With Node 22.13.0 and Next
16.4.3, isolated production font fixtures extracted from each exact revision
emitted identical 31-file SHA-256 manifests (368,120 bytes) when replaying the
same captured Google CSS and real WOFF2 bytes. This controlled font-only check
is not a full application build or a reproduction of the failed runner's assets.
The original CI run did not retain font identities, so its larger total cannot
be attributed confidently to a particular font or to this feature.

The performance guard now prints per-file sizes and SHA-256 identities when the
font budget fails, allowing a subsequent failure to be diagnosed without
relaxing the budget or removing languages/weights speculatively. No font family,
weight, language subset, or performance threshold was changed. A fresh exact-head
CI build remains required; diagnostics alone are not a claim that the regression
has been fixed.
