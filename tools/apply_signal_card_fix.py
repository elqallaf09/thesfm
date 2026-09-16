from __future__ import annotations

import subprocess
from pathlib import Path
from textwrap import dedent

SOURCE_COMMIT = "e3392f51facb767941c7909a210e822e90696973"
SOURCE_PATH = ".github/workflows/apply-signal-card-fix.yml"


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True)


text = run("git", "show", f"{SOURCE_COMMIT}:{SOURCE_PATH}")
script = dedent(text.split("        run: |\n", 1)[1])

# Preserve the already-authored client evidence helper/CSS/app/index mutations, but
# replace stale backend exact-match edits with edits for the current main tree.
route_start = script.index("replace('src/app/api/recommendations/route.ts'")
app_start = script.index("replace('src/trader-app/public/app.js'", route_start)

backend = r'''replace('src/lib/trader/marketQuotes.ts',
  "import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';",
  "import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';\nimport { resolveYahooSessionQuote } from '@/lib/market/yahooSessionQuote.mjs';")
replace('src/lib/trader/marketQuotes.ts',
  "  marketTime: string | null;\n};",
  "  marketTime: string | null;\n  volume: number | null;\n};")
replace('src/lib/trader/marketQuotes.ts',
  "  volume?: number | null;\n  currency: string | null;",
  "  volume?: number | null;\n  technicalTrend?: 'bullish' | 'bearish' | 'neutral' | null;\n  currency: string | null;")
replace('src/lib/trader/marketQuotes.ts',
  "    volume: quote.volume ?? numberOrNull(raw.volume ?? raw.regularMarketVolume ?? raw.averageVolume),",
  "    volume: quote.volume ?? numberOrNull(raw.volume ?? raw.regularMarketVolume),")
replace('src/lib/trader/marketQuotes.ts',
  "    volume: numberOrNull(record.volume ?? record.regularMarketVolume ?? record.averageVolume),",
  "    volume: numberOrNull(record.volume ?? record.regularMarketVolume),")
replace('src/lib/trader/marketQuotes.ts',
  "  const price = numberOrNull(meta.regularMarketPrice) ?? (closes.length ? closes[closes.length - 1] : null);\n  const previousClose = numberOrNull(meta.chartPreviousClose)\n    ?? numberOrNull(meta.previousClose)\n    ?? (closes.length >= 2 ? closes[closes.length - 2] : null);\n  const marketTime = numberOrNull(meta.regularMarketTime);",
  "  const price = numberOrNull(meta.regularMarketPrice) ?? (closes.length ? closes[closes.length - 1] : null);\n  const session = resolveYahooSessionQuote(meta, timestamps, quote);\n  const previousClose = session.previousClose;\n  const marketTime = numberOrNull(meta.regularMarketTime);")
replace('src/lib/trader/marketQuotes.ts',
  "    history,\n    marketTime: marketTime ? new Date(marketTime * 1000).toISOString() : null,",
  "    history,\n    volume: session.volume,\n    marketTime: marketTime ? new Date(marketTime * 1000).toISOString() : null,")
replace('src/lib/trader/marketQuotes.ts',
  "    previousClose: normalizedQuote.previousClose,\n    currency,",
  "    previousClose: normalizedQuote.previousClose,\n    volume: chart.volume,\n    currency,")
replace('src/lib/trader/marketQuotes.ts',
  "    technicalSummary: recommendation.technicalSummary,",
  "    technicalSummary: recommendation.technicalSummary,\n    technicalTrend: indicators.ema50 !== null && indicators.ema200 !== null\n      ? (indicators.ema50 > indicators.ema200 ? 'bullish' : indicators.ema50 < indicators.ema200 ? 'bearish' : 'neutral') : null,")
'''

script = script[:route_start] + backend + script[app_start:]
script = script.replace(
    "rm -f .github/workflows/apply-signal-card-fix.yml",
    "rm -f .github/workflows/apply-signal-card-fix.yml .github/workflows/signal-card-repair.yml tools/apply_signal_card_fix.py",
    1,
)
Path("/tmp/apply-signal-card-fix.sh").write_text(script)
subprocess.run(["bash", "/tmp/apply-signal-card-fix.sh"], check=True)
