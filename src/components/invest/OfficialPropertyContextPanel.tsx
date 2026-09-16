'use client';
import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { OfficialPropertyContext } from '@/lib/investments/intelligence/official-context';

function allowedSource(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['www.data.gov.qa', 'creativecommons.org'].includes(url.hostname) ? url.href : null; } catch { return null; }
}

export function OfficialPropertyContextPanel({ report }: { report: OfficialPropertyContext }) {
  const { lang, dir } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(lang, { numberingSystem: 'latn', maximumFractionDigits: 2 }).format(value);
  const source = allowedSource(report.sourceUrl); const license = allowedSource(report.licenseUrl);
  return <section dir={dir} aria-label={L('اتصال المصدر الرسمي', 'Official source connection', 'Connexion à la source officielle')}>
    <h3>{L('وزارة العدل القطرية · بوابة البيانات المفتوحة', 'Qatar Ministry of Justice · Open Data Portal', 'Ministère de la Justice du Qatar · Données ouvertes')}</h3>
    <p role="status">{report.status === 'UNAVAILABLE'
      ? L('تعذر التحقق من المصدر الآن؛ لم نستبدله بأرقام افتراضية.', 'Source verification unavailable; no fallback prices.', 'Source non vérifiable ; aucun prix de remplacement.')
      : L('المصدر متصل للفحص، وليس جاهزًا لتقييم القيمة الحالية.', 'Source connected for inspection, not approved for current valuation.', 'Source connectée pour consultation, non validée pour une estimation actuelle.')}</p>
    <p>{L('أحدث صفقة منشورة', 'Latest published transaction', 'Dernière transaction publiée')}: <bdi>{report.latestObservationOn ?? '—'}</bdi> · {L('تحديث بيانات التعريف', 'Metadata update', 'Mise à jour des métadonnées')}: <bdi>{report.metadataUpdatedAt ?? '—'}</bdi></p>
    <p>{L('وقت فحص المصدر', 'Source check time', 'Vérification de la source')}: <bdi>{report.retrievedAt ?? '—'}</bdi></p>
    {report.reasons.includes('STALE_OBSERVATIONS') ? <p>{L('أحدث الصفقات أقدم من 180 يومًا؛ تحديث الصفحة لا يجعل أسعارها حديثة.', 'Latest transactions are over 180 days old; a metadata update does not refresh their prices.', 'Transactions datant de plus de 180 jours ; les métadonnées ne rajeunissent pas les prix.')}</p> : null}
    <p>{L('توجد تعارضات في تصنيف نوع العقار بين الحقول العربية والإنجليزية. لم نعتمد تحويلها إلى مقارنات سعرية.', 'Arabic and English property classifications require reconciliation. These rows are not valuation comparables.', 'Les classifications arabes et anglaises doivent être rapprochées. Ces lignes ne sont pas des comparables de valorisation.')}</p>
    <p>{L('العملة غير مذكورة في حقول الـAPI المراجعة. الأرقام أدناه كما نشرها المصدر، بدون افتراض عملة أو تحويل أو تقدير لعقارك.', 'Currency is absent from the reviewed API fields. Numbers below are source-reported only, with no currency assumption, conversion or valuation of your property.', 'Devise absente des champs API examinés. Chiffres publiés uniquement, sans devise supposée, conversion ni estimation de votre bien.')}</p>
    {report.status === 'INPUT_REQUIRED' ? <p>{L('اختر البلدية والحي من الدليل الرسمي لجلب سجلات المنطقة.', 'Select the official municipality and district to retrieve local records.', 'Choisissez la municipalité et le quartier officiels pour consulter les transactions locales.')}</p> : null}
    {source ? <a href={source} target="_blank" rel="noopener noreferrer">{L('المصدر الرسمي', 'Official source', 'Source officielle')}</a> : null}
    {' · '}{license ? <a href={license} target="_blank" rel="noopener noreferrer">CC BY 4.0</a> : null}
    <p>{L('البيانات: وزارة العدل القطرية؛ التنظيم والعرض: THE SFM. لا يمثل ذلك اعتمادًا من الوزارة.', 'Data: Qatar Ministry of Justice; organization and presentation: THE SFM. No government endorsement.', 'Données : Ministère de la Justice du Qatar ; organisation et présentation : THE SFM. Aucun agrément gouvernemental.')}</p>
    {report.sampleTotal !== null ? <p>{L('عدد السجلات المطابقة للمنطقة', 'Records matching the area', 'Transactions correspondant au secteur')}: {number(report.sampleTotal)} · {L('المعروض بعد استبعاد التكرار والصفوف غير الصالحة', 'Shown after deduplication and validation', 'Affichées après dédoublonnage et validation')}: {number(report.records.length)}{report.sampleTruncated ? L(' — عينة محدودة، ليست كامل السوق.', ' — bounded sample, not the entire market.', ' — échantillon limité, pas tout le marché.') : ''}</p> : null}
    {report.reasons.includes('NO_LOCAL_RECORDS') ? <p>{L('لا توجد سجلات صالحة للعرض لهذه المنطقة في الاستجابة الحالية.', 'No displayable local records in this response.', 'Aucune transaction locale affichable dans cette réponse.')}</p> : null}
    {report.records.length > 0 ? <details><summary>{L('عرض سجلات المصدر، وليست تقييمًا', 'Inspect source records, not a valuation', 'Consulter les transactions, pas une estimation')} ({number(report.records.length)})</summary>
      {report.records.map(record => { const href = allowedSource(record.sourceUrl); return <article className="real-estate-analyst__evidence-row" key={record.id}>
        <div><strong>{lang === 'ar' ? record.districtAr : record.district}</strong><small><bdi>{record.observedOn}</bdi></small><small dir="rtl">{record.propertyTypeAr || '—'}</small><small dir="ltr">{record.propertyType || '—'}</small><small>{lang === 'ar' ? record.usageAr : record.usage}</small></div>
        <div><small>{L('المساحة المنشورة', 'Reported area', 'Surface publiée')}: <bdi>{number(record.areaM2)} m²</bdi></small><small>{L('القيمة المنشورة، العملة غير مثبتة', 'Reported value, currency unverified', 'Valeur publiée, devise non vérifiée')}: <bdi>{number(record.reportedValue)}</bdi></small><small>{L('القيمة المنشورة لكل م²، العملة غير مثبتة', 'Reported value per m², currency unverified', 'Valeur publiée par m², devise non vérifiée')}: <bdi>{number(record.reportedPricePerM2)}</bdi></small><small>{record.fullOwnership ? L('حصة كاملة وفق الحقول المنشورة', 'Full share according to reported fields', 'Pleine quote-part selon les champs publiés') : L('ملكية جزئية أو بيانات حصة غير متطابقة', 'Partial ownership or inconsistent share fields', 'Quote-part partielle ou champs incohérents')}</small></div>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer">{L('السجل بالمصدر', 'Source record', 'Transaction source')}</a> : null}
      </article>; })}
    </details> : null}
  </section>;
}
