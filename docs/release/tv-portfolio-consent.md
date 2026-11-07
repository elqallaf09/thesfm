# TV portfolio consent release

## Scope

Investment values require a separate, optional owner approval for each newly
paired TV. The checkbox is unchecked by default. Existing pairings and older
approval requests retain watchlist access but do not receive investment access.
No existing device is backfilled. Device settings cannot grant this permission.

The portfolio handler checks authorization and consent before reading private
data and checks both again before returning a response. The updated client
clears values on loss of connectivity, backgrounding, page hiding, authorization
failure, and other request failures. A successful response grants at most a
30-second display lease while JavaScript is running; a stalled refresh does not
extend it. Visibility/resume requires a fresh request. Private responses are not
stored in local/session storage or the shared public-resource cache.

## Deployment order

1. Run required CI, including the complete clean Postgres migration chain and
   `.github/scripts/markets-tv-validation.sql` on its guarded disposable database.
2. Compare the linked production migration ledger with the repository. Resolve
   any pre-existing drift through the existing reviewed procedure before applying
   the new migration. Do not replay or edit historical migrations.
3. Apply `20261108010000_markets_tv_portfolio_consent.sql`. It adds one nullable
   timestamp with a NULL default. It does not change existing rows, grants, RLS,
   credentials, or holdings. The previous application remains schema-compatible.
4. Deploy the exact tested application commit, then record the deployment ID and
   source SHA. The migration alone does not close access through the old handler.
   Do not deploy the application first: device authorization selects the column.
5. Verify unauthenticated access is rejected without fetching real holdings.
   Use only synthetic accounts/devices for consent, owner isolation, revocation,
   expiry, response-race, and reconnection checks.
6. Distribute packages built from the tested commit through the normal TV release
   process. Coordinate with any concurrent TV packaging work; do not replace its
   checkout or signing configuration.

## Existing devices and limits

Existing device tokens receive `403 PORTFOLIO_CONSENT_REQUIRED` and must be linked
again with the optional investment checkbox selected. A successful re-pair uses
a new token and explicit consent. Owners can revoke devices from `/tv/pair`.

Old APKs and already-loaded old pages lack the new client clearing behavior. A
server denial prevents their future reads, but cannot erase a value already
displayed on a disconnected legacy client. Reload/update and re-pair are needed
before claiming the new client protection. Browser freezing can defer JavaScript
timers; the visibility/resume safeguards need actual TV verification in addition
to simulated browser lifecycle tests. Never describe this as remote deletion.

## Recovery

Keep the additive column in place. Prefer a tested forward fix. If the feature
must be disabled, deploy a deny-only portfolio handler while preserving ordinary
TV pairing/watchlist routes. **Do not roll back to an application artifact that
lacks the consent guard:** it would restore investment access to legacy tokens.
Do not automatically reverse the migration or backfill consent to recover service.

## Evidence required before closure

Record the exact SHA, CI run URLs, migration ledger comparison and apply result,
immutable deployment ID, synthetic smoke results, updated client/package version,
and any device-validation limits. Follow the main release checklist for canary,
telemetry, and named responders. Missing observability or physical-device checks
are not implied passes and need an explicit release decision.
