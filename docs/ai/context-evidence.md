# Context evidence integration (PR 146)

This release connects optional NEWS, SENTIMENT, MACRO and SHARIA inputs to the
existing intelligence snapshot. It does not promise complete provider coverage
for every security or exchange. Existing price/history factor calculations and
recommendation thresholds are retained.

## Evidence boundaries

- News uses the configured market-news service. Both asset responses and general
  fallback responses must match the exact provider symbol or full issuer name,
  have a source URL and a valid recent publication time. Duplicate headlines are
  removed. A headline is not itself a directional classification: unclassified
  or AI-labelled headlines remain descriptive, with a null directional score.
- Finnhub social sentiment and Alpha Vantage equity sentiment are restricted to
  explicitly identified US stocks. Local exchange suffixes are never stripped
  and sent to US-only paths. Alpha Vantage crypto and supported Myfxbook FX/metals
  use their separate identities. Missing dates/sample counts are not invented.
  Alpha Vantage's mean score is linearly mapped to an index; neither this index
  nor social-position percentages are a probability of a profitable trade.
- Macro inputs use the configured economic-calendar service. Equity events must
  match issuer country and currency. Explicit K/M/B magnitudes are normalized;
  malformed ranges and incompatible units cannot produce a surprise. Future
  releases supply context, not an observed surprise. Equity surprise rules are
  labelled rule-based context and are not silently reused for FX or commodities.
- Sharia screening reads the exact stored provider identity via the existing
  trusted-classification gate. Undated, future, expired, ambiguous or legacy
  unverified statuses remain unavailable. A reviewed `needs_review` status stays
  partial. Published annual operations opinions are not converted into an SFM
  stock-screening decision. Names, sectors and being absent from a list are not
  sufficient to infer compliance or non-compliance.

## Operational behavior

Only requested context modules run (an empty module list means the default full
analysis). Independent modules have a bounded nine-second enrichment wait and
cannot discard another module's successful result. Provider transports retain
existing timeouts. Server credentials and privileged reads remain server-only.
No production screening records, provider credentials, migrations or guard
baselines are changed by this feature.

The implementation is separated into `coreFactors.ts` (released market factors),
`contextFactors.ts` (context calculations), `contextEvidence.ts` (provider reads),
and `lib/server/intelligenceShariaEvidence.ts` (privileged screening reads).

## Verification and rollout

Regression tests cover the query-builder abort order, exact security matching,
provider errors, independent timeout handling, source dates, false/blank/null
numbers, genuine neutral values, news attribution, macro unit parsing, future
releases, and stale/unsupported Sharia decisions. CI is the authoritative source
for exact-head TypeScript, unit, lint, build and browser test status.

After deployment, request a new analysis with force refresh rather than assuming
that an immutable historical result has changed. Check actual source timestamps,
per-factor availability and evidence. In particular, do not report Kuwait news,
social sentiment, local macro or screening coverage as working solely because a
mock-based regression passes: actual provider entitlement and returned evidence
must be verified separately. Incomplete factors remain incomplete, never padded
with fabricated values or opinions.

## متابعة عربية

الربط لا يعني أن جميع المصادر تغطي جميع الأسهم. الخبر غير المصنف لا يتحول إلى
إشارة اتجاهية، والمعنويات ليست احتمال ربح، والتقرير الشرعي السنوي عن العمليات
لا يعادل تصنيف السهم وفق منهج فحص المنصة. بعد النشر يلزم تحليل جديد للتحقق من
البيانات الفعلية؛ السجلات التاريخية لا يعاد كتابتها.

## Suivi français

Une intégration ne garantit pas la couverture de chaque titre. Une actualité non
classée reste descriptive, le sentiment n'est pas une probabilité de gain et un
avis annuel sur les opérations ne remplace pas le filtrage d'un titre. Après le
déploiement, une nouvelle analyse doit vérifier les données réellement fournies;
l'historique immuable n'est pas réécrit.
