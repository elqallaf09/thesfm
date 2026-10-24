# Mobile feature parity — Finance / Investor / Business

Status: implementation workstream; not a release approval.

## Product and platform map
- Finance: `apps/sfm-finance/android`; iOS native target; `apps/expo-go` finance configuration.
- Investor: `apps/sfm-investor/android`; iOS native target; `apps/expo-go` investor configuration.
- Business: `apps/sfm-business/android`; iOS native target; `apps/expo-go` business configuration.
- Keep three independent application IDs and product-specific navigation, with a shared authenticated backend.

## Verified gaps from current repository documentation
- Investor native Android currently exposes a public market directory; authenticated holdings, alerts, and AI require scoped mobile API contracts.
- Business native Android establishes projects, clients, invoices surfaces; live authenticated business features need dedicated APIs.
- Finance native Android already has Compose RTL and Keystore session; parity needs screen-by-screen verification.
- Expo Go does not validate Swift/Kotlin native builds or store signing.

## Acceptance criteria
1. Inventory web routes and app screens per product, marking each as implemented, partial, or absent; verify with code, not screenshots alone.
2. Implement product-specific navigation, deep links and in-app routing; external browser only for explicitly external destinations.
3. Authenticate against existing account/session system, enforce server-side authorization and tenant isolation; never embed privileged keys.
4. Match web features with mobile-appropriate screens, localized AR/EN/FR, RTL, dark/light themes, accurate live data and clear unavailable states.
5. Test Android Play/Huawei and iOS independently on phones and tablets, portrait/landscape, offline/retry, session refresh and accessibility.
6. Run typechecks, tests, security review and signed build validation before any merge or release.

## Execution order
1. Inventory web-to-mobile parity by feature and route.
2. Shared auth/API contracts and navigation shell.
3. Finance feature parity.
4. Investor holdings, watchlists, alerts, analytics and market data parity.
5. Business projects, clients, invoices and related workflows.
6. Device QA, release builds and staged rollout.

No claim of completed feature parity until each criterion is tested.

## Implementation checkpoint — 2026-10-24

- Preserved the six original workstream commits and merged the dependency update from main (`857eb8fb`).
- Added 17 shared record contracts, strict mutation validation, cursor pagination, account/profile/subscription APIs, and an authenticated native manifest. Requests use the user's bearer token and existing RLS; ownership and business-role permissions are enforced on the server.
- Replaced browser shortcuts and device-only Investor watchlists in the Expo runtime with native account-backed record screens. Added shared renewable sessions, late-response invalidation, encrypted chunk storage, device lock, AR/EN/FR UI, adaptive navigation, product deep links, and light/dark/system appearance.
- Connected the existing Kotlin products through a shared native activity/session implementation, preserving application IDs and the previous encrypted session format. Added the SwiftUI record workflow to all three existing targets, including Investor Keychain authentication.
- Added `.github/workflows/mobile-native.yml` for Android Play/Huawei, iOS simulator builds, and all three Expo configurations.
- Generated the complete source route inventory in `docs/mobile-parity-inventory.md` (207 web routes). Basic record CRUD is explicitly marked partial; advanced website parity is still open.
- Focused validation: 63 mobile tests passed; Expo Android and iOS bundle exports and TypeScript checks passed. A read-only production RLS transaction returned zero foreign-owner rows across eight core tables. Full native compilation, device QA, signed distributions, and full-suite reruns are still in progress.

External requirements remain: authenticated QA accounts, signing continuity/store credentials, Expo authentication, Google redirect configuration, and verified device testing. Never describe an Expo export as a signed APK or IPA.
