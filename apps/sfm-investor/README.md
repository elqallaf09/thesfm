# THE SFM Investor for Android and Huawei

This is a separate native market-discovery app with the store identifier `com.thesfm.investor`.

- `playDebug` and `playRelease` are for Google Play.
- `huaweiDebug` and `huaweiRelease` have no Google Mobile Services dependency and are for AppGallery.
- The first screen reads only the public market directory. Authenticated holdings, alerts, and AI analysis require separate narrow mobile APIs; no provider or service secret is embedded here.

Supply `-PSFM_API_BASE_URL=https://www.the-sfm.com` during release builds. Signing and device validation are intentionally external to source control.
