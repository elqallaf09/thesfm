# Finance, Investor, Business and website security review — 2026-10-14

Status: **development candidate; not approved for production or app distribution**.
Scope: PR #301 plus main through `322779253c7b38b930da05815770545a5f8c67cb`.
The three applications are `com.thesfm.finance`, `com.thesfm.investor`, and
`com.thesfm.business`. The candidate version is 0.2.1 / Android versionCode 3.
No customer financial record was created, edited or deleted during this review.
No new production database migration, APK distribution or website deployment
was performed. The market-data entitlement setup from PR #302 is unchanged.

## Findings and implementation status

Severity below is an engineering assessment, not a measured CVSS score.
A source fix is not evidence that the deployed application has been repaired.

| Finding | Assessment | Change / remaining action |
| --- | --- | --- |
| A token refresh could complete after logout or a new login and overwrite SecureStore | High; fixed in candidate | Per-product session generations and serialized storage writes reject stale refreshes, reads and writes. Local logout clears storage even offline and reports unconfirmed server revocation accurately. |
| Business role limits were enforced in UI but owner-only RLS did not enforce those limits | High; migration prepared, **not applied** | Restrictive policies on six business tables enforce manager/accountant/employee boundaries. Existing cross-user ownership policies remain. Missing-role owner onboarding is preserved. Role lookup errors fail closed in UI and summary API. |
| Customer/goal foreign keys checked existence, not matching owner | High; migration prepared, **not applied** | Restrictive insert/update checks prevent cross-owner invoice/sale customer links and savings goal links. Synthetic denial tests cover these cases. |
| `receipts` and `income-attachments` storage buckets are public | High potential exposure; **still a production configuration finding** | Both had zero objects in the read-only production check. Candidate stores authenticated application URLs, checks session/MFA and owner, then signs via the user's RLS token for 60 seconds. Legacy URLs are translated only for the configured Supabase origin. A second migration makes both buckets private and adds an owner boundary. Deploy the compatible reader before applying it. |
| Ordinary expense uploads had no matching receipt-folder policy and could report a temporary blob URL as a persisted attachment | Correctness/privacy; fixed in candidate | Owner-folder policy supports ordinary and project receipts; upload errors are surfaced. Project expense save stops when a selected receipt upload fails. |
| Native password login did not challenge enrolled MFA before direct account API use | High; app mitigation implemented, broader enforcement remains open | A server-verified gate runs before sign-in persistence and account data requests. Accounts requiring TOTP/email MFA are blocked until native challenge UI exists. Do not treat this client gate as enforcement against a modified client or direct Supabase REST caller. Review/enforce MFA at the database/session boundary before claiming end-to-end MFA coverage. |
| Android backup enabled and unnecessary overlay/external-storage permissions present in 0.2.0 | Hardening; candidate configuration changed | Backup disabled; overlay, microphone and legacy storage permissions blocked. Screens use capture prevention and an app-switcher shield. Physical-device verification is pending. |
| Public mobile build variables could accept a server key or non-HTTPS endpoint | High impact if misconfigured; fixed in candidate | Configuration rejects non-public Supabase key formats and non-HTTPS/non-origin URLs without echoing values. Product identities are tested separately. |
| Vulnerable development/build dependencies | See audit below | Published fixes installed and lockfiles refreshed. Two distinct high advisories still require resolution or an explicit, time-bounded release decision. |

## Read-only production observations

- Health and login returned HTTP 200. Finance/Business summary and selected admin
  endpoints rejected anonymous requests with HTTP 401 and `no-store`. The same
  three sensitive API checks rejected a synthetic invalid bearer with HTTP 401.
- HSTS, `nosniff` and framing protections were present. This is a bounded header
  and authorization smoke check, not an authenticated penetration test.
- No public-schema table without RLS was found. Existing business records remain
  isolated by owner; this review did **not** demonstrate cross-user data theft.
- Aggregate checks found no cross-owner links in the inspected invoice/sale/goal
  relationships, and the role aggregate contained two manager rows. These are
  point-in-time observations, not guarantees about future writes.
- Supabase advisors reported leaked-password protection disabled, seven
  authenticated-callable SECURITY DEFINER functions, and 25 informational
  RLS-enabled/no-policy tables. The callable functions were reviewed against the
  platform authorization SQL tests; no blanket grants/revokes were introduced.
  Service-only tables were not made publicly readable to silence the advisor.
- Enabling leaked-password protection requires authenticated Auth settings access.
  The connected management tool did not expose that setting and the dashboard
  presented a sign-in wall. It remains **unresolved**, not silently enabled.
- The production ledger contained 152 migration entries. Before these two new
  migrations, the repository contained 162 files: 17 repository-only versions and
  seven remote-only versions. Seven remote entries have corresponding names with
  different local versions. No history was renamed, replayed or marked applied.
  A named reconciliation review must establish actual schema state before either
  new migration is applied. A clean disposable database does not resolve drift.

## Dependency audit

