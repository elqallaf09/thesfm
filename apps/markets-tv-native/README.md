# SFM Markets TV — native TV client

This Expo client targets Android TV and Apple TV using React Native TV. Version 0.2.1/build 5 includes the native market brief, Kuwait/world atlas with regional stock browsing, and a My Account phone handoff. The shared 26-channel receiver guide preserves the original 25 channel numbers and appends general market news, alongside public stock directories, source news, scheduled market hours, secure device pairing and recorded investment valuations. The new destinations are available directly in the header and in the dynamically paged menu. Source times and unavailable values remain visible, with AR/EN/FR and light/dark themes. Portfolio data refreshes every 15 seconds while visible and is never stored on disk. The active device token and small display preferences use platform SecureStore. Watchlist editing, historical charts and detailed market customization remain in the web/Android client.

The atlas uses pixel-preserving PNG copies of the existing Kuwait panorama and Robinson world artwork. Its pins, regions and clock time zones use the shared atlas contract. My Account displays a bundled, deterministic QR and the fixed `https://www.the-sfm.com/profile` URL. Editing happens on the phone through the existing authenticated profile page, including MFA when required; the TV token is never used for profile editing or placed in a URL. These three assets total less than 1 MiB and need no remote artwork service or additional native dependency.

The menu also offers **Wallpaper / خلفية الشاشة** above the paged channel guide.
Its seven previews use the shared web wallpaper IDs and AR/EN/FR names. Selecting
a tile applies the background immediately and saves it with the existing SecureStore
display preferences. Back/Menu returns to the guide without changing the wallpaper;
selection returns to the current broadcast. Paging, ticker motion and the atlas tour
pause while the gallery is open. The selected tile receives initial remote focus,
and returning to the guide restores focus to its wallpaper shortcut.

The seven PNG assets in `assets/wallpapers/` are lossless RGB conversions of
`public/markets-tv/exchange-panorama.webp` and the six shared files under
`public/markets-tv/assets/wallpapers/`. They total 2.66 MiB, are bundled for offline
use on both TV platforms, and add no native dependency or remote image service.

## Development

Use Node 22.13.0 and pnpm 11.1.3. This directory has an isolated pnpm workspace and lockfile. Its `react-native` dependency aliases the exact `react-native-tvos@0.86.3-0` release, matched to Expo 57.0.27 and React 19.2.3. Do not resolve it to the phone-only React Native dependency from `apps/expo-go`.

```sh
cd apps/markets-tv-native
pnpm install --frozen-lockfile
pnpm typecheck
pnpm prebuild:android
pnpm prebuild:tvos
pnpm exec expo export --platform android --platform ios --output-dir dist/validation
```

The config plugin is permanently enabled for TV. It generates one tvOS Podfile target, tvOS 17 deployment settings, TV icon/top-shelf assets and an Android TV launcher/banner. Hermes and the New Architecture remain enabled by the pinned TV runtime. Native folders and bundles are generated and are not committed. Do not run prebuild inside the existing Java/WebView Android host.

For Android TV, use `pnpm android` with an Android SDK/device. For Apple TV, use `pnpm tvos` on macOS with Xcode and the tvOS SDK/simulator installed. Apple TV builds are native tvOS targets, not WebView wrappers.

## Remote behavior

- Focusable controls use native Pressable focus/blur states.
- TVFocusGuideView remembers focus across navigation controls.
- Menu and pairing dialogs trap focus; Back/Menu closes them before returning to all stocks. Back from region-filtered stocks returns to the map first.
- At the all-stocks root, Back/Menu falls through to the platform.
- Play/Pause toggles 40-second paging; CH+/CH− select channels. Button press/release events do not toggle twice.
- Paging pauses during dialogs, backgrounding and recent user interaction; the map and account screen never rotate away.
- Fetches stop in the background, retain the original source clock on failures and respect source retry times.

The app accepts only the exact public feature links `sfm-tv-native://brief`, `sfm-tv-native://map` and `sfm-tv-native://account`. Queries, fragments, credentials, extra paths and unknown destinations are rejected. Initial links are applied after saved preferences are restored; a newer link received during startup takes precedence. These links navigate to ordinary screens and cannot pair, unlink or authenticate a user.

The Apple bundle is `com.thesfm.marketstv.native`; the native Android package is `com.thesfm.marketstv.tvnative`. Both are distinct from the Java/WebView Android host `com.thesfm.marketstv` and its `.preview` variant. A native debug build does not update those applications.

## Validation and release

The Native Markets TV validation workflow checks types, both generated platforms and both Hermes bundles on pull requests, then compiles Android Debug and tvOS simulator apps. The tvOS job installs and launches the app and captures a screenshot. Neither job uploads to a store. A simulator `.app` cannot be installed on a physical Apple TV. Manual workflow runs compile native artifacts when `compile_native` is selected.

`eas.json` separates internal Android APK/tvOS simulator profiles from production Android AAB/tvOS device profiles. EAS project linking, Apple device signing/provisioning, permanent Android release signing, physical remote testing and store submission are separate release steps. No EAS project/account or store listing is created by these files.

The existing Java Android host can sign Release variants only when all four `SFM_TV_KEYSTORE_PATH`, `SFM_TV_KEYSTORE_PASSWORD`, `SFM_TV_KEY_ALIAS` and `SFM_TV_KEY_PASSWORD` environment variables are supplied. Without them, its CI Release artifacts remain unsigned. `gradle verifyReleaseSigning` fails if signing is absent. Before official distribution, run `scripts/verify-markets-tv-apk.mjs` with the expected permanent certificate SHA-256. The check rejects unsigned files, Android Debug certificates and wrong package identities. Preview testing requires the explicit `--allow-debug` flag.

## Requested skills used

Source: [react-native-tvos/skills](https://github.com/react-native-tvos/skills/tree/a1642fe7990501977b1ce080aa7f5df7f1e0722b/plugins/rntv/skills).

| Skill | Application |
| --- | --- |
| [project-create](https://github.com/react-native-tvos/skills/blob/a1642fe7990501977b1ce080aa7f5df7f1e0722b/plugins/rntv/skills/project-create/SKILL.md) | Isolated Expo TV project and pinned TV runtime alias |
| [specific-features](https://github.com/react-native-tvos/skills/blob/a1642fe7990501977b1ce080aa7f5df7f1e0722b/plugins/rntv/skills/specific-features/SKILL.md) | Focus guides, Pressable focus, modal trapping, BackHandler and TV remote events |
| [build-configuration](https://github.com/react-native-tvos/skills/blob/a1642fe7990501977b1ce080aa7f5df7f1e0722b/plugins/rntv/skills/build-configuration/SKILL.md) | Hermes, New Architecture, a single tvOS target, TV Maven runtime, native validation/build workflow |

References: [Expo TV guide](https://docs.expo.dev/guides/building-for-tv/), [official TV example](https://github.com/expo/examples/tree/master/with-tv), and installed `@react-native-tvos/config-tv` option types.
