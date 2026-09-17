'use client';
import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { OfficialPropertyContext } from '@/lib/investments/intelligence/official-context';

const SAFE_HOSTS = new Set([
  'www.data.gov.qa', 'creativecommons.org', 'www.gov.uk', 'landregistry.data.gov.uk',
  'www.nationalarchives.gov.uk', 'data.cityofnewyork.us', 'www.nyc.gov',
  'datacatalog.cookcountyil.gov',
]);
function allowedSource(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && SAFE_HOSTS.has(url.hostname) ? url.href : null; } catch { return null; }
}

export function OfficialPropertyContextPanel({ report }: { report: OfficialPropertyContext }) {
  const { lang, dir } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(lang, { numberingSystem: 'latn', maximumFractionDigits: 2 }).format(value);
  const money = (value: number | null, currency: string | null) => value === null ? '—' : currency && /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat(lang, { style: 'currency', currency, numberingSystem: 'latn', maximumFractionDigits: 0 }).format(value)
    : number(value);
  const source = allowedSource(report.sourceUrl); const license = allowedSource(report.licenseUrl);
  const qatar = report.providerId === 'qatar-moj-open-data';
  const uk = report.providerId === 'uk-hmlr-price-paid';
  const nyc = report.providerId === 'us-nyc-dof-rolling-sales';
  const cook = report.providerId === 'us-il-cook-assessor-sales';
  const title = qatar
    ? L('وزارة العدل القطرية · بوابة البيانات المفتوحة', 'Qatar Ministry of Justice · Open Data Portal', 'Ministère de la Justice du Qatar · Données ouvertes')
    : uk
      ? L('سجل الأراضي البريطاني · بيانات الأسعار المدفوعة', 'HM Land Registry · Price Paid Data', 'HM Land Registry · Données des prix payés')
      : nyc
        ? L('مدينة نيويورك · سجلات المبيعات العقارية', 'New York City · Recorded property sales', 'Ville de New York · Ventes immobilières enregistrées')
        : cook
          ? L('مقيّم مقاطعة كوك · سجلات مبيعات العقار', 'Cook County Assessor · Parcel Sales', 'Évaluateur du comté de Cook · Ventes immobilières')
          : report.sourceName;
  return <section dir={dir} aria-label={L('اتصال المصدر الرسمي', 'Official source connection', 'Connexion à la source officielle')}>
    <h3>{title}</h3>
    <p role="status">{report.status === 'UNAVAILABLE'
      ? L('تعذر التحقق من المصدر الآن؛ لم نستبدله بأرقام افتراضية.', 'Source verification unavailable; no fallback prices.', 'Source non vérifiable ; aucun prix de remplacement.')
      : L('المصدر متصل للفحص، وسجلاته منفصلة عن التقييم الحالي للعقار.', 'Source connected for inspection; its records remain separate from current-property valuation.', 'Source connectée pour consultation ; ses données restent séparées de l’estimation actuelle.')}</p>
    <p>{L('أحدث صفقة في العينة', 'Latest transaction in sample', 'Dernière transaction de l’échantillon')}: <bdi>{report.latestObservationOn ?? '—'}</bdi>{report.metadataUpdatedAt ? <> · {L('تحديث بيانات التعريف', 'Metadata update', 'Mise à jour des métadonnées')}: <bdi>{report.metadataUpdatedAt}</bdi></> : null}</p>
    <p>{L('وقت فحص المصدر', 'Source check time', 'Vérification de la source')}: <bdi>{report.retrievedAt ?? '—'}</bdi></p>
    {report.reasons.includes('STALE_OBSERVATIONS') ? <p>{L('أحدث الصفقات قديمة؛ تحديث صفحة المصدر لا يجعل أسعارها حديثة.', 'Latest transactions are stale; a metadata update does not refresh their prices.', 'Les dernières transactions sont anciennes ; les métadonnées ne rajeunissent pas les prix.')}</p> : null}
    {report.reasons.includes('SOURCE_CLASSIFICATION_REVIEW') ? <p>{L('تصنيفات العقار بالمصدر تحتاج مراجعة قبل استخدامها كمقارنات سعرية.', 'Source property classifications require reconciliation before use as valuation comparables.', 'Les classifications doivent être rapprochées avant toute utilisation comme comparables.')}</p> : null}
    {report.reasons.includes('CURRENCY_METADATA_MISSING') ? <p>{L('العملة غير مثبتة في الحقول المراجعة؛ الأرقام معروضة كما نشرها المصدر بلا افتراض عملة.', 'Currency is not explicit in the reviewed fields; values are shown without assuming a currency.', 'La devise n’est pas explicite ; les valeurs sont affichées sans devise supposée.')}</p> : null}
    {report.reasons.includes('AREA_METADATA_MISSING') ? <p>{L('المصدر يثبت سعر البيع لكنه لا يوفر مساحة موثوقة كافية لحساب سعر المتر؛ لذلك لا يتحول تلقائيًا إلى تقييم.', 'The source proves sale price but lacks dependable area data for price-per-area valuation, so it is not automatically promoted to a valuation.', 'La source confirme le prix de vente mais manque de surface fiable pour une valorisation au m².')}</p> : null}
    {report.reasons.includes('ADDRESS_RIGHTS_CONDITIONS') ? <p>{L('بيانات العنوان في Price Paid Data تخضع لشروط حقوق إضافية؛ THE SFM يستخدمها فقط ضمن الغرض المسموح لخدمة معلومات أسعار العقار.', 'Address fields in Price Paid Data carry additional rights conditions; THE SFM uses them only within the permitted residential property-price information purpose.', 'Les champs d’adresse sont soumis à des droits supplémentaires et ne sont utilisés que pour le service d’information sur les prix résidentiels autorisé.')}</p> : null}
    {report.reasons.includes('REGISTRATION_LAG') ? <p>{L('قد يتأخر تسجيل الصفقة عن تاريخ البيع، لذلك أحدث شهرين قد يكونان غير مكتملين.', 'Registration can lag the sale date, so the newest months may be incomplete.', 'L’enregistrement peut suivre la vente avec retard ; les mois récents peuvent être incomplets.')}</p> : null}
    {report.reasons.includes('NON_MARKET_SALES_REQUIRE_FILTERING') ? <p>{L('سجلات نيويورك قد تشمل تحويلات أو صفقات غير سوقية؛ وجود سعر لا يعني أنها مقارنة صالحة تلقائيًا.', 'NYC records can include transfers or non-market sales; a recorded price does not automatically make a row a valid comparable.', 'Les données de NYC peuvent inclure des transferts non marchands ; un prix enregistré n’est pas automatiquement un comparable valide.')}</p> : null}
    {report.reasons.includes('BUILDING_CLASS_MAPPING_REVIEW') ? <p>{L('تصنيف المبنى في نيويورك يحتاج مطابقة دقيقة مع نوع عقارك قبل اعتماد المقارنات.', 'NYC building classes must be mapped precisely to your asset type before comparables can be approved.', 'Les classes de bâtiments de NYC doivent être rapprochées précisément du type de bien.')}</p> : null}
    {report.reasons.includes('NON_ARMS_LENGTH_SALES_REQUIRE_REVIEW') ? <p>{L('مقاطعة كوك تنشر فلاتر لاستبعاد أنواع واضحة من الصفقات غير المناسبة، لكنها تنبه أن بعض الصفقات غير السوقية قد تبقى؛ لذلك نراجعها قبل اعتماد أي مقارنة.', 'Cook County publishes filters for obvious non-comparable transfers but warns that some non-arm’s-length sales can remain, so rows require review before comparable use.', 'Le comté de Cook publie des filtres, mais certaines ventes non conclues à distance peuvent subsister ; chaque transaction doit être vérifiée avant comparaison.')}</p> : null}
    {report.reasons.includes('SALES_REPORTING_LAG') ? <p>{L('بيانات مبيعات مقاطعة كوك قد تصل بعد التسجيل بأشهر؛ حداثة قاعدة البيانات لا تعني اكتمال أحدث الصفقات.', 'Cook County sales can populate months after recording; dataset freshness does not guarantee complete coverage of the newest transactions.', 'Les ventes du comté de Cook peuvent apparaître plusieurs mois après l’enregistrement ; la fraîcheur du jeu de données ne garantit pas l’exhaustivité récente.')}</p> : null}
    {report.reasons.includes('ENGLAND_WALES_ONLY') ? <p>{L('مصدر HM Land Registry هذا يغطي إنجلترا وويلز؛ اسكتلندا وأيرلندا الشمالية تحتاجان مصادر مختلفة.', 'This HM Land Registry source covers England and Wales; Scotland and Northern Ireland require separate sources.', 'Cette source couvre l’Angleterre et le pays de Galles ; l’Écosse et l’Irlande du Nord nécessitent d’autres sources.')}</p> : null}
    {report.status === 'INPUT_REQUIRED' ? <p>{L('أكمل الموقع المطلوب لتضييق السجلات الرسمية قبل البحث.', 'Complete the required location fields to narrow the official records.', 'Complétez les champs de localisation requis pour cibler les données officielles.')}</p> : null}
    {source ? <a href={source} target="_blank" rel="noopener noreferrer">{L('المصدر الرسمي', 'Official source', 'Source officielle')}</a> : null}
    {' · '}{license ? <a href={license} target="_blank" rel="noopener noreferrer">{report.licenseName}</a> : null}
    <p>{L('البيانات من الجهة الرسمية المذكورة؛ التنظيم والعرض: THE SFM. لا يمثل ذلك اعتمادًا حكوميًا.', 'Data from the named official authority; organization and presentation: THE SFM. No government endorsement.', 'Données de l’autorité officielle indiquée ; organisation et présentation : THE SFM. Aucun agrément gouvernemental.')}</p>
    {report.sampleTotal !== null ? <p>{L('عدد السجلات في العينة', 'Records in sample', 'Transactions dans l’échantillon')}: {number(report.sampleTotal)} · {L('المعروض بعد التحقق وإزالة التكرار', 'Shown after validation and deduplication', 'Affichées après validation et dédoublonnage')}: {number(report.records.length)}{report.sampleTruncated ? L(' — عينة محدودة، ليست كامل السوق.', ' — bounded sample, not the entire market.', ' — échantillon limité, pas tout le marché.') : ''}</p> : null}
    {report.reasons.includes('NO_LOCAL_RECORDS') ? <p>{L('لا توجد سجلات صالحة للعرض لهذه المنطقة في الاستجابة الحالية.', 'No displayable local records in this response.', 'Aucune transaction locale affichable dans cette réponse.')}</p> : null}
    {report.records.length > 0 ? <details><summary>{L('عرض سجلات المصدر، وليست تقييمًا', 'Inspect source records, not a valuation', 'Consulter les transactions, pas une estimation')} ({number(report.records.length)})</summary>
      {report.records.map(record => { const href = allowedSource(record.sourceUrl); return <article className="real-estate-analyst__evidence-row" key={record.id}>
        <div><strong>{lang === 'ar' && record.districtAr ? record.districtAr : record.district || record.municipality}</strong><small><bdi>{record.observedOn}</bdi></small><small dir="ltr">{record.propertyType || '—'}</small>{record.propertyTypeAr && record.propertyTypeAr !== record.propertyType ? <small lang="ar" dir="rtl">{record.propertyTypeAr}</small> : null}<small>{record.usage || '—'}</small></div>
        <div><small>{L('المساحة المنشورة', 'Reported area', 'Surface publiée')}: <bdi>{number(record.areaM2)} m²</bdi></small><small>{L('قيمة الصفقة المنشورة', 'Reported sale value', 'Valeur de vente publiée')}: <bdi>{money(record.reportedValue, record.currency)}</bdi></small><small>{L('القيمة المنشورة لكل م²', 'Reported value per m²', 'Valeur publiée par m²')}: <bdi>{record.reportedPricePerM2 === null ? '—' : money(record.reportedPricePerM2, record.currency)}</bdi></small><small>{record.fullOwnership ? L('حصة كاملة وفق الحقول المنشورة', 'Full share according to reported fields', 'Pleine quote-part selon les champs publiés') : L('حالة الملكية/الصفقة تحتاج مراجعة قبل المقارنة', 'Ownership/transaction status requires review before comparison', 'Le statut de propriété/transaction doit être vérifié avant comparaison')}</small></div>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer">{L('السجل بالمصدر', 'Source record', 'Transaction source')}</a> : null}
      </article>; })}
    </details> : null}
  </section>;
}
