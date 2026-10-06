# THE SFM Investor for iPhone

`TheSFM.xcodeproj` now includes the independent `TheSFMInvestor` target with bundle identifier `com.thesfm.investor` and shared scheme `TheSFMInvestor`.

The first native screen is a public market directory. It does not contain user portfolio data, provider credentials, or investment advice. Holdings, alerts, and AI analysis are intentionally deferred until each one has a protected mobile API contract.

Before App Store release, set a signing team and the `SFM_API_BASE_URL` build setting, test on a physical device, complete privacy metadata, and configure a separate App Store Connect record.
