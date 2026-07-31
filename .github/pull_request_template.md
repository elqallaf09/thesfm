## Scope

<!-- What user or operational outcome changes? Keep unrelated work out. -->

## Risk and rollback

- Risk level: <!-- low / medium / high -->
- Affected routes or services:
- Rollback command or procedure:
- Data rollback required: <!-- no / yes, explain -->

## Verification

- [ ] Typecheck and lint pass.
- [ ] Relevant unit/integration tests pass.
- [ ] Arabic, English, and French behavior is verified when UI copy changes.
- [ ] Desktop, mobile, keyboard, loading, empty, and error states are checked when UI changes.
- [ ] Authorization, rate limits, caching, and safe errors are checked when API behavior changes.
- [ ] Migration clean-chain passes when the schema changes; migrations are append-only.
- [ ] Performance and maintainability budgets pass; any measurable delta is recorded below.
- [ ] No secret, service-role key, personal data, build artifact, or provider payload is committed.
- [ ] Release checklist evidence is attached for a production release.

## Evidence

<!-- Commands, screenshots, CI runs, bundle deltas, migration output, and monitoring links. -->

## Exceptions

<!-- Owner, reason, expiry date, and follow-up issue. Write "None" when there is no exception. -->
