# Market flags

The offline image contains 70 country flags from [lipis/flag-icons](https://github.com/lipis/flag-icons), pinned at `ac7e0eb3259eb62aa6100c435607e2fe03896a97`, under the included MIT license. Country artwork keeps its original colors independently of the app theme.

Regenerate the lossless WebP atlas with `node scripts/build-market-flags.mjs` after installing root dependencies. The 160×120 cells use ten columns and seven rows in the same country order as `TvMarketFlag.tsx`. The single bundled image avoids 70 separate requests and remains available offline.
