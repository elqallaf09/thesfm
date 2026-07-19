# Phase 6.3 — AI Analyst and Market Intelligence Consolidation

## Decision record

`/ai-analyst` is the only global AI Analyst entry. Its labels are:

| Locale | Label |
| --- | --- |
| Arabic | إس إف إم المحلل الذكي |
| English | SFM AI Analyst |
| French | Analyste IA SFM |

The global link opens `/ai-analyst/overview`; `/ai-analyst` redirects there. The
workspace has grouped internal navigation rather than a second global product
navigation or a flat tab row.

The pre-existing `/thesfm-trader-own/*` terminal remains a protected
compatibility product while parity is validated. It is not linked from the
global navigation, is not embedded in the public workspace, and is not
redirected by this phase. Its `TraderShellPage` iframe stays isolated from the
public React workspace.

## Canonical route map

| Group | Canonical route | Access |
| --- | --- | --- |
| Analysis | `/ai-analyst/overview` | Public shell |
| Analysis | `/ai-analyst/analyze` and `/ai-analyst/analyze/[symbol]` | Public; Phase 6.1 canonical intelligence result only |
| Analysis | `/ai-analyst/compare` | Public architecture state |
| Analysis | `/ai-analyst/agent` | Public architecture state |
| Analysis | `/ai-analyst/path` | Sign-in gate; Phase 6.2A timeline/history |
| Analysis | `/ai-analyst/history` | Sign-in gate; Phase 6.2A timeline/accuracy |
| Analysis | `/ai-analyst/opportunities` | Public architecture state, no scanner output |
| Markets | `/ai-analyst/market-leadership` | Public verified market directory data |
| Markets | `/ai-analyst/markets` and `/ai-analyst/markets/[market]` | Public verified market directory data |
| Markets | `/ai-analyst/markets/sessions` | Public sessions presentation |
| Markets | `/ai-analyst/markets?view=map` | Public truthful unavailable state until a verified map source exists |
| Monitoring | `/ai-analyst/watchlist` | Sign-in gate; RLS-backed saved assets |
| Monitoring | `/ai-analyst/portfolio` | Sign-in gate; existing RLS-backed investment items |
| Monitoring | `/ai-analyst/alerts` | Sign-in gate; RLS-backed price-alert rules |
| Monitoring | `/ai-analyst/recommendations` | Sign-in gate; canonical intelligence results only |
| Monitoring | `/ai-analyst/trade-performance` | Sign-in gate; stored portfolio performance fields only |
| Knowledge | `/ai-analyst/news` | Public, source-linked news only |
| Knowledge | `/ai-analyst/calendar` | Public, existing verified calendar adapter without diagnostics |
| Knowledge | `/ai-analyst/education` | Public, non-directional education |
| Configuration | `/ai-analyst/settings` | Sign-in gate; no provider/model/automation control |

Provider diagnostics, data-quality controls, model controls, audit, and
observability remain in role-protected administrative routes under
`/sfm-admin-control/*`; they are not rendered in the public overview.

## Migration matrix

### Existing React aliases

| Legacy route | Canonical destination | Reused component/data adapter | Access | Redirect status | Validation |
| --- | --- | --- | --- | --- | --- |
| `/market-analysis` | `/ai-analyst/market-leadership` | Verified market directory surface | Public | Client compatibility redirect | Unit + Playwright |
| `/market-analysis?symbol=…` | `/ai-analyst/analyze/[symbol]` | Phase 6.1 `AiAnalystAnalysis` | Public | Client compatibility redirect | Unit + Playwright |
| `/market-analysis?tab=calendar` | `/ai-analyst/calendar` | `EconomicCalendarPanel` composition | Public | Client compatibility redirect | Unit |
| `/market-analysis?tab=sessions` | `/ai-analyst/markets/sessions` | `TradingSessionsPanel` composition | Public | Client compatibility redirect | Unit |
| `/market-analysis?tab=news` | `/ai-analyst/news` | Safe market-news adapter | Public | Client compatibility redirect | Unit |
| `/market-analysis?tab=watchlist` | `/ai-analyst/watchlist` | RLS `market_watchlist` adapter | Sign-in gate | Client compatibility redirect | Unit + Playwright |
| `/market-analysis?tab=alerts` | `/ai-analyst/alerts` | RLS `market_price_alerts` adapter | Sign-in gate | Client compatibility redirect | Unit |
| `/market-analysis?tab=comparison` | `/ai-analyst/compare` | Existing compare architecture | Public | Client compatibility redirect | Unit |
| `/market-analysis?tab=traderTools` | `/ai-analyst/overview?legacy=market&tab=traderTools` | Retained React compatibility workspace | Authenticated/guest compatibility only | Retained; no global/internal link | Existing command-center Playwright |
| `/market-agent` | `/ai-analyst/agent` | Existing future agent architecture | Public | Client compatibility redirect | Unit + Playwright |
| `/symbol-details/[symbol]` | `/ai-analyst/analyze/[symbol]` | Phase 6.1 analysis + chart/timeline | Public | Client compatibility redirect | Unit + Playwright |
| `/watchlist`, `/market-watchlist` | `/ai-analyst/watchlist` | RLS `market_watchlist` adapter | Sign-in gate | Client compatibility redirect | Unit + Playwright |
| `/alerts`, `/market-alerts` | `/ai-analyst/alerts` | RLS `market_price_alerts` adapter | Sign-in gate | Client compatibility redirect | Unit + Playwright |

Safe query parameters and approved client-visible fragments are preserved by
the shared compatibility mapper. Unsafe redirect controls and OAuth/recovery
fragments are dropped. The mapper does not double encode destinations.

