'use client';

import type { FactorResult } from '@/domain/intelligence/contracts';
import { MacroObservationEvidence } from './MacroObservationEvidence';

const COPY = {
  ar: { details: 'المصادر والبيانات', noDirection: 'بيانات متاحة؛ الاتجاه غير محسوم', unavailable: 'لا توجد عينة موثقة حديثة من المصادر المتصلة.', entitlement: 'المصدر لا يتيح هذه البيانات ضمن الاشتراك الحالي.', stale: 'البيانات المتوفرة قديمة أو بلا تاريخ موثوق.', sharia: 'لم تتوفر نتيجة شرعية موثقة حديثة؛ افتح البحث الشرعي من بطاقة فحص الاستثمار.', compliant: 'متوافق', non_compliant: 'غير متوافق', needs_review: 'يحتاج مراجعة', sample: 'حجم العينة', positive: 'مؤشر المعنويات الإيجابية', negative: 'مؤشر المعنويات السلبية', source: 'المصدر', news: 'عدد الأخبار', events: 'عدد الأحداث', next: 'الحدث القادم', reason: 'سبب المراجعة' },
  en: { details: 'Sources and evidence', noDirection: 'Evidence available; direction uncertain', unavailable: 'No current verified sample from connected sources.', entitlement: 'The current provider subscription does not include this data.', stale: 'Available data is stale or lacks a verified timestamp.', sharia: 'No current verified Sharia result; open Sharia research in the investment check.', compliant: 'Compliant', non_compliant: 'Non-compliant', needs_review: 'Needs review', sample: 'Sample size', positive: 'Positive sentiment index', negative: 'Negative sentiment index', source: 'Source', news: 'Article count', events: 'Event count', next: 'Next event', reason: 'Review reason' },
  fr: { details: 'Sources et preuves', noDirection: 'Preuves disponibles ; direction incertaine', unavailable: 'Aucun échantillon vérifié récent des sources connectées.', entitlement: 'L’abonnement actuel ne comprend pas ces données.', stale: 'Les données sont anciennes ou sans date vérifiée.', sharia: 'Aucun résultat charia vérifié récent ; ouvrez la recherche charia dans la vérification.', compliant: 'Conforme', non_compliant: 'Non conforme', needs_review: 'À vérifier', sample: 'Taille de l’échantillon', positive: 'Indice de sentiment positif', negative: 'Indice de sentiment négatif', source: 'Source', news: 'Nombre d’articles', events: 'Nombre d’événements', next: 'Prochain événement', reason: 'Motif de vérification' },
};
export function contextDirectionLabel(locale: keyof typeof COPY) { return COPY[locale].noDirection; }

export function ContextFactorEvidence({ factor, locale }: { factor: FactorResult; locale: keyof typeof COPY }) {
  if (!['NEWS', 'SENTIMENT', 'MACRO', 'SHARIA'].includes(factor.factor)) return null;
  const copy = COPY[locale];
  const failure = factor.failureReason ?? '';
  const labels: Record<string, string> = { sentiment_sample_size: copy.sample, positive_sentiment_percent: copy.positive, negative_sentiment_percent: copy.negative, news_article_count: copy.news, macro_event_count: copy.events, next_macro_event: copy.next, sharia_review_reason: copy.reason };
  const nextEvent = factor.evidence.find(item => item.labelKey === 'intelligence_evidence_next_macro_event');
  const hasObservations = factor.evidence.some(item => item.labelKey.startsWith('intelligence_evidence_macro_observation_'));
  const hasOtherEvidence = factor.evidence.some(item => {
    const key = item.labelKey.replace(/^intelligence_evidence_/, '');
    return Boolean(labels[key]) || ['latest_news_headline', 'macro_event_title'].includes(key);
  });
  return <>{hasObservations ? <MacroObservationEvidence factor={factor} locale={locale} /> : null}
    {!hasObservations || hasOtherEvidence ? <details><summary>{hasObservations ? ({ ar: 'الأحداث الاقتصادية', en: 'Economic events', fr: 'Événements économiques' })[locale] : copy.details}</summary>
    {factor.availability === 'UNAVAILABLE' ? <p>{factor.factor === 'SHARIA' ? copy.sharia : /access_denied|not_entitled/i.test(failure) ? copy.entitlement : /STALE|UNDATED/i.test(failure) ? copy.stale : copy.unavailable}</p> : null}
    <ul>{factor.evidence.map(item => {
      const key = item.labelKey.replace(/^intelligence_evidence_/, '');
      if (/^macro_(observation|previous|country)_/.test(key) || (hasObservations && key === 'macro_source_url')) return null;
      if (key === 'macro_event_title' && nextEvent && item.value === nextEvent.value && item.observedAt === nextEvent.observedAt) return null;
      const text = typeof item.value === 'string' ? item.value : typeof item.value === 'number' ? String(Math.round(item.value * 100) / 100) : '';
      if (['news_source_url', 'macro_source_url'].includes(key)) {
        try { const url = new URL(text); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null; }
        catch { return null; }
        return <li key={item.id}><a href={text} target="_blank" rel="noopener noreferrer">{copy.source}: {item.source}</a></li>;
      }
      if (key === 'verified_sharia_status') return <li key={item.id}>{text === 'compliant' || text === 'non_compliant' || text === 'needs_review' ? copy[text] : text}</li>;
      if (!labels[key] && !['latest_news_headline', 'macro_event_title'].includes(key)) return null;
      return <li key={item.id}><span dir="auto">{labels[key] ? `${labels[key]}: ` : ''}{text}{item.unit === '%' ? '%' : ''}</span>{item.observedAt ? <small dir="ltr"> · {item.observedAt.replace('T', ' ').slice(0, 16)}{item.observedAt.includes('T') ? ' UTC' : ''}</small> : null}</li>;
    })}</ul>
    {!hasObservations && factor.source !== 'unavailable' ? <small>{copy.source}: {factor.source}</small> : null}
  </details> : null}</>;
}
