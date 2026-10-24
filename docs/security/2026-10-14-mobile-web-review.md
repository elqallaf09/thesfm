# Finance, Investor, Business and website security review — 2026-10-14

Status: **development candidate; not approved for production or app distribution**.
Scope: PR #301 plus main through `322779253c7b38b930da05815770545a5f8c67cb`.
The three applications are `com.thesfm.finance`, `com.thesfm.investor`, and
`com.thesfm.business`. The candidate version is 0.2.1 / Android versionCode 3.
No customer financial record was created, edited or deleted during this review.
No new production database migration, APK distribution or website deployment
was performed. Seven proven migration ledger identities were repaired as recorded
in [the reconciliation evidence](../infra/supabase-ledger-2026-10-14.md); their SQL
was not replayed. The market-data entitlement setup from PR #302 is unchanged.

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
| Native password login did not challenge enrolled MFA before direct account API use | High; native flow and database enforcement prepared, **not deployed** | Native TOTP/email challenges keep first-factor tokens in memory, recheck server assurance before persistence and reject cancelled/stale replies. Server-only, expiring email proof is bound to user and Supabase session. Restrictive RLS and seven SECURITY DEFINER RPC guards prevent direct-REST bypass once deployed. Own-profile SELECT remains available for login decisions. Authenticated device QA is still required. |
| Android backup enabled and unnecessary overlay/external-storage permissions present in 0.2.0 | Hardening; candidate configuration changed | Backup disabled; overlay, microphone and legacy storage permissions blocked. Screens use capture prevention and an app-switcher shield. Physical-device verification is pending. |
| Public mobile build variables could accept a server key or non-HTTPS endpoint | High impact if misconfigured; fixed in candidate | Configuration rejects non-public Supabase key formats and non-HTTPS/non-origin URLs without echoing values. Product identities are tested separately. |
| Vulnerable development/build dependencies | See audit below | Published fixes installed and lockfiles refreshed. The two remaining registry advisories have local reproducible backports with installed-package regression checks; raw findings remain visible. See the exact scope below. |

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
- The production ledger contained 152 entries. Seven version aliases were proven
  byte-for-byte identical to repository SQL, backed up and repaired atomically.
  Read-back confirmed seven canonical identities, no old aliases and unchanged
  SQL hashes. Ten historical gaps and four candidate migrations remain; the
  strict drift check is deliberately unchanged. See the
  [per-migration disposition](../infra/supabase-ledger-2026-10-14.md).

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

No published fixed versions were available when checked. Both workspaces now use
pnpm `patchedDependencies` with lockfile-bound hashes:

- `braces@3.0.3`: bound parser and recursive AST traversal depth, including
  parentheses, malformed input and caller-supplied ASTs. Ordinary globs, escaped
  braces and quoted braces retain their behavior.
- `node-forge@1.4.0`: reject unconsumed children inside DigestAlgorithm, following
  the nested-length fix in [upstream PR #1152](https://github.com/digitalbazaar/forge/pull/1152).
  Valid RSA SHA-256 signatures with optional NULL parameters pass; nested/trailing
  garbage and duplicate parameters are rejected. This is a local backport,
  not a claim that the upstream PR has shipped.

`scripts/test-security-patches.mjs` exercises the actually installed modules and
rejects unpatched lockfile edges. `scripts/audit-security-backports.mjs` retains
unfiltered registry JSON, requires those checks and fails for all critical or
unrecognized high findings. **Raw registry results remain 1 high for the website
and 2 high for Expo**; they are not reported as zero or hidden with audit ignores.
Fresh frozen installs and the regression checks passed for both workspaces.
Review the backports by **2026-10-16** and replace them only with verified upstream
releases that pass the same tests. No risk waiver is granted by this document.

Vitest/UI/coverage moved together to 4.1.11 and ESLint to 9.39.4; compatible
transitive fixes are pinned. Vite's automatic JSX transform is explicit for
Vitest. The universe-filter test now reuses one catalog without changing its
assertions or timeout. ESLint warning allowances decreased where debt was removed.

## Verification evidence and limits

- Frozen root/mobile installs passed. Website and mobile TypeScript checks passed
  during development; required final-head CI remains authoritative.
- Full local follow-up Vitest run: **501 files passed, 5 skipped; 4,003 tests
  passed, 23 skipped**. The 43 focused mobile/email/session tests also passed.
  Earlier engine suite: **102 passed**; exact-head CI reruns the required gates.
- Final website build and performance budgets passed locally; website/mobile
  TypeScript, lint, translations, API policy and public-env guards passed.
- The complete **166-file migration chain** and five SQL suites passed in an
  isolated PGlite PostgreSQL runtime using the repository bootstrap. Suites cover
  business role denial, owner/reference isolation, private storage boundaries,
  month-close/collaboration, expanded platform authorization and enrolled MFA.
  MFA cases include direct reads/writes, RPCs, cross-session proofs, expiry,
  revocation, forged evidence, TOTP priority and first-factor flag changes. CI additionally
  applies the chain to disposable PostgreSQL 17.
- Three Android and three iOS Hermes bundles compiled. Android prebuild succeeded
  for all three product configurations, including identity/version/backup and
  permission checks. These are compilation checks, **not** successful APK builds,
  signed releases, emulator launches or physical-device tests of 0.2.1.
- A separate Android runtime workflow builds emulator-only APKs with a test
  certificate, installs/launches/rotates/relaunches each product and checks
  version, backup flag and crash logs. It publishes evidence only. Its presence
  is not evidence of a passing run. It never replaces original signing or
  authenticated physical-device testing; no paid EAS build was started.
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
approved signing workflow so updates remain compatible. The signed-in Expo
credential pages for Finance, Investor and Business displayed no Android
application credentials on 14 October; all three had iOS bundle identifiers.
No private key was read, exported or replaced. This observation does not prove
that the original Android keystore does not exist elsewhere.

## Required deployment and review order

1. Keep PR #301 draft until exact-head CI, code-owner review and the release gates
   in `docs/release/release-checklist.md` are satisfied. No permission/CI bypass.
2. Finish the ten historical migration dispositions. Do not bulk-mark financial
   verification or catalog seeds as applied; preserve customer records and
   market availability. Seven identity aliases are already repaired.
3. Apply the additive `20261014180745_record_verified_email_mfa_sessions` table
   through the reviewed migration path before deploying handlers that use it.
   Deploy web/email challenge handlers, the attachment reader and mobile session
   endpoint. The email flow fails closed if its table is missing.
4. Verify the web/native handlers with disposable accounts, including TOTP/email,
   expired/revoked sessions, two-user files, role changes and offline transitions.
   Then apply the candidate business, private-storage and enrolled-MFA restrictive
   migrations. Verify direct REST and RPC denial and owned authenticated reads.
   Never roll back to public buckets or disable MFA to work around a failure.
5. Enable leaked-password protection through authorized Supabase Auth settings.
   The current dashboard sign-in wall remains unresolved; no setting was changed.
6. Review local dependency backports and exact-head CI. Build distribution APKs
   with the existing private signer and test upgrade, rotation, screen capture,
   recents, logout, account switching and CRUD on physical devices. The Expo
   account has exhausted included build credits; no paid build is authorized here.
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