| Scope | Before | After dependency updates |
| --- | --- | --- |
| Website including development tools | 4 critical, 18 high, 13 moderate, 1 low | 1 high, no critical/moderate/low |
| Website production dependencies only | Not separately recorded before | 0 reported vulnerabilities in this audit |
| Expo project including build tooling | 2 high | 2 high |

The remaining distinct advisories are:

- [`braces` GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  installed 3.0.3, through the lint/glob and Metro/build dependency paths.
- [`node-forge` GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv):
  installed 1.4.0, through Expo tooling.

The advisory-referenced 3.0.4 / 1.4.1 package endpoints returned unavailable at
review time, and the registry latest tags remained 3.0.3 / 1.4.0. No invented
version override or audit suppression was added. Recheck by **2026-10-16**;
release-owner acceptance, if justified, must be explicit and expire. No exception
has been approved by this document. An audit result is not proof that runtime
or build inputs cannot exploit an issue.

Vitest/UI/coverage moved together to 4.1.11 and ESLint to 9.39.4; compatible
transitive fixes are pinned. Vite's automatic JSX transform is explicit for
Vitest. The universe-filter test now reuses one catalog without changing its
assertions or timeout. ESLint warning allowances decreased where debt was removed.

## Verification evidence and limits

- Frozen root/mobile installs passed. Website and mobile TypeScript checks passed
  during development; required final-head CI remains authoritative.
- Full local Vitest run after dependency migration: **497 files passed, 5 skipped;
  3,947 tests passed, 23 skipped**. Engine tests: **102 passed**.
- After attachment/MFA additions, the focused security run passed **73 tests in
  seven files**, exercising actual route and native API modules with synthetic
  sessions/storage responses. Full final-head coverage is delegated to CI.
- The complete **164-file migration chain** and four SQL suites passed in an
  isolated PGlite PostgreSQL runtime using the repository bootstrap. Suites cover
  business role denial, owner/reference isolation, private storage boundaries,
  month-close/collaboration and expanded platform authorization. CI additionally
  applies the chain to disposable PostgreSQL 17.
- Three Android and three iOS Hermes bundles compiled. Android prebuild succeeded
  for all three product configurations, including identity/version/backup and
  permission checks. These are compilation checks, **not** successful APK builds,
  signed releases, emulator launches or physical-device tests of 0.2.1.
- A tracked-source pattern scan found no candidate private signing keys,
  service-role JWTs, GitHub tokens or `sb_secret_` keys. This was not a full Git
  history or compiled-Dex forensic audit; no secret values were included in logs.

The existing 0.2.0 APKs were inspected without execution:

| App | SHA-256 |
| --- | --- |
| Finance | `7d6b72b6dcd2853799471e065a0a7366c74e966e6ef632b417c5540ba4efde85` |
| Investor | `4627a5811a0b573cf04b2669347b37cea0ccd534444ffc855dcf74bacc4e6e7e` |
| Business | `b69943cb5bdf92040f250f5a95419de29cf8e488110266a215afd3f3fd66bb44` |

All had the expected package/version, non-debuggable configuration, a v2 signing
block and the same certificate SHA-256
`d2545d96e793aaf59a02213140486441455600174d11c2ee0cb63f4baa0df014`.
This review inspected signing-block presence/certificate identity; it did not
repeat complete cryptographic APK signature verification. No 0.2.1 APK was signed
with a replacement key. The existing private signer must be supplied through the
approved signing workflow so updates remain compatible.

## Required deployment and review order

1. Keep PR #301 draft until exact-head CI, code-owner review and the release gates
   in `docs/release/release-checklist.md` are satisfied. No permission/CI bypass.
2. Assign a database/release owner to reconcile the existing production ledger.
   Review actual schema, role semantics and compatibility with deployed clients.
3. Deploy the authenticated attachment reader and `/api/mobile/session` before
   distributing 0.2.1. Verify with disposable test accounts, including denied MFA,
   expired sessions, two-user files, role changes and offline/online transitions.
4. After that verification, apply the two new migrations through the approved
   migration path. Verify old public financial URLs no longer work and owned
   authenticated downloads do. Do not roll back to public buckets as a shortcut;
   roll forward the reader/policy or disable affected uploads while investigating.
5. Enable leaked-password protection through authorized Auth settings; complete
   native MFA challenge UX and the direct-REST/database MFA enforcement review.
6. Resolve or explicitly review the remaining high dependency findings. Build
   APKs with the existing private signer and test launch, upgrade, rotation,
   screen capture/recents, logout, account switching and CRUD on a device.
7. Verify Arabic/RTL and complete native English/French before claiming mobile
   language parity. Advanced AI, receipt extraction, portfolio editing, PDF/XLSX
   exports and mobile push remain outside the implemented native foundation.

Revisit unresolved release gates by **2026-10-20**; urgent dependency and production
privacy/control items require review by **2026-10-16**. These dates are review
requirements, not scheduled automations or approved risk waivers.

Reference guidance: [Expo screen capture](https://docs.expo.dev/versions/latest/sdk/screen-capture/),
[React Native security](https://reactnative.dev/docs/security),
[Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
[Supabase sign-out](https://supabase.com/docs/reference/javascript/auth-signout).
