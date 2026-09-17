# SFM market store operations

The initial collector runs hourly at minute 5 with bounded concurrency. It stores the normalized SFM quote evidence for the configured ingest universe and deduplicates identical observations by SHA-256 evidence hash.

A failed symbol is reported in the ingestion result and does not create a placeholder row. A missing database configuration also produces an explicit storage failure rather than pretending persistence succeeded.
