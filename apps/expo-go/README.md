# THE SFM mobile apps in Expo Go

This project runs three phone products in Expo Go: Finance, Investor, and Business. It selects the product through `SFM_PRODUCT`, while the production configuration keeps separate application IDs.

## First run

1. Copy `.env.example` to `.env` and supply the public Supabase URL and anonymous key for Finance. Never add a service-role, payment, or market-provider secret.
2. Run `pnpm install` from this folder. This app has its own pnpm workspace and lockfile.
3. Start the desired product:

```text
pnpm start:finance
pnpm start:investor
pnpm start:business
```

Scan the QR code with Expo Go on iPhone or Android. If the phone cannot reach the computer on the same network, use the matching tunnel command, for example `pnpm start:investor:tunnel`.

## Important limits

- Expo Go is for fast device testing. It cannot test the Swift/Kotlin source targets, Apple TV, Android TV, LG webOS, Samsung Tizen, store signing, or custom native modules.
- Use the EAS profiles in `eas.json` to create an installable review/production build for each phone product after configuring Expo/EAS credentials.
- THE SFM TV is deliberately excluded from Expo Go: it remains a device-specific TV product, with native Android/Huawei and Apple TV targets plus LG webOS and Samsung Tizen packages.
- The `uuid` advisory is fixed with a scoped `11.1.1` override for Expo's Xcode parser. `pnpm audit` still reports two high-severity advisories (`node-forge` and `braces`) within the Expo/Metro developer tooling; their official advisories list no patched release. They are not part of the phone bundle. Do not suppress them: retest after Expo publishes a compatible repair.
- `pnpm validate` checks TypeScript, the frozen lockfile, and an Android Expo export. `pnpm check:expo-updates` reports the latest Expo SDK patch; the project intentionally waits for the repository's supply-chain age policy before adopting a same-day upstream package release.
