# SFM Markets TV — native TV client

This Expo client targets Android TV and Apple TV using React Native TV. It reads the existing public SFM TV scene API and preserves the reported source, observation time, currency and unavailable states. It is an initial native client: public scenes, quote details, sample brief, AR/EN/FR and remote-controlled scene rotation. Account pairing, private watchlists, session charts, news and saved settings remain in the existing web/Android client; they are not implemented here.

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
- TVFocusGuideView remembers focus across the scene menu and quote grid.
- Quote details trap directional focus; Back/Menu closes them before changing scenes.
- At the overview root, Back/Menu falls through to the platform.
- Play/Pause toggles scene rotation; button press/release events do not toggle twice.
- Rotation pauses during details, the brief, backgrounding and recent user interaction.
- Fetches stop in the background, retain the original source clock on failures and respect source retry times.

The native package is `com.thesfm.marketstv.native`, distinct from both the existing production package and `.preview`. This is a development client and does not update either existing application.

## Validation and release

The Native Markets TV validation workflow checks types, both generated platforms and both Hermes bundles on pull requests. Its manual `compile_native` option also builds an Android Debug APK and an unsigned tvOS simulator application. Neither job uploads to a store. A simulator `.app` cannot be installed on a physical Apple TV.

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
