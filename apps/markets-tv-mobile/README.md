# SFM TV for iPhone and iPad

Standalone Expo app for the published SFM TV experience at `https://www.the-sfm.com/tv`.
The app uses React Native WebView for the existing markets, news, watchlist, pairing,
and investments interface. It is separate from the tvOS app and the three finance apps.

The native shell provides safe-area handling, portrait/landscape support, back/home/
refresh controls, loading timeout and retry, and Arabic/English/French presentation.
Only HTTPS links on the two exact SFM hosts navigate inside the app. Other HTTPS links
open in the system browser. Invalid schemes and credentials in URLs are rejected.
The page-to-native bridge accepts only validated theme/language messages.

## Run or upload

Use Node 22.13+ and pnpm 11.1.3 in this directory:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm export:ios
pnpm start
```

For Expo Go, scan the terminal QR code on the iPhone on the same network. For the
cloud iOS build on Windows, open `Start-TestFlight.cmd`. It validates the app, logs
in to Expo, initializes the dedicated project if necessary, and starts:

```sh
npx eas-cli@27.9.0 build --platform ios --profile testflight --auto-submit
```

The mobile client is linked to the Expo project `@elqallaf09/sfm-tv-mobile`.
The TestFlight profile submits to the **SFM TV Mobile** iOS app in App Store
Connect (Apple ID `6837378137`, bundle ID `com.thesfm.marketstv.mobile`).
The generated iOS target supports both iPhone and iPad.

After Apple finishes processing, enable the build for the internal TestFlight
group and accept the **SFM TV Mobile** invitation on the device. The Apple TV
invitation opens the tvOS build.

## Validation boundaries

Web content follows the published site, so web-only PRs must be deployed before
their UI changes appear here. The icon uses the approved emerald SFM mark from
PR #362. This package does not fabricate prices or provide offline market data.

Navigation/bridge unit tests and CI typecheck/export/iOS project generation cover
the app shell. A real signed iPhone build still needs testing: cookies and pairing,
private investments, portrait/landscape on small screens, light/dark transitions,
news links, loading failure/retry, and the existing site's one-time introduction.
Startup audio remains subject to iOS user-gesture playback rules.
