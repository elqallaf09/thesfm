# Official macroeconomic evidence

The analyst now supplements paid-calendar failures with independently loaded public economic observations. It retains the chart and canonical-result fixes released in #195.

| Coverage | Source | Meaning |
| --- | --- | --- |
| USD funding | New York Fed | SOFR and effective federal funds rate, daily |
| US inflation | BLS CUUR0000SA0 | Non-seasonally-adjusted CPI index converted to year-over-year inflation using the exact matching month 12 months earlier |
| US unemployment | BLS LNS14000000 | Published seasonally adjusted monthly unemployment rate |
| US growth | BEA via FRED A191RL1Q225SBEA | Published annualized quarter-over-quarter real GDP growth; no additional annualization |
| Identified non-US issuer country | World Bank WDI | Annual real GDP growth, consumer-price inflation and ILO-modelled unemployment, explicitly labelled as annual context and estimates where applicable |

Source documentation:
- https://www.bls.gov/developers/api_signature_v2.htm
- https://fred.stlouisfed.org/series/A191RL1Q225SBEA
- https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures
- https://www.newyorkfed.org/markets/reference-rates/sofr

## Integrity and cost

No new provider key, paid plan, dependency, schema, secret or authorization change is required. BLS and FRED requests use six-hour caching; annual country requests use daily caching. Concurrent requests share in-flight work. Each provider has a bounded timeout; failures retain only dated, still-valid previously fetched evidence and never alter its original period/retrieval time.

Country context comes from the identified issuer country. A Kuwait security priced in USD does not become a US security. USD FX/commodity/crypto instruments can use US monetary context. Non-USD FX currencies are not guessed as sovereign issuer countries.

Evidence periods are effective dates or completed month/quarter/year ends, not release timestamps. Daily/monthly/quarterly/annual series have separate maximum ages (7/100/210/730 days); retrievals expire after seven days. Prior comparisons require consecutive periods, except existing daily rates which compare published business observations. Missing/null/invalid data never becomes zero. CPI requires the exact prior-year month; a missing latest denominator does not silently select an older release. Wrong series/country and conflicting duplicates are rejected.

Published observations remain descriptive, partial evidence. They do not invent consensus forecasts, announcement surprises, trade signals, directional scores or profit probabilities. Annual data is not a substitute for a current monthly release or a complete global event calendar. Existing immutable saved analyses are not rewritten.

## Verification and recovery

Parser and orchestration coverage checks dates, CPI transformations, quarterly units, country matching, source outages, cache deduplication and lifetime. Presentation coverage checks Arabic/English/French, Latin digits, rounded values, annual/estimate labels and one source per indicator. Browser regression coverage checks macro visibility and overflow at desktop/mobile widths.

Live source discovery on 2026-09-19 returned HTTP 200 with nonempty BLS CPI/unemployment, BEA/FRED quarterly GDP and Kuwait WDI payloads. Later local BLS probes timed out; live production verification is required before claiming availability in deployment.

Rollback application artifact: dpl_Fh9PDRT2uyvsnLzip99dgWN2Lkar, production SHA fe7035e6806b354ed4c18bb29d575c7760f37607. No migration rollback is needed. Standing user authorization covers merging and publishing tested fixes. Production checks are point-in-time verification; this change does not claim a completed timed canary, sustained RUM coverage or a rollback drill.
