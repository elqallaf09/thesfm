# THE SFM Finance for Android and Huawei

Native Android implementation of the personal-finance product. It uses Jetpack Compose with an Arabic RTL-first interface and an encrypted Android Keystore session.

## Store variants

- `play`: Google Play build.
- `huawei`: AppGallery build with no Google Mobile Services dependency.

Both variants intentionally have the same application id: `com.thesfm.finance`. They must be signed and released through their respective store tracks; do not install competing production builds on the same device.

## Configuration

Pass public client settings only at build time. Do not commit them and never pass service-role, provider, or Stripe secret keys.

```text
./gradlew :app:assemblePlayDebug -PSFM_SUPABASE_URL=https://project.supabase.co -PSFM_SUPABASE_ANON_KEY=public-anon-key -PSFM_API_BASE_URL=https://www.the-sfm.com
./gradlew :app:assembleHuaweiRelease -PSFM_SUPABASE_URL=https://project.supabase.co -PSFM_SUPABASE_ANON_KEY=public-anon-key -PSFM_API_BASE_URL=https://www.the-sfm.com
```

HMS Push Kit is a separate follow-up after the AppGallery project, signing certificate, and `agconnect-services.json` are available. The initial Huawei flavor deliberately contains no Google dependency.
