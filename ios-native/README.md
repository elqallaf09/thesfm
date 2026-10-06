# THE SFM Finance for iOS

This folder contains the first native iOS product for THE SFM: personal finance.

## Goal

Build a SwiftUI iOS app that uses the existing THE SFM backend, Supabase data, and Next.js API routes without duplicating unstable web logic.

## Current Status

- Native SwiftUI application project.
- App router.
- Email/password Supabase Auth with renewable access and refresh tokens stored in the device Keychain.
- Device lock on return from the background, using Face ID / device passcode.
- A protected native financial summary that returns aggregates only; it never embeds account rows in the client.
- Supabase config placeholder.
- Arabic-first login and personal-finance dashboard.
- No mock financial data.

## Open In Xcode

Open:

```text
ios-native/TheSFM.xcodeproj
```

Then set the bundle identifier and signing team in Xcode before running on a simulator or device.

## Configuration

Set the following build settings in Xcode or the target's generated Info.plist before connecting the app to production data:

- `SFM_SUPABASE_URL`
- `SFM_SUPABASE_ANON_KEY`
- `SFM_API_BASE_URL` (defaults to `https://www.the-sfm.com` in this project)

The anonymous key is a public client key. Do not place a service-role key, provider key, or Stripe secret in this app.

## Next Build Milestone

1. Supply the production Supabase client settings through the release configuration.
2. Build and compare the summary against the web dashboard on an iPhone device.
3. Add native expenses, subscriptions, debts, and investments screens, each backed by a narrowly-scoped protected API.
4. Configure signing, privacy labels, App Store metadata, and device QA.

## Rules

- Do not put AI, market provider, Stripe secret, or service-role keys in the iOS app.
- Keep server-only logic behind existing API routes.
- Keep Arabic as the default language.
- Keep all financial analysis and AI output as informational only.
