# The SFM long-page audit

Audit date: 2026-07-11. Complexity is based on source size, section count, data density, and estimated rendered height. Recommendations preserve existing data and business logic.

| Route | Page | Current major sections | Complexity | Recommended structure | Pattern |
|---|---|---|---|---|---|
| `/market-analysis` | SFM Smart Analysis | Search hero, provider/status summary, 10 tool views, analysis result, charts, AI summary, actions | Extreme | Decision summary above a sticky workspace; Analysis, tools, sessions, calendar, news, diagnostics as peer views; indicator/source detail disclosed within its view | Tabs + accordions |
| `/thesfm-trader-own` | Smart Analyzer / Market Overview | Command metrics, overview, leadership, heatmap, movers, recommendations, news, AI and system status | Extreme | Overview first; Market Analysis, Recommendations, Sessions, Heatmap, News Context and Diagnostics as peer views | Tabs + accordions |
| `/thesfm-trader-own/markets` | Markets | Market directory, provider summary, detailed market filters and large symbol table | High | Overview, Data, Filters, Sources and Issues; keep market-family switching close to results | Tabs + collapsible filters |
| `/thesfm-trader-own/recommendations` | Recommendations | Summary metrics, market chips, signal filters, unbounded recommendation cards | High | Overview, Recommendations, Sources and Issues; compact filter drawer | Tabs + accordions |
| `/thesfm-trader-own/news` | Market News | Hero and full news-card stream | High | Overview, Data, Filters, Sources and Issues; long evidence/summary on demand | Tabs + accordions |
| `/thesfm-trader-own/calendar` | Calendar / Earnings / Dividends / IPOs | Range toolbar, provider coverage, four large datasets; earnings has nested filters/table | Extreme when expanded | Overview plus Earnings, Dividends, IPOs and Economic peer views; shared Sources and Issues; retain one cached dataset snapshot | Tabs + accordions |
| `/thesfm-trader-own/settings` | Provider Diagnostics | Provider banner, metrics, capabilities, diagnostic groups, provider catalog, signal settings, actions | High | Provider Overview, Capabilities, Issues and Preferences; raw catalog and error groups collapsed | Tabs + accordions |
| `/sfm-admin-control/market-diagnostics` | Admin Operations Center | Overview, providers, market, errors, jobs, performance, AI, Shariah and logs | Medium per view | Preserve current one-snapshot architecture; add URL state, sticky accessible tabs and collapsed log records | Tabs + accordions |
| `/sfm-admin-control/news-providers` | News Provider Diagnostics | Summary, notices and every provider expanded | High / unbounded | Overview, Providers and Issues; provider detail collapsed | Tabs + accordions |
| `/sfm-admin-control` | Admin Analytics | Global filters, KPIs, queue, traffic, events, audiences, duplicated activity/log tables | Extreme | Overview, Company Queue, Traffic, Events, Audience and Logs; remove duplicate activity rendering | Tabs + accordions |
| `/sharia-stocks?tab=research` | Shariah Screener / Report | Sticky search, classification summary, quick result, actions, nine report sections, repeated final verdict | Extreme | Keep one classification/confidence/disclaimer summary visible; Result, Business, Ratios, Evidence, Sources, Methodology and Diagnostics as peer views | Tabs + accordions |
| `/sfm-admin-control/shariah` | Shariah Review | Stats, search, long review table and manual review form | Medium | Overview, Review Queue and Manual Review | Tabs + accordions |
| `/khums` | Khums | Generic charity navigation, six KPIs, years, setup, calculation, income, expenses, payments, reminders, report | High | Khums-only Overview, Data Entry, Calculation, Distribution, Year History, Reports & Documents; keep result/disclaimer visible | Tabs + accordions |
| `/zakat` | Zakat | Five tabs; calculator, assets/reminders and history/reports currently overlap | High | Add Overview; make Calculator, Assets, History, Reminders and Reports distinct; rules disclosed | Tabs + accordions |
| `/charity` | Personal Charity | KPIs, project shortcut, donation form, monthly history and sticky guidance rail | Medium-high | Overview, Add Donation and History; types/guidance disclosed | Tabs + accordions |
| `/charity-projects` | Charity Projects | Fourteen data loads, seven mounted panels, embedded Zakat calculator, projects, beneficiaries, documents and reports | Extreme | Keep existing peer tabs but URL-sync and conditionally mount; replace embedded Zakat duplication with summary/link | Tabs + accordions |
| `/investment-offers` | Investor Offers | Project totals, selector, readiness meter and four readiness cards | Medium | Overview, Investment Readiness, Financials, Documents and Pitch Deck. Do not add unsupported investor/risk/activity data | Tabs + accordions |
| `/reports-center` | Reports Center | 22 source tables, status/category controls, always-open filters, nested category accordions, full PDF preview, empty history | Extreme | Recent and real report categories as peer views; status in filters; filters collapsed; preview on demand; no fake archive/AI history | Tabs + accordions |
| `/documents` | Documents Center | Upload zone, five KPIs, search, eight source filters and detailed cards | High | Recent and honest metadata-backed categories; upload/filters compact; document detail progressive | Tabs + collapsible toolbar |
| `/dashboard` | Personal Finance Dashboard | Cross-domain financial summaries and action cards | High | Compact dashboard with section anchors; avoid unnecessary tabs | Sticky anchors + compact summaries |
| `/income`, `/invest` | Income / Investments | Existing peer tabs and long detail panels | High | Retain tab model; add URL/back support and panel semantics | Tabs + accordions |
| `/debts` | Debt Workspace | Overview, debt records, payoff detail, payments and strategy | High | Overview, Debts, Payments and Strategy | Tabs + accordions |
| `/expenses/monthly-subscriptions` | Subscriptions | Summary, records, renewals, analytics and reports in one workflow | High | Overview, Subscriptions, Renewals, Analytics and Reports | Tabs + accordions |
| `/business-hub` | Business Hub | Six peer modules with long funding, directory, jurisdiction and document workspaces | Very high | Retain peer tabs; URL-sync; disclose assumptions, warnings, requirements and document detail | Tabs + accordions |
| `/business-operations` | Business Operations | KPIs, module cards, four charts and diagnostics | High | Overview, Modules, Analytics and Diagnostics; mount charts only when active | Tabs + accordions |
| `/projects/[id]` | Project Workspace | Eight peer views with dynamic heavy panels | High | Retain current tabs; add sticky/mobile behavior, URL writes and complete tab/panel semantics | Tabs + accordions |

## Shared findings

- `PageTabs` already supplies mobile horizontal scrolling and 44px targets, but needs roving focus, Arrow/Home/End navigation, stable tab/panel IDs, active-tab scrolling and URL integration at page level.
- Existing Radix tabs, accordion and collapsible primitives are sufficient; no new UI dependency is needed.
- Market Analysis and the project workspace already dynamically import heavy views. The same conditional-mount rule should be retained.
- Operations Center already shares and deduplicates one polled snapshot across tabs; it is the reference pattern for diagnostics.
- The legacy Trader iframe currently hydrates unrelated datasets on every route. Route-gating those requests is a safe frontend performance improvement that does not change provider priority or calculations.
- Investor Offers has no investor-activity source, Reports has no persisted archive/AI history, and Documents has no reliable archive/AI classification. Empty peer views must not be invented.
