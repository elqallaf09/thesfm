# SFM TV: Gulf data recovery and native TV development

## User-visible changes

The TV Gulf scene currently receives missing readings for all ten selected listings. The existing verified primary provider remains preferred. A TV-only fallback now uses the platform's Yahoo Finance history transport for qualified Kuwait, Saudi, Qatar and Dubai listings. Every fallback must match the requested symbol, source exchange code, equity instrument type and currency. Kuwait's explicit KWF denomination is converted from fils to KWD; KWD responses are not converted again.

Source requests confirmed usable metadata for the four configured Kuwait stocks, Saudi Aramco, QNB Qatar and Emaar Dubai. The Dubai listing is explicitly qualified as DFM before mapping the legacy `.DU` identity to Yahoo's `.AE` identity. ADX/FAB, Bahrain/NBB and Oman/Bank Muscat are not guessed: the inspected secondary responses were absent or identified an incompatible instrument. These three remain dependent on usable primary-source coverage. The update does not claim complete Gulf coverage.

The original source observation and receive timestamps are preserved. Daily change requires the previous daily close, never the start-of-range baseline. Closed status requires a source-published session end and a quote observed at or after that end; merely waiting until after the session cannot relabel an old intraday print as a closing price. Future, obsolete, mismatched and malformed data are rejected. A source-wide 429 stops queued fallback work, while successful prices continue to use the existing verified listing cache. The SFM engine's provider policy is unchanged.

The brief distinguishes loading, request failure and an empty selection. It no longer constructs `0 / 0` metrics from a missing response, and an empty sample does not imply a rolling 24-hour basis. Explicit retry can recover from a transient network/503 failure immediately; HTTP 429, server Retry-After and successful snapshot provider cooldowns still block repeated refreshes.

Remote navigation prefers candidates aligned on the same row/column. Focus recovery also observes hidden/disabled/inert changes, so a removed or hidden control does not strand the remote focus.

## Native TV client

`apps/markets-tv-native` is an isolated Expo/React Native TV project for Android TV and Apple TV. It provides public scenes, quote detail modals, a sample brief, AR/EN/FR, native focus guides, visible focus states, Back/Menu handling and play/pause-controlled scene rotation. It reads the existing TV API and has no provider credentials or fabricated prices.

The native client is an initial increment, not a parity replacement: pairing, private watchlists, history charts, news and persisted preferences remain implemented in the existing client. The native package identity is separate from both existing Android identities. Its README documents all three requested React Native TV skills and the release gates.

## Build and release boundaries

The native config generates one tvOS target with tvOS 17 deployment settings and TV brand assets, plus an Android TV launcher/banner. Both use Hermes and the TV runtime's New Architecture. Native CI validates types, platform generation and Hermes exports; optional manual jobs compile an Android test APK and an unsigned Apple TV simulator application. These jobs do not submit to stores. Physical Apple TV signing, provisioning and device validation remain required.

The existing Java Android host now accepts an all-or-nothing permanent release-signing configuration. Its explicit verification task fails if signing is missing. The APK audit script verifies signature, package, TV launcher, alignment and the expected certificate, and rejects Android Debug certificates for official distribution. Default CI Release outputs remain unsigned when no release key is configured; they must not be distributed as signed releases.

No production merge, production promotion, store submission or new certificate creation is part of this development change. Publishing requires the user's separate approval. After approval: merge the verified change, verify the Gulf scene on production, then build/sign the intended Android distribution with its matching permanent key and test installation/update on the target devices. Apple TV device distribution follows its own signing and device-test gates.
