# Growth stock coverage and readable ticker

The growth page previously hard-coded an insufficient-fundamentals banner, counted nine missing fields per stock and ignored screener growth fields. Its fixed 36-second loop accelerated with the list length. Production inspection on 2026-09-19 confirmed FMP company-screener HTTP 429 and a 28-symbol fallback (including obsolete SQ).

Changes:
- Expand the research watchlist to 100 distinct symbols, use XYZ for Block and preserve company names when a quote returns only its symbol. Membership is not a passing fundamental screen.
- Measure ticker distance at 28 pixels/second; deduplicate symbols and stop repeating the whole list within its primary set. Preserve hover/focus pause and reduced motion.
- Independently fetch annual SEC financials in batches of six, at most three source requests per batch concurrently. Deduplicate in-flight work, cache parsed results for 12 hours, briefly back off source failures and stop after two failed batches. Share the growth screen across ticker/news/scanner for five minutes.
- Calculate annual revenue/net-income growth, net margin and operating cash flow less capital expenditure. Require matching issuer, currency, annual period and accession; reject conflicting, future, stale or noncomparable data. Loss/zero growth denominators remain unavailable. Annual figures are explicitly dated and attributed; no grade is invented. Existing FMP growth figures remain visible with their own period if annual data is missing.
- Show actual coverage and missing fields, preserve negative and zero values, and remove valuation-risk estimates based only on a daily price move.

Sources: [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), [Block symbol change](https://investors.block.xyz/investor-news/news-details/2025/Block-Announces-Ticker-Symbol-Change-to-XYZ-To-Report-Fourth-Quarter-Results/default.aspx).

No credentials, paid plan, dependency or database migration changes. Local verification uses explicit synthetic financial/browser fixtures; it does not prove live provider coverage. Annual US-GAAP coverage remains partial for missing standard tags and IFRS filers. Production source responses must be checked after deployment. The user has standing authorization to merge tested fixes. Rollback is the previous application deployment; sustained RUM/canary observation is not claimed by these checks.
