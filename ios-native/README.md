# THE SFM iOS Native

This folder contains the first native iOS foundation for THE SFM.

## Goal

Build a SwiftUI iOS app that uses the existing THE SFM backend, Supabase data, and Next.js API routes without duplicating unstable web logic.

## Current Status

- Native SwiftUI project scaffold.
- App router.
- Auth session placeholder.
- API client foundation.
- Supabase config placeholder.
- Arabic-first login and dashboard shell.
- No mock financial data.

## Open In Xcode

Open:

```text
ios-native/TheSFM.xcodeproj
```

Then set the bundle identifier and signing team in Xcode before running on a simulator or device.

## Configuration

Update these values before connecting the app to production data:

- `TheSFM/Core/Supabase/SupabaseConfig.swift`
- `TheSFM/Core/Networking/APIClient.swift`

Required values:

- Supabase URL
- Supabase anon key
- API base URL, usually `https://www.the-sfm.com`

## First Build Milestone

1. Connect Supabase Auth.
2. Replace the placeholder sign-in action with real login.
3. Read user profile and dashboard totals from Supabase.
4. Compare dashboard totals with the web dashboard.
5. Add expenses, subscriptions, debts, and investments screens.

## Rules

- Do not put AI, market provider, Stripe secret, or service-role keys in the iOS app.
- Keep server-only logic behind existing API routes.
- Keep Arabic as the default language.
- Keep all financial analysis and AI output as informational only.
