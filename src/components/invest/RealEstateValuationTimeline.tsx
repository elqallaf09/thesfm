'use client';

import { useLanguage } from '@/hooks/useLanguage';

type Snapshot = {
  id: string;
  currency: string | null;
  low_value: number | null;
  midpoint_value: number | null;
  high_value: number | null;
  confidence_level: string;
  evidence_count: number;
  official_evidence_count: number;
  methodology_version: string;
  valued_at: string;
};

export function RealEstateValuationTimeline({ items }: { items: Snapshot[] }) {
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const unavailable = L('غير متاح', 'Unavailable', 'Indisponible');
  function amount(value: number | null, currency: string | null) {
    if (value === null || !Number.isFinite(value) || !currency || !/^[A-Z]{3}$/.test(currency)) return unavailable;
    return new Intl.NumberFormat(lang, { style: 'currency', currency, numberingSystem: 'latn', maximumFractionDigits: 2 }).format(value);
  }
  function date(value: string) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', numberingSystem: 'latn' }).format(timestamp) : unavailable;
  }
  if (items.length === 0) return <div className="real-estate-analyst__timeline-empty">{L('لا توجد تقييمات محفوظة بعد. لا نضيف نقاطًا تاريخية افتراضية.', 'No saved valuations yet. Historical points are never invented.', 'Aucune estimation enregistrée. Aucun point historique fictif n’est ajouté.')}</div>;
  return <div className="real-estate-analyst__timeline">{items.map((item, index) => (
    <article key={item.id} className="real-estate-analyst__timeline-item">
      <div className="real-estate-analyst__timeline-marker" aria-hidden="true"><span />{index < items.length - 1 ? <i /> : null}</div>
      <div>
        <time dateTime={item.valued_at}>{date(item.valued_at)}</time>
        <strong dir="ltr">{amount(item.midpoint_value, item.currency)}</strong>
        <span dir="ltr">{amount(item.low_value, item.currency)} – {amount(item.high_value, item.currency)}</span>
        <small>{L('جودة الأدلة', 'Evidence quality', 'Qualité des preuves')}: {item.confidence_level} · {item.evidence_count} {L('دليل', 'evidence', 'preuves')} · {item.official_evidence_count} {L('رسمي', 'official', 'officielles')}</small>
        <small>{L('نسخة المنهجية', 'Methodology version', 'Version de la méthode')}: <bdi>{item.methodology_version}</bdi></small>
      </div>
    </article>
  ))}</div>;
}
