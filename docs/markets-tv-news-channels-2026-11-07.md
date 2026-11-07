# SFM TV news channels

Extends the five-channel receiver with the twenty additional news sections requested in the supplied website menu. Existing channel numbers 01–05 remain unchanged. The receiver now has 25 channels, shown as five pages of five buttons; page controls browse the guide without loading its feeds. ChannelUp/ChannelDown cycle all channels and 1–5 still select the original channels. Selected channels and custom presets survive reload and device-settings synchronization.

The new sections are Europe, Gulf, Asia, crypto, Federal Reserve, energy, metals, healthcare, new listings, stocks under $1, earnings/results, analysts, mergers/acquisitions, unusual moves, banking, Sharia, growth, defensive, cyclical and high-income stocks. Technology and Kuwait retain their existing scoped feeds.

Each new channel reads the corresponding existing public website endpoint. This preserves the website's issuer matching, under-$1 quote verification and Sharia catalog screening rather than reimplementing financial classifications on the TV. Only the selected feed loads; its subscription is cancelled on channel change. News refresh remains three minutes, bounded headline pages advance every 40 seconds, and pause/visibility/provider-backoff behavior is retained. An empty section remains empty. Source publication time, successful-update time and partial/stored coverage are distinct. Unknown Sharia status stays unknown; it is displayed with each headline, alongside needs-review, non-compliant and source-compliant results.

The payload adapter checks topic/category markers, rejects invalid publication evidence and unsafe links, and deduplicates source URLs. Native CORS adds GET and GET preflight only for the fixed public news paths. No account endpoint, financial write, device-token scope, cookie credential grant or schema changes are introduced. New channel labels and status copy include Arabic, English and French.

## Verification and release

Unit coverage checks channel persistence/order, feed routing, malformed/cross-scope responses, screening statuses and the native read-only boundary. Packaged browser coverage visits all twenty additions in all three languages at 960×540 and 1920×1080, checks visible controls/news, retained selection, CH navigation, exact page timing and pause. The complete existing packaged suite also covers hours, countdowns, private portfolio boundaries and other receiver screens. Final check results and deployment SHA are recorded on the pull request.

Read-only production probes on 7 November returned real stories from nineteen new sections; the Sharia feed returned an honest empty list. The first growth request timed out; a subsequent request returned 24 stories in 8.8 seconds from the website's explicitly reported fallback watchlist. Source delays/availability are not claims of live exchange entitlement. Some section requests took 25–40 seconds on the first uncached load. News updates retain the website's own provider and cache limits.

Android source advances to 1.0.14 / versionCode 20. The separate Huawei test artifact preserves build 19's package and signing certificate, with the unchanged native shell and fresh client assets. Signature, alignment, DEX continuity and embedded-file equality are required before delivery. Native news reads require this release's CORS changes to be deployed before installing the new client.

Rollback is the previous immutable production deployment dpl_3rg65Av2cn6PqUMiBetBiXymppHo at cfc3184ab3f0da578caaeae63871c3421a8f9355 and the signed Huawei build 19. No database rollback is involved. Physical-TV testing, real owner holdings, production RUM and alert-routing evidence remain the previously recorded gaps; browser tests do not satisfy those controls.
