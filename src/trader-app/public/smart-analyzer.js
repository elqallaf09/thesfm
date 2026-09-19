/* Evidence presentation shared by the embedded Smart Analyzer. No price forecasts
   are produced here: every metric and recommendation comes from its own record. */
(function (global) {
  'use strict';
  const finite = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
    ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const first = (...values) => values.map(finite).find(value => value !== null) ?? null;
  const quoted = item => item?.available !== false && first(item?.price, item?.currentPrice) > 0;
  const observed = item => {
    const stamp = item?.engine?.asOf || item?.lastUpdated || item?.dataTimestamp || item?.providerStatus?.lastUpdated || item?.priceReference?.observedAt;
    const time = Date.parse(stamp || '');
    return Number.isFinite(time) ? time : 0;
  };
  const analyzed = item => item?.technicalAvailable === true || item?.technicalSummary?.available === true;

  function merge(primary, fallback) {
    const map = new Map(fallback.filter(item => item.symbol).map(item => [item.symbol.toUpperCase(), item]));
    for (const item of primary) {
      if (!item.symbol) continue;
      const key = item.symbol.toUpperCase(), previous = map.get(key);
      // Pick a coherent observation. A failed signal must not erase a valid
      // quote; never splice one observation's price into another one's targets.
      if (!previous || (!quoted(previous) && quoted(item))
        || (quoted(previous) === quoted(item) && (observed(item) > observed(previous)
          || (observed(item) === observed(previous) && analyzed(item) && !analyzed(previous))))) map.set(key, item);
    }
    return [...map.values()];
  }

  function rank(items) {
    return [...items].sort((a, b) => Number(analyzed(b)) - Number(analyzed(a))
      || Number(quoted(b)) - Number(quoted(a)) || Number(first(b.lastKnownPrice) > 0) - Number(first(a.lastKnownPrice) > 0) || observed(b) - observed(a)
      || (first(b.volume) ?? -1) - (first(a.volume) ?? -1));
  }

  function coverage(items) {
    const prices = items.filter(quoted), analyses = items.filter(analyzed);
    const references = items.filter(item => !quoted(item) && first(item.lastKnownPrice) > 0);
    const timestamps = [...prices, ...references].map(observed).filter(Boolean);
    return { total: items.length, prices: prices.length, analyses: analyses.length,
      references: references.length, missing: items.length - prices.length - references.length, latest: timestamps.length ? Math.max(...timestamps) : null };
  }

  function indicators(item) {
    const t = item?.technicalSummary?.indicators || item?.technicals || item?.technical || item?.indicators || {};
    return { rsi: first(item.rsi, t.rsi14, t.rsi), ema20: first(item.ema20, t.ema20, item.sma20, t.sma20),
      ema50: first(item.ema50, t.ema50, item.sma50, t.sma50), ema200: first(item.ema200, t.ema200, t.sma200),
      macd: first(item.macd, t.macd), macdSignal: first(item.macdSignal, t.macdSignal),
      support: first(item.support, t.support), resistance: first(item.resistance, t.resistance),
      momentum: first(item.priceMomentum20, t.priceMomentum20, t.momentum20),
      volumeRatio: first(item.volumeRatio, t.volumeRatio), atr: first(item.atr, t.atr, t.atr14) };
  }

  function render(item, options) {
    const { h, text: t, price, currency, status, recommendation, recommendationLabel, date, logo } = options;
    const a = item || {}, research = a.research?.basis === "daily_history" ? a.research : null, i = indicators(research?.available ? research : a), value = first(a.price, a.currentPrice, a.lastKnownPrice), c = currency(a);
    const missing = t('لم يرد من المصدر', 'Not supplied', 'Non fourni');
    const n = (v, digits = 2) => v === null ? missing : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(v);
    const p = v => v === null ? missing : price(v, c);
    const metric = (label, text) => `<div class="sa-metric"><dt>${h(label)}</dt><dd dir="auto">${h(text)}</dd></div>`;
    const age = observed(a), source = a.upstreamSource || a.sfmMarket?.provenance?.upstreamProviderName || a.source || a.provider;
    const rec = recommendation(a), usable = quoted(a), computed = analyzed(a);
    const rationale = rec.evidenceReady === false ? rec.reason : a.explanation && typeof a.explanation === 'object'
      ? (a.explanation[options.lang] || a.explanation.en) : options.lang === 'ar' ? a.explanationAr : a.explanationEn;
    const reasons = Array.isArray(a.reasons) ? a.reasons.filter(x => typeof x === 'string') : [];
    const trend = value !== null && i.ema20 !== null && i.ema50 !== null
      ? value > i.ema20 && i.ema20 > i.ema50 ? t('اتجاه صاعد', 'Uptrend', 'Tendance haussière')
        : value < i.ema20 && i.ema20 < i.ema50 ? t('اتجاه هابط', 'Downtrend', 'Tendance baissière')
          : t('اتجاه متباين', 'Mixed trend', 'Tendance mixte') : missing;
    const momentum = i.rsi === null ? missing : i.rsi >= 70
      ? t('زخم مرتفع؛ راقب التشبع الشرائي', 'Strong momentum; watch overbought conditions', 'Momentum élevé ; surveiller le surachat')
      : i.rsi <= 30 ? t('ضعف زخم؛ التشبع البيعي ليس إشارة شراء وحده', 'Weak momentum; oversold is not a buy signal alone', 'Momentum faible ; la survente seule ne suffit pas pour acheter')
        : t('RSI داخل النطاق المتوسط', 'RSI in the middle range', 'RSI dans la zone intermédiaire');
    const known = !usable && first(a.lastKnownPrice) > 0;
    const reference = a.priceReference || {}, referenceDate = reference.precision === 'date';
    const referenceLabel = reference.kind === 'daily' ? t('سعر يومي مرجعي', 'Daily reference price', 'Cours journalier indicatif')
      : reference.kind === 'market_closed' ? t('آخر سعر والجلسة مغلقة', 'Last quote · market closed', 'Dernier cours · marché fermé')
        : reference.kind === 'time_unknown' ? t('سعر مرجعي · التوقيت غير متاح', 'Reference price · time unavailable', 'Cours indicatif · date indisponible')
          : t('آخر سعر معروف — قديم', 'Last known price — stale', 'Dernier cours connu — ancien');
    const freshness = known ? { label: referenceLabel + (reference.quality === 'stale' && reference.kind !== 'stale' ? t(' · بيانات قديمة', ' · stale data', ' · données anciennes') : ''), tone: 'warn', body: t('السعر مرجعي بالتاريخ المعروض. المؤشرات محسوبة من السجل التاريخي؛ توصية التداول تنتظر سعرًا حاليًا صالحًا.', 'Reference price as of the displayed date. Indicators use historical candles; a trading recommendation requires a valid current quote.', 'Cours indicatif à la date affichée. Les indicateurs reposent sur l’historique ; une recommandation exige un cours actuel valide.') } : status(a, rec);
    const observationText = age ? referenceDate ? new Date(age).toISOString().slice(0, 10) : date(new Date(age).toISOString()) : missing;
    const dailyChange = first(a.changePercent, known ? reference.changePercent : null), volume = first(a.volume, known ? reference.volume : null);
    return `<section class="panel sa-research" aria-labelledby="${h(options.titleId)}">
      <header class="sa-research-head"><div class="sa-identity">${a.symbol ? logo(a, 'lg') : ''}<div><span class="eyebrow">${h(t('مختبر تحليل الأسهم', 'Equity research desk', 'Analyse des actions'))}</span><h2 id="${h(options.titleId)}">${h(a.symbol || t('اختر سهمًا للتحليل', 'Choose a stock', 'Choisissez une action'))}</h2><p>${h(a.name || '')}</p></div></div><div class="sa-price"><strong dir="ltr">${h(usable || known ? p(value) : missing)}</strong><span class="state-badge ${h(freshness.tone || '')}">${h(freshness.label)}</span></div></header>
      <div class="sa-source"><span>${h(t('المصدر', 'Source', 'Source'))}: ${h(typeof source === 'string' ? source : missing)}</span><span>${h(t('وقت بيانات السوق', 'Market observation', 'Observation du marché'))}: ${h(observationText)}</span><span>${h(t('شموع تاريخية', 'Historical candles', 'Bougies historiques'))}: ${h(n(first(a.samples, a.history?.length), 0))}</span></div>
      <dl class="sa-metrics">${metric(t('التغير اليومي', 'Daily change', 'Variation du jour'), dailyChange === null ? missing : `${n(dailyChange)}%`)}${metric(t('حجم التداول', 'Volume', 'Volume'), n(volume, 0))}${metric(t('القيمة السوقية', 'Market cap', 'Capitalisation'), first(a.marketCap) === null ? missing : p(first(a.marketCap)))}${metric(t('حالة التوصية', 'Recommendation', 'Recommandation'), recommendationLabel(rec))}</dl>
      <dl class="sa-metrics">${metric(t('ثقة النموذج', 'Model confidence', 'Confiance du modèle'), research ? first(research.confidence) !== null ? `${n(research.confidence)}%` : missing : usable && first(rec.confidence) !== null ? `${n(first(rec.confidence))}%` : missing)}${metric(t('الهدف المشروط', 'Conditional target', 'Objectif conditionnel'), usable && rec.evidenceReady ? p(first(rec.targetPrice)) : missing)}${metric(t('وقف الخسارة', 'Stop loss', 'Stop de protection'), usable && rec.evidenceReady ? p(first(rec.stopLoss)) : missing)}${metric(t('العائد إلى المخاطرة', 'Reward / risk', 'Rendement / risque'), usable && rec.evidenceReady && first(rec.riskReward) !== null ? `${n(first(rec.riskReward))}×` : missing)}</dl>
      <div class="sa-lenses">
        <article><h3>${h(t('الاتجاه والزخم', 'Trend and momentum', 'Tendance et momentum'))}</h3><p>${h(trend)}</p><dl>${metric('RSI · 14', n(i.rsi))}${metric('MACD / Signal', `${n(i.macd, 4)} / ${n(i.macdSignal, 4)}`)}${metric(t('زخم 20 جلسة', '20-session momentum', 'Momentum sur 20 séances'), i.momentum === null ? missing : `${n(i.momentum)}%`)}</dl><small>${h(momentum)}</small></article>
        <article><h3>${h(t('المتوسطات والمستويات', 'Averages and levels', 'Moyennes et niveaux'))}</h3><dl>${metric('EMA / SMA · 20', p(i.ema20))}${metric('EMA / SMA · 50', p(i.ema50))}${metric('EMA / SMA · 200', p(i.ema200))}${metric(t('الدعم / المقاومة', 'Support / resistance', 'Support / résistance'), `${p(i.support)} / ${p(i.resistance)}`)}</dl></article>
        <article><h3>${h(t('السيولة والمخاطر', 'Liquidity and risk', 'Liquidité et risque'))}</h3><dl>${metric(t('الحجم إلى متوسط 20 جلسة', 'Volume / 20-session average', 'Volume / moyenne sur 20 séances'), i.volumeRatio === null ? missing : `${n(i.volumeRatio)}×`)}${metric('ATR · 14', p(i.atr))}${metric(t('ATR كنسبة من السعر', 'ATR as % of price', 'ATR en % du cours'), i.atr !== null && value > 0 ? `${n(i.atr / value * 100)}%` : missing)}</dl><small>${h(t('الدعم والمقاومة مستويات محسوبة وليسا ضمانًا لانعكاس السعر.', 'Support and resistance are calculated levels, not guarantees of a reversal.', 'Le support et la résistance sont des niveaux calculés, sans garantie de retournement.'))}</small></article>
      </div>
      <div class="sa-thesis">${known ? `<p>${h(freshness.body)}</p>` : ''}${a.technicalAsOf ? `<p>${h(t('السجل التاريخي حتى', 'Historical data through', 'Historique jusqu’au'))}: ${h(String(a.technicalAsOf).slice(0, 10))}</p>` : ''}<h3>${h(t('قراءة الأدلة', 'Evidence summary', 'Synthèse des éléments'))}</h3><p>${h(rationale || reasons.slice(0, 3).join(' · ') || (computed ? t('اقرأ الاتجاه مع الزخم والسيولة. الثقة تقدير للنموذج وليست احتمال ربح مضمون.', 'Read trend together with momentum and liquidity. Model confidence is not a guaranteed win probability.', 'Croisez tendance, momentum et liquidité. La confiance du modèle ne garantit pas un gain.') : freshness.body))}</p><small>${h(t('الحقول الناقصة تبقى معلنة. البيانات المتأخرة لا تصبح بيانات لحظية، والتحليل الأساسي يتطلب قوائم مالية وتقييمًا مستقلًا.', 'Missing fields remain explicit. Delayed data is not realtime; fundamental analysis requires financial statements and a separate valuation.', 'Les champs manquants restent explicites. Les données différées ne sont pas en temps réel ; l’analyse fondamentale exige des états financiers et une valorisation distincte.'))}</small></div>
      ${global.SFMResearchEvidence?.render(a, { h, text: t }) || ''}
      ${a.symbol && options.titleId !== 'drawer-analysis-terminal-title' ? `<button class="action-btn" type="button" data-symbol-details="${h(a.symbol)}">${h(t('فتح التحليل التفصيلي والأخبار', 'Open detailed analysis and news', 'Ouvrir l’analyse détaillée et les actualités'))}</button>` : ''}
    </section>`;
  }

  function summary(items, { h, text: t }) {
    const c = coverage(items);
    return `<section class="panel sa-coverage" aria-label="${h(t('تغطية عينة الأسهم', 'Stock sample coverage', 'Couverture de l’échantillon'))}"><div><span class="eyebrow">${h(t('تغطية فعلية', 'Observed coverage', 'Couverture observée'))}</span><h2>${h(t('الأسعار والتحليل المتاح', 'Available prices and analysis', 'Cours et analyses disponibles'))}</h2><p>${h(t('هذه عينة من السوق المختار. افتح الأسواق للبحث في الدليل الكامل.', 'This is a sample of the selected market. Open Markets to search the full directory.', 'Cet échantillon concerne le marché choisi. Ouvrez Marchés pour rechercher dans tout l’annuaire.'))}</p></div><dl><div><dt>${h(t('أسعار متاحة', 'Available quotes', 'Cours disponibles'))}</dt><dd dir="ltr">${c.prices} / ${c.total}</dd></div><div><dt>${h(t('أسعار مرجعية', 'Reference prices', 'Cours indicatifs'))}</dt><dd>${c.references}</dd></div><div><dt>${h(t('تحليل فني', 'Technical analysis', 'Analyse technique'))}</dt><dd>${c.analyses}</dd></div><div><dt>${h(t('ينقصها سعر', 'Missing quote', 'Cours manquant'))}</dt><dd>${c.missing}</dd></div></dl></section>`;
  }
  const api = { merge, rank, coverage, indicators, quoted, analyzed, observed, render, summary };
  global.SFMSmartAnalyzer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
