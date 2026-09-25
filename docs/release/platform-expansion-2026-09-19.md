# Platform expansion — 2026-09-19

Candidate work continues in PR #199 (`feat/platform-completion-core`), preserving its existing account-switch, sidebar, month-close, Teams and SFMer changes. This record distinguishes implementation, verified behavior and external activation. No production financial records or real user messages are used as test fixtures.

## User journeys

- `/economic-intelligence/advisors`: ten deterministic capability reports with explicit currency/month, assumptions, provenance, missing data, action links, saved private versions and comparison. Optional explanations use the existing authenticated AI provider/quota path. Source failure does not consume AI allowance. Linked debt repayments are not counted twice; incomplete debts suppress total-liability and payoff results.
- `/notifications/channels`: explicit opt-in, verified account email, dedicated Telegram/WhatsApp ownership challenges, device Push subscriptions, quiet windows, disconnection and actual delivery states. `/api/notifications` reads and updates owned records instead of returning stub success.
- `/settings/integrations`: hash-only, scoped expiring keys, immediate revocation, durable per-key 30/minute quota, metadata and imported snapshots. API v1 exposes read-only portfolio/notifications and idempotent snapshot ingestion. Incoming data cannot overwrite the ledger or place orders. The MT5 exporter sends account/position snapshots; Linux cannot compile or validate MetaTrader execution.
- `/settings/apps`: browser installation and instructions for Apple/Android/Huawei devices. This is the existing web app, not separately released native iOS products.
- Teams: assigned shared tasks with due dates, status and owner/author/assignee controls, in addition to existing invitations and notes. Personal financial records remain isolated.
- SFMer: unique community aliases, display names and biographies shown with posts; existing edit/delete, blocking, reporting and moderation remain in place.
- Investor links: fail-closed malformed expiry, HTTPS-only document URLs, section/download rights on activity events, owned sharable document validation, atomic access counters, no-store private payloads and noindex/referrer restrictions.

## Delivery operations and activation

Cron `/api/notifications/dispatch` uses `CRON_SECRET`, claims at most ten deliveries with row locks, and runs every 15 minutes. A locked owner enqueue counter caps new deliveries at 100 per rolling day. Read/archived notifications and disabled channels are cancelled. SMTP acceptance, Telegram acceptance and Web Push acceptance are labelled accepted; only signed WhatsApp delivery/read callbacks prove delivery. Interrupted sends and ambiguous network/5xx results remain uncertain and are not automatically resent. Explicit 429 responses retry at most four attempts. No fixture invokes a real provider send.

Configure server-side only, independently in each environment:

| Channel | Configuration |
| --- | --- |
| Email | Existing SMTP configuration in `src/lib/server/smtpMail.ts`; destination is the authenticated confirmed email |
| Telegram | `SFM_NOTIFY_TELEGRAM_TOKEN`, `SFM_NOTIFY_TELEGRAM_USERNAME`, `SFM_NOTIFY_TELEGRAM_WEBHOOK_SECRET`; dedicated bot webhook `/api/webhooks/notifications/telegram` with its secret header |
| WhatsApp | `SFM_NOTIFY_WHATSAPP_TOKEN`, `SFM_NOTIFY_WHATSAPP_PHONE_ID`, `SFM_NOTIFY_WHATSAPP_NUMBER`, `SFM_NOTIFY_WHATSAPP_TEMPLATE`, `SFM_NOTIFY_WHATSAPP_TEMPLATE_LANGUAGE` (defaults to en), `SFM_NOTIFY_META_APP_SECRET`, `SFM_NOTIFY_META_VERIFY_TOKEN`, `SFM_NOTIFY_META_VERSION`; approved static template linking to the notification center and channel settings; signed webhook `/api/webhooks/notifications/whatsapp` |
| Push | `SFM_NOTIFY_VAPID_PUBLIC_KEY`, `SFM_NOTIFY_VAPID_PRIVATE_KEY`, `SFM_NOTIFY_VAPID_SUBJECT`; browser/device permission and subscription |

Configuration is reported as unavailable when prerequisites are absent. Secrets are never returned to the browser; only the VAPID public key is public. Do not reuse the unrelated Instagram Telegram bot or existing webhook destination. Provider setup and an explicitly authorized isolated delivery test remain activation gates.

