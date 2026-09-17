# SFM historical store security boundary

The v1 market observation ledger is server-only. RLS is enabled and forced, browser roles have all table privileges revoked, and the service role is limited to SELECT/INSERT. UPDATE, DELETE and TRUNCATE are explicitly revoked to preserve append-only evidence semantics.

The ingestion endpoint is protected by the existing admin API policy exception plus `CRON_SECRET`/`SFM_MARKET_INGEST_SECRET`; it is not an anonymous write surface.
