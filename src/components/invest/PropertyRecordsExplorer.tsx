'use client';

import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { OfficialPropertyRecord } from '@/lib/investments/intelligence/official-context';
import { filterPropertyRecords, type PropertyRecordSort } from '@/lib/investments/propertyRecords';
import { getCurrency } from '@/lib/currencies';

export function PropertyRecordsExplorer({ records, sourceLink }: { records: OfficialPropertyRecord[]; sourceLink: (url: string) => string | null }) {
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [query, setQuery] = useState(''); const [type, setType] = useState(''); const [currency, setCurrency] = useState('');
  const [sort, setSort] = useState<PropertyRecordSort>('newest'); const [limit, setLimit] = useState(10);
  const rows = useMemo(() => filterPropertyRecords(records, query, type, currency, sort), [records, query, type, currency, sort]);
  const types = [...new Set(records.map(row => row.propertyType).filter(Boolean))];
  const currencies = [...new Set(records.map(row => row.currency ?? 'unknown'))];
  const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(lang, { numberingSystem: 'latn', maximumFractionDigits: 2 }).format(value);
  const money = (value: number | null, code: string | null) => value === null ? '—' : code && /^[A-Z]{3}$/.test(code)
    ? new Intl.NumberFormat(lang, { style: 'currency', currency: code, numberingSystem: 'latn', maximumFractionDigits: getCurrency(code).decimals }).format(value) : number(value);
  return <div className="property-records">
    <div className="real-estate-analyst__grid">
      <label>{L('ابحث في السجلات', 'Search records', 'Rechercher une transaction')}<input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(10); }} /></label>
      <label>{L('ترتيب السجلات', 'Sort records', 'Trier les transactions')}<select value={sort} onChange={event => { setSort(event.target.value as PropertyRecordSort); setLimit(10); }}>
        <option value="newest">{L('الأحدث أولًا', 'Newest first', 'Plus récentes')}</option><option value="oldest">{L('الأقدم أولًا', 'Oldest first', 'Plus anciennes')}</option>
        <option value="price-asc">{L('السعر تصاعديًا حسب العملة', 'Price ascending by currency', 'Prix croissant par devise')}</option><option value="price-desc">{L('السعر تنازليًا حسب العملة', 'Price descending by currency', 'Prix décroissant par devise')}</option>
      </select></label>
      <label>{L('نوع العقار بالمصدر', 'Source property type', 'Type de bien à la source')}<select value={type} onChange={event => { setType(event.target.value); setLimit(10); }}><option value="">{L('كل الأنواع', 'All types', 'Tous les types')}</option>{types.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>{L('عملة السجل', 'Record currency', 'Devise de la transaction')}<select value={currency} onChange={event => { setCurrency(event.target.value); setLimit(10); }}><option value="">{L('كل العملات', 'All currencies', 'Toutes les devises')}</option>{currencies.map(value => <option key={value} value={value}>{value === 'unknown' ? L('غير محددة بالمصدر', 'Not declared by source', 'Non déclarée par la source') : value}</option>)}</select></label>
    </div>
    <p role="status">{L('السجلات المطابقة', 'Matching records', 'Transactions correspondantes')}: <bdi>{rows.length}</bdi> / <bdi>{records.length}</bdi></p>
    {rows.length === 0 ? <p>{L('لا توجد سجلات تطابق الفلاتر. جرّب مسح البحث أو تغيير النوع.', 'No records match these filters. Clear the search or change the type.', 'Aucune transaction ne correspond. Effacez la recherche ou changez le type.')}</p> : null}
    {rows.slice(0, limit).map(record => { const href = sourceLink(record.sourceUrl); return <article className="real-estate-analyst__evidence-row" key={record.id}>
      <div><strong>{lang === 'ar' && record.districtAr ? record.districtAr : record.district || record.municipality}</strong><small><bdi>{record.observedOn}</bdi></small><small dir="auto">{record.propertyType || '—'}</small>{record.propertyTypeAr && record.propertyTypeAr !== record.propertyType ? <small lang="ar" dir="rtl">{record.propertyTypeAr}</small> : null}<small>{record.usage || '—'}</small></div>
      <div><strong><bdi>{money(record.reportedValue, record.currency)}</bdi></strong><small>{L('قيمة الصفقة المنشورة', 'Reported sale value', 'Valeur de vente publiée')}</small><small>{L('المساحة المنشورة', 'Reported area', 'Surface publiée')}: <bdi>{number(record.areaM2)} m²</bdi></small><small>{L('القيمة المنشورة لكل م²', 'Reported value per m²', 'Valeur publiée par m²')}: <bdi>{money(record.reportedPricePerM2, record.currency)}</bdi></small><small>{record.fullOwnership ? L('حصة كاملة وفق المصدر', 'Full share per source', 'Pleine quote-part selon la source') : L('الملكية والصفقة تحتاج مراجعة', 'Ownership and sale require review', 'Propriété et vente à vérifier')}</small></div>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer">{L('السجل بالمصدر', 'Source record', 'Transaction source')}</a> : null}
    </article>; })}
    {rows.length > limit ? <button type="button" className="real-estate-analyst__save" onClick={() => setLimit(value => value + 10)}>{L('عرض المزيد من السجلات', 'Show more records', 'Afficher plus de transactions')}</button> : null}
  </div>;
}
