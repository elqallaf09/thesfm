(function (global) {
  'use strict';
  const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  function analysis(record) {
    const value = record?.research;
    return value?.basis === 'daily_history' && value.samples > 0 ? value : null;
  }
  function technical(record) {
    const research = analysis(record), source = research || record || {};
    return { ...source, feature: 'technical_analysis', available: source.technicalAvailable === true,
      technicalAvailable: source.technicalAvailable === true, currentPrice: record?.price ?? null,
      source: record?.source, providerStatus: record?.providerStatus,
      indicators: source.technicalSummary?.indicators || {}, research };
  }
  function label(research, t) {
    return research?.freshness === 'stale' ? t('تحليل تاريخي قديم', 'Older historical analysis', 'Analyse historique ancienne')
      : t('تحليل السجل اليومي', 'Daily history analysis', 'Analyse de l’historique journalier');
  }
  function render(record, { h, text: t, view = "summary" }) {
    const r = analysis(record);
    if (!r) return '';
    const missing = t('لم تتوفر عينات كافية للحساب', 'Not enough samples to calculate', 'Échantillons insuffisants pour le calcul');
    const n = value => number(value) === null ? missing : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    const pct = value => number(value) === null ? missing : `${n(value)}%`;
    const risk = r.risk || {};
    const bias = { 'Strong Buy': t('شراء قوي', 'Strong buy', 'Achat fort'), Buy: t('شراء', 'Buy', 'Achat'),
      'Weak Buy': t('ميل شرائي ضعيف', 'Weak buying bias', 'Faible biais acheteur'), Sell: t('بيع', 'Sell', 'Vente'),
      'Weak Sell': t('ميل بيعي ضعيف', 'Weak selling bias', 'Faible biais vendeur'), Watch: t('مراقبة', 'Watch', 'Surveillance') }[r.assessment] || missing;
    const row = (key, value) => `<div class="drawer-metric"><small>${h(key)}</small><b dir="auto">${h(value)}</b></div>`;
    const coverage = r.dataSufficiency?.strategyCoverage;
    const note = t('درجة الثقة مقياس حسابي لقوة الأدلة والاتفاق وجودة العينات؛ ليست احتمال ربح أو دقة تاريخية مقاسة.',
      'Confidence is a rules-based score of evidence, agreement and sample quality; it is not a win probability or measured historical accuracy.',
      'La confiance est un score calculé à partir des éléments, du consensus et des échantillons ; ce n’est ni une probabilité de gain ni une précision historique mesurée.');
    const quoteNote = record.available === false ? t('توصية التداول معلقة حتى ورود سعر حديث صالح؛ التحليل أدناه مؤرخ بالسجل اليومي.',
      'Trading recommendation awaits a valid current quote; the analysis below is dated to the daily history.',
      'La recommandation de trading attend un cours actuel valide ; l’analyse ci-dessous est datée selon l’historique journalier.') : '';
    return `<section class="research-evidence" data-research-evidence><h3>${h(label(r, t))}</h3>
      <p>${h(t('المصدر', 'Source', 'Source'))}: ${h(r.provider || missing)} · <span dir="ltr">${h(String(r.asOf || '').slice(0, 10))}</span> · ${h(n(r.samples))} ${h(t('شمعة يومية', 'daily candles', 'bougies journalières'))}</p>
      ${quoteNote ? `<p class="provider-warning">${h(quoteNote)}</p>` : ''}
      <div class="drawer-metrics">${row(t('ثقة التحليل', 'Analysis confidence', 'Confiance de l’analyse'), pct(r.confidence))}
      ${row(t('الاستراتيجيات المتاحة', 'Available strategies', 'Stratégies disponibles'), coverage ? `${n(coverage.available)} / ${n(coverage.total)}` : missing)}
      ${view === 'confidence' ? `${row(t('ميل النموذج على السجل', 'Model bias on history', 'Biais du modèle sur l’historique'), bias)}${row(t('الدرجة الموزونة من 100', 'Weighted score out of 100', 'Score pondéré sur 100'), n(r.finalScore))}` : `${row(t('التقلب السنوي · 20 عائداً يومياً', 'Annualized volatility · 20 daily returns', 'Volatilité annualisée · 20 rendements journaliers'), pct(risk.annualizedVolatilityPercent))}
      ${row(t('ATR كنسبة من الإغلاق', 'ATR / closing price', 'ATR / cours de clôture'), pct(risk.atrPercent))}
      ${row(t('أكبر تراجع في نافذة السجل', 'Maximum drawdown in history window', 'Repli maximal dans la fenêtre historique'), pct(risk.maximumDrawdownPercent))}
      ${row(t('شموع نافذة التراجع', 'Drawdown window candles', 'Bougies de la fenêtre de repli'), n(risk.drawdownSamples))}`}</div>
      <p class="muted-note">${h(note)}</p>
      ${r.freshness === 'stale' ? `<p class="provider-warning">${h(t('السجل قديم؛ حُجبت درجة الثقة الحالية. راجع التاريخ قبل تفسير المؤشرات.', 'History is old; current confidence is withheld. Check the date before interpreting indicators.', 'L’historique est ancien ; la confiance actuelle est masquée. Vérifiez la date avant d’interpréter les indicateurs.'))}</p>` : ''}
    </section>`;
  }
  const api = { analysis, technical, label, render };
  global.SFMResearchEvidence = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
