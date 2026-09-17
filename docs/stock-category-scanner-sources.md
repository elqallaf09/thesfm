# Data sources

Primary discovery for US category universes uses the configured Financial Modeling Prep company screener across NASDAQ, NYSE and AMEX. Quote enrichment uses the existing SFM market quote provider chain. Growth classification uses recent completed-quarter fundamental growth data. Sharia classification reads persisted SFM screening evidence and does not infer compliance from generic market attributes.

If a required upstream source is missing, limited or unavailable, the scanner returns an explicit degraded mode and falls back to the configured category watchlist only as a continuity mechanism.
