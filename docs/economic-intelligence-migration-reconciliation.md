# Economic Intelligence migration identity reconciliation

## Scope and evidence (2026-09-15)

Read-only inspection of the connected SFM project's `supabase_migrations.schema_migrations` confirmed that Economic Intelligence had already been applied under these versions:

| Previous unmerged PR filename | Recorded version and canonical filename |
| --- | --- |
| `047_notifications_event_key.sql` | `20260914083512_economic_intelligence_event_identity.sql` |
| `048_economic_intelligence_event_outcomes.sql` | `20260914083531_economic_intelligence_event_outcomes.sql` |
| `20260914090000_economic_intelligence_confirmations.sql` | `20260914083552_economic_intelligence_confirmations.sql` |

The old 047 and 048 versions belong to onboarding migrations, not Economic Intelligence. The 20260914090000 prefix also occurs in the Shariah migration brought in from main. Reusing a migration version is not equivalent to adding another independent migration: Supabase tracks the numeric version as its identity.

This commit reconciles only the three unmerged Economic Intelligence files. Existing onboarding and Shariah files and all deployed migration history remain untouched. The confirmations SQL is preserved byte-for-byte. The identity and outcome SQL reflect the recorded deployed statements, rather than assigning an already-used version to different SQL.

## Outcome semantics

The recorded deployed outcome trigger is SECURITY INVOKER with a pinned search path. Moving a notification to `read` records `opened_at`, not `actioned_at`. The superseded draft file incorrectly stamped an action on reads. Reconstructing a clean database must not reintroduce that behavior. The later search-path hardening migration remains in place.

## Verification boundaries

- Added a repository-wide unit guard rejecting duplicate migration versions; legacy numeric versions remain supported.
- Added assertions for the deployed Economic Intelligence identities and read-versus-action distinction.
- Added route-policy regressions retaining both Economic Intelligence and Shariah protections after main integration.
- Required fresh CI must execute these tests and the clean migration chain on the published head.
- No production DDL, data writes, migration repair commands, secrets, billing settings or branch rules were changed.
- Reading migration history does NOT verify live two-user RLS isolation. That separate Preview test remains unexecuted until an isolated Supabase Preview is available.
- This is not a declaration that every historical repository migration matches the entire remote history. In particular, the Shariah migration's independently registered timestamp differs from its existing main filename; it needs separate reviewed reconciliation before an unattended database push. Do not run migration repair or blanket db push based on this document.
