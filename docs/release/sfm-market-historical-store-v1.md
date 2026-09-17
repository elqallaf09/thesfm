# SFM Market Historical Store v1 — release note

This change starts THE SFM's own append-only market observation history. It does not claim ownership of upstream exchange facts and does not grant redistribution rights automatically.

The store records normalized quote fields together with quality, observation/receipt timestamps and full provenance. Aggregator observations are internal-only; all other source classes require an explicit rights review before redistribution. Browser roles cannot access the table directly, and service-role privileges are limited to select/insert.

Collection uses the SFM v1 quote engine, so Yahoo remains excluded from this ingestion path. The hourly cron is bounded and the admin endpoint accepts an explicit capped symbol list for controlled backfill/testing.
