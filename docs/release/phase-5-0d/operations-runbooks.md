# Release operations and rollback runbooks

These runbooks require an incident owner, a communications owner, exact timestamps, and an evidence log. They do not authorize Production changes by themselves.

## Common first response

1. Declare severity and freeze merges, deployments, migrations, key rotations, and provider changes unrelated to the incident.
2. Record UTC/local start time, current Production SHA/deployment ID, Supabase ref, affected routes, first known error fingerprint, and customer impact.
3. Verify `/api/health`, database health, Vercel 5xx/logs, auth, payments, email, provider health, and recent deployments without printing secrets or payloads.
4. Choose rollback, traffic containment, or provider-degraded mode. Assign one operator and one verifier.
5. After recovery, run unauthenticated, authenticated, admin, payment/email/provider smoke checks appropriate to the incident and keep the previous deployment available until sign-off.

## Vercel outage or bad deployment

- Confirm whether the failure is regional, platform-wide, or tied to one deployment SHA.
- If the previous Production deployment is healthy and schema-compatible, reassign Production aliases/rollback using Vercel’s audited rollback operation. Do not rebuild from an unrecorded checkout.
- Do not roll application code back across an irreversible migration. If schema compatibility is uncertain, stop and invoke the broken-migration runbook.
- Verify canonical HTTPS, health endpoints, auth redirect, one public route, one authenticated route, and one admin route. Monitor 5xx and latency for at least the agreed rollback window.

## Supabase outage

- Verify project status, database/API/Auth/Storage logs, connection saturation, and provider status.
- Prevent new writes if consistency cannot be guaranteed; preserve last-known-good read states and show truthful unavailability.
- Never point Production at Preview or a manually altered database. Recovery/restore requires the verified backup artifact and restore owner.
- After recovery compare migration version, table/function/RLS inventory, key row counts, auth, storage downloads, and application health.

## Payment outage

- Stop presenting paid checkout if mode, webhook verification, or entitlement writes are unreliable. Do not grant entitlement manually from an unverified client success screen.
- Record Stripe mode, event IDs, webhook attempts, signature outcome, and subscription/customer IDs in restricted incident notes.
- Replay only verified Stripe events using provider tooling after durable idempotency is confirmed. Reconcile payment state to entitlement state before reopening checkout.
- Notify affected customers using approved copy; never request card details by email or support chat.

## Email outage

- Verify provider status and sender-domain authentication, then test with an approved non-customer recipient.
- Keep raw SMTP errors server-side and redact credentials/addresses in shared logs.
- Do not claim contact/signup/reset success if the provider did not accept the message. Preserve retryable intent only where the application has a durable queue; the current contact flow has no durable queue.
- Reconcile failed auth, review, reminder, payment, and admin-alert messages separately.

## Market/provider outage or degradation

- Identify provider, feature, entitlement/plan response, region, first failure, cache age, and last-known-good timestamp.
- Do not convert empty/error responses into success or erase valid stored data. Show unavailable/stale/provider-limited state and correct market currency.
- Disable only the unsupported provider capability; retain verified fallbacks within their documented plan limits.
- Reopen after consecutive successful health/data checks and confirm no fabricated quote, recommendation, calendar item, or Shariah status was shown.

## Broken migration

- Stop the migration and application rollout. Record migration version, statement, elapsed time, locks, timeout, and affected objects.
- Use the pre-approved rollback SQL only after confirming transaction state and lock risk. Do not improvise destructive SQL in Production.
- If rollback is unsafe, restore the verified backup into an isolated target first, compare it, then follow the approved recovery plan.
- A clean Preview migration, backup checksum, restore test, statement timeout, lock review, and maintenance window are prerequisites for retry.

## Security incident

- Restrict access, preserve logs, and assign an incident commander. Do not disclose tokens, cookies, personal data, or exploit details in public channels.
- Revoke/rotate the minimum affected credentials at the provider, invalidate sessions if required, and check Vercel, Supabase, Stripe, SMTP, GitHub, and market-provider audit trails.
- Assess cross-user access, payment/data integrity, exfiltration, persistence, and affected time window. Engage legal/privacy owners for notification decisions.
- Recovery requires negative tests, secret/client-bundle scans, dependency review, and explicit security owner sign-off.

## High error rate

- Group by route, status, fingerprint, deployment SHA, region, and provider. Separate user errors from platform errors.
- Roll back a bad deployment or contain a single job/provider before broad changes.
- For cron timeouts, bound work per invocation and prove retries/idempotency; repeated partial completion is not a healthy success.
- Close only after error rate and latency remain below the approved threshold for the monitoring window.

## Production rollout checklist

- [ ] All P0/P1 items closed with linked evidence
- [ ] Draft PR approved and all required checks, including Supabase Preview, green
- [ ] Preview READY at exact approved SHA
- [ ] Authenticated user/admin E2E green on isolated data
- [ ] Backup checksum/timestamp/retention recorded and isolated restore comparison passed
- [ ] Migration SQL/rollback/locks/timeout/window approved, or “no migrations” recorded
- [ ] Payment launch mode and email delivery approved
- [ ] Provider support/degradation matrix approved
- [ ] Legal copy approved
- [ ] Rollback operator, incident channel, low-traffic window, and monitoring window assigned
- [ ] Exact Production SHA/deployment ID and migration start/end recorded
- [ ] Immediate health/auth/payment/email/provider smoke checks complete
- [ ] Previous deployment retained until owner sign-off