## Database and recovery

Three additive migrations introduce plan versions, channel verification/delivery, integration keys/snapshots, team tasks and SFMer profiles. Browser roles cannot read destinations, challenge hashes or integration key hashes. Server insert routes use the session owner, with browser reads/deletes restricted by RLS. SECURITY DEFINER functions use an empty search path and explicit actor/role checks. `tests/database/platform-expansion.sql` exercises isolation, denied grants, single-use verification, delivery claims/crash behavior, key quota/scope/revocation and team task permissions on a disposable CI database only. Its auth.uid stub must never be installed in Production.

Apply the reviewed migrations in order before enabling changed application routes in Production. Rollback is an application redeploy preserving the additive tables and their records. Disable cron/channel configuration if delivery has a defect; do not resend uncertain deliveries. Never roll back over another authorized main change or alter historical migration entries.

## Verification and limits

Local evidence: production build and route bundle budgets pass; focused advisor/provider/navigation guards pass. Final aggregate results and exact-head CI run are recorded in the PR. PGlite tests are supplemental, not a substitute for the required clean PostgreSQL 17 chain. Local browser installation encountered CDN timeouts; CI is responsible for Chromium/WebKit and isolated authenticated route verification. The investor/card browser test now awaits actual menu closure and focus restoration before invoking another control, without relaxing its layout or expansion assertions.

The separate roadmap checker reports medians for performance 95%, accessibility 100%, best practices 100% and SEO 100% (SEO excluded for private account pages). A failed or absent measurement remains unfulfilled even when lower baseline CI passes. Current work does not certify every route, field INP, long sessions, 100/500/1000-user capacity, or 95+/100 scores.

Remaining product/activation work: native iOS signing/TestFlight/store release, official IBKR/bank/wallet access and reconciliation, MT5 terminal validation, real provider delivery and template approval, enterprise billing/shared projects, social follows/comments and broader moderation policy. No feature is advertised as a completed live external integration without that evidence.

Canary: after required checks and exact-SHA isolated Preview validation, use existing release controls. Record the current READY Production baseline before promotion, observe for five minutes, and abort on changed-route 5xx, broken authentication or authorization leakage. Keep provider delivery disabled until configured and separately verified; production RUM/responder gaps remain explicit release-record items rather than assumed passes.

## Database rollout and first CI result

Candidate `eacce995c1ced128020ffff31abde4a73deaf9cd` passed CI TypeScript, ESLint, i18n, launch guards, coverage tests, complete clean PostgreSQL chain and production build/budget gates in run `35465484997`. The three expansion migrations were applied to Production after clean-chain acceptance with versions `20260919195054`, `20260919195103` and `20260919195110`. All eight new tables have RLS; metadata checks confirm browser roles cannot read channel secrets/key hashes or call the delivery claim function. No financial data or provider-message fixture was created.

The Supabase-owned check `105956935300` failed before migrations with “Failed to update config for branch: feat/platform-completion-core”. The existing isolated branch remains ACTIVE_HEALTHY and responds to read-only SQL, but has not applied the expansion migrations. No configuration file or migration history has been changed to bypass this failure. This documentation update retries the ordinary Git integration synchronization once; detailed service logs require authenticated Supabase dashboard access if it recurs. The application's Production release remains unverified until the exact-head isolated Preview gate passes.

## Preview configuration follow-up

The ordinary Supabase resynchronization succeeded for `0de568ad35addd5b46bd909a6d563c222cc09259`; all three repository migrations are present on the isolated Preview. CI run `35465965008` passed all static, unit/coverage, clean-database and build gates. Vercel configuration then rejected a PATCH containing the unchanged sensitive type/scope with HTTP 400. Existing branch-only records now receive a value-only PATCH, preserving storage and scope; the response must confirm the original ID, type and isolated scope. Unsupported or plaintext server-secret storage fails closed. Twelve focused deployment/preflight tests pass. No variable was deleted or changed in Production.

Lighthouse produced five reports (artifact `10591227100`) and passed existing advisory thresholds, but the separate 95/100/100/100 roadmap target failed. This remains an unfulfilled target pending measured improvement, not a completed performance claim.
