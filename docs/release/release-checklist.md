# Production release checklist

Use this checklist for every production candidate. A checked box needs a CI run,
command output, screenshot, dashboard link, or named approver in the release
record. Do not mark an unavailable control as passed.

## 1. Candidate and scope

- [ ] The exact commit SHA, included pull requests, owner, and risk level are recorded.
- [ ] CODEOWNERS review and required CI checks pass without a permanent bypass.
- [ ] User-visible changes and support/operations impact are summarized.
- [ ] Rollback target and the person authorized to trigger rollback are named.

## 2. Security and privacy

- [ ] `pnpm install --frozen-lockfile` succeeds and the dependency audit has no unresolved high or critical finding.
- [ ] Authenticated and admin routes reject unauthenticated and unauthorized requests.
- [ ] Server responses do not expose stack traces, tokens, provider payloads, or personal data.
- [ ] Changed secrets are stored server-side and rotation/revocation has been tested.
- [ ] Database RLS and service-role use were reviewed for schema or access changes.

## 3. Quality and data

- [ ] Typecheck, lint, i18n, maintainability, unit/integration, build, and performance-budget CI jobs pass.
- [ ] The complete migration chain passes once against a fresh Postgres database.
- [ ] Forward migration, compatibility with the previous app version, and recovery steps are documented.
- [ ] A restorable backup exists for destructive or irreversible data changes.
- [ ] Provider degradation, empty data, rate limiting, and retry behavior were exercised where relevant.

## 4. User experience

- [ ] The primary Today workflow and changed routes pass on desktop and mobile.
- [ ] Arabic/RTL, English, and French are checked for changed flows.
- [ ] Keyboard navigation, focus, labels, contrast, loading, empty, and error states are checked.
- [ ] Login, onboarding, session expiry, sign-out, and protected redirects are checked when auth is affected.
- [ ] Lighthouse and checked-in route budgets show no unexplained regression.

## 5. Canary and observability

- [ ] A canary audience, duration, success thresholds, abort thresholds, and owner are recorded.
- [ ] Release markers reach production logs and the error tracker.
- [ ] Real-user monitoring covers LCP, INP, CLS, route/API errors, and task completion for changed critical flows.
- [ ] Alerts route to a named responder during the canary and observation window.
- [ ] Telemetry excludes financial values, search/ticker history, tokens, and personal data unless explicitly approved and minimized.

These observability controls are **not satisfied** merely because the application
builds. If production RUM/error tracking, alert destinations, or owners are not
configured, the release decision must record that gap and require explicit risk
acceptance; it must not silently check these boxes.

## 6. Deploy, verify, and close

- [ ] Deploy the exact approved SHA and capture the deployment identifier.
- [ ] Run production smoke checks without writing or deleting real user data.
- [ ] Observe the canary through the agreed window and compare against the baseline.
- [ ] Roll back immediately when an abort threshold, auth/data leak, migration failure, or critical workflow failure occurs.
- [ ] Record the final decision, monitoring evidence, incidents, follow-ups, and completion time.

## Rollback minimum

Application rollback must be a tested redeploy of the last known-good immutable
artifact. Prefer roll-forward migrations: never automatically reverse a schema
change that may have received production writes. Disable the affected feature,
restore application compatibility, and use the database recovery runbook only
with an approved, verified backup and a named incident owner.
