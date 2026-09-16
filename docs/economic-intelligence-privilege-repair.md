# Confirmation table privilege repair

The real isolated Supabase workflow on f16290deb884a32decbd381e94226f3de4a82034 (run 34970874399, job 104386573269) successfully started Supabase and applied the repository migrations. Both users passed ownership CRUD/denial checks for user_decisions and notifications, including the notification read/action/evidence trigger assertions. The first user-owned insert into economic_intelligence_confirmations failed with PostgreSQL code 42501.

The table creation migration enables RLS and defines all four authenticated ownership policies, but does not explicitly grant authenticated table CRUD. The new additive migration 20260915133000 grants exactly SELECT/INSERT/UPDATE/DELETE to authenticated. It does not grant TRUNCATE, change row policies, authorize anonymous users, or rewrite deployed migration history.

The isolated real-service workflow must rerun on the repaired head. Static tests document the least-privilege contract; they are not a substitute for that execution. No production database changes are made by committing this migration. Production-schema deployment remains a separate controlled operation after migration-history reconciliation.