### `/thesfm-trader-own/*` terminal compatibility routes

| Legacy route(s) | Intended canonical destination | Reuse decision | Access | Redirect status | Parity status |
| --- | --- | --- | --- | --- | --- |
| `/thesfm-trader-own` | `/ai-analyst/market-leadership` | Existing terminal root still resolves to its dashboard | Terminal-approved user | Retained terminal redirect | Partial; terminal dashboard remains available |
| `/thesfm-trader-own/dashboard` | `/ai-analyst/market-leadership` | Verified directory leadership surface | Terminal-approved user | Retained | Partial; terminal dashboard remains available |
| `/thesfm-trader-own/markets`, `/thesfm-trader-own/markets/[market]` | `/ai-analyst/markets` | Safe directory adapter | Terminal-approved user | Retained | Partial; terminal views remain available |
| `/thesfm-trader-own/market-analysis`, `/thesfm-trader-own/market-analysis/[market]` | `/ai-analyst/analyze` | Canonical analysis is used for new public flows | Terminal-approved user | Retained | No terminal analysis redirect until parity review |
| `/thesfm-trader-own/symbol-details`, `/thesfm-trader-own/symbol-details/[symbol]` | `/ai-analyst/analyze/[symbol]` | Canonical analysis route | Terminal-approved user | Retained | Partial; terminal chart/detail tools remain available |
| `/thesfm-trader-own/watchlist` | `/ai-analyst/watchlist` | RLS watchlist adapter | Signed-in user | Retained | Partial; data parity only |
| `/thesfm-trader-own/portfolio` | `/ai-analyst/portfolio` | Existing `useInvestments` data adapter | Signed-in user | Retained | Partial; no new aggregate fabricated |
| `/thesfm-trader-own/alerts` | `/ai-analyst/alerts` | RLS price-alert adapter | Signed-in user | Retained | Partial; terminal delivery/settings behavior remains available |
| `/thesfm-trader-own/news` | `/ai-analyst/news` | Safe source-linked news adapter | Public | Retained | Partial; terminal presentation remains available |
| `/thesfm-trader-own/calendar` | `/ai-analyst/calendar` | Existing calendar panel composition | Public | Retained | Partial; terminal presentation remains available |
| `/thesfm-trader-own/education` | `/ai-analyst/education` | Non-directional knowledge surface | Public | Retained | Partial; terminal material remains available |
| `/thesfm-trader-own/settings` | `/ai-analyst/settings` | User-safe settings surface | Signed-in user | Retained | Partial; terminal-specific settings remain available |
| `/thesfm-trader-own/recommendations` | `/ai-analyst/recommendations` | Canonical `RecentAnalysesPanel` only | Signed-in user | Retained | **Quarantined**; no legacy recommendation output is composed publicly |
| `/thesfm-trader-own/trade-performance`, `/thesfm-trader-own/recommendations-history`, `/thesfm-trader-own/positions`, `/thesfm-trader-own/trade-history`, `/thesfm-trader-own/signal-history`, `/thesfm-trader-own/trades` | `/ai-analyst/trade-performance` | Existing portfolio fields only | Signed-in user | Retained | **Not yet parity**; terminal records stay available |
| `/thesfm-trader-own/ai-scanner`, `/thesfm-trader-own/scanner` | `/ai-analyst/opportunities` | Architecture placeholder only | Terminal-approved user | Retained | **Quarantined**; no legacy scanner output is composed publicly |
| `/thesfm-trader-own/ai-analysis`, `/thesfm-trader-own/ai-analysis/[market]` | `/ai-analyst/analyze` | Canonical analysis only for new flows | Terminal-approved user | Retained | Alias retained with terminal |
| `/thesfm-trader-own/app/[[...path]]` | None | Terminal static-app transport only | Terminal-approved user | Retained | Not a public AI Analyst surface |

The table intentionally records destinations without turning them into redirects
before component, RLS, and behavior parity are proved.

## Recommendation-engine boundary

The public workspace uses the Phase 6.1/6.2A intelligence APIs and
`AiAnalystAnalysis` for recommendations, confidence, risk, explainability,
timeline, and outcomes. New market surfaces never call or render the legacy
`recommendationEngine`, market signal endpoint, scanner service, terminal
recommendation endpoint, target, stop-loss, or legacy risk score.

The retained terminal and explicit `legacy=market` adapter are compatibility
surfaces, isolated from the canonical workspace. They are not global or
internal AI Analyst navigation targets. Legacy scanner and directional
recommendation outputs are therefore quarantined rather than duplicated.

## Access and privacy

| Capability | Guest | Signed-in user | Administrator |
| --- | --- | --- | --- |
| Public shell, market directory, sessions, news, calendar, education, canonical analysis | Allowed | Allowed | Allowed |
| Private history, watchlist, portfolio, alerts, personal readings, trade performance, user settings | Clear sign-in gate | Allowed via existing RLS/server authorization | Allowed only under normal role policy |
| Legacy terminal | Not available unless the existing guest compatibility state applies | Existing terminal approval policy | Existing terminal/admin policy |
| Provider/model/audit/observability controls | Not available | Not available | Existing `/sfm-admin-control/*` role protection |

No migration, RLS change, provider credential change, Production data mutation,
or Supabase billing change is part of this phase.

## Operational limits and follow-up

- Market map is explicitly unavailable until a verified data source and
  presentation policy are approved.
- The new trade-performance surface never substitutes a calculated trade
  history, outcome, accuracy rate, or portfolio aggregate for missing verified
  records.
- Terminal-specific features remain compatibility routes until their data and
  behavior parity is validated individually.
- Historical accuracy remains descriptive Phase 6.2A data and does not alter
  live confidence weights.
