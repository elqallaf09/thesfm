# Android 0.2.1 candidate — independent native workspaces

The Expo application produces three APKs with the existing package identities.
Version code 3 updates version codes 1/2 when signed with the same private key.
The 0.2.1 candidate has compiled bundles, not newly signed APKs.
`orientation: default` allows portrait and landscape. Safe-area-context reserves
system bars/cutouts; the main tab bar becomes a side rail in landscape.

All buttons in the app now navigate to React Native screens. No feature button
calls Linking.openURL, opens a browser, or embeds the website. Product shortcuts
are separate: personal finance, investor tools, and business operations.

## Implemented screens

- Finance: income, expenses, savings, goals and debts; create, view, edit, delete,
  search, and pagination. Goal metadata remains compatible with the website.
- Business: projects with steps, customers, suppliers, invoices with customer
  selection, sales, operating expenses, employees and salary details. Forms use
  the existing database columns and preserve business role restrictions.
- Investor: authenticated saved watchlist and price alert conditions, public
  instrument directory, source-labelled quote details, shariah classifications,
  news summaries, and read-only existing portfolio positions.
- Account: profile name/default currency, password update, local sign-out, and
  explicit sign-out from all devices.
- Reports: current account summary and native share action. The month review is
  a review screen, not an accounting close transaction.
- Zakat: an offline cash calculator with user-entered nisab and explicit hijri
  year completion. It does not guess nisab or market prices.

## Data and security

The app uses the publishable Supabase key plus the authenticated user's token.
RLS remains the authority; no service key is embedded. The 0.2.1 candidate adds
restrictive business-role/related-record policies in an append-only migration.
Every record request also filters by the verified account's ID.
Mutation fields are allowlisted by resource. A successful HTTP response with
no returned record is treated as failure, not a successful save.
Refresh and SecureStore writes are serialized across concurrent screens; a late
refresh cannot resurrect a signed-out session or replace a newer login.
Every native account request checks the server MFA decision first. Deploy
`/api/mobile/session` before distributing 0.2.1: an unavailable gate fails closed.
MFA challenge entry is not implemented; accounts requiring MFA are explicitly
blocked in the native candidate. This app check does not replace database-level
MFA enforcement for callers using the Supabase REST API directly.
Android backup and unnecessary overlay/storage/microphone permissions are
disabled. Screen capture/app-switcher shielding needs verification on a device. Session keys are unchanged
for Finance and Business; Investor has its own SecureStore key.
No account records are persisted offline, and missing amounts are not fabricated.

## Scope still requiring separate implementation

This release does not claim full website feature parity. Portfolio editing,
advanced AI analysis, receipt extraction, elaborate feasibility documents,
PDF/XLSX report generation, and phone push delivery are not implemented.
Saved price conditions are managed in-app but do not imply background push
notification delivery. Customer/goal pickers show up to 100 choices; record
lists paginate in groups of 100. News displays provider summaries, not full
publisher articles. UI copy is currently Arabic; complete English/French mobile
localization is separate from the website's aligned translation catalog.

## Validation

Run the mobile TypeScript check from this directory. Root Vitest includes
`mobileNativeRecords.test.ts`, `mobileNativeApi.test.ts`, and existing mobile
summary/presentation tests. They cover product boundaries, role denial, owner
filters, numeric/date validation, goal roundtrips, currency separation, internal
back navigation, returned-record checks, and concurrent token refresh.

Build with Expo prebuild and Gradle assembleRelease. Supply signing secrets
from private environment variables; generated android output is ignored.
Verify package ID, version code, signer certificate, bundled product config,
release/debug flag, zip alignment, and portrait/landscape on a device/emulator.
Authenticated production writes require a test account and are not performed
using the owner's real records during automated build validation.

See [the October security review](../../docs/security/2026-10-14-mobile-web-review.md)
for production findings, unapplied migrations, dependency exceptions requiring
review, and device/signing release gates.
