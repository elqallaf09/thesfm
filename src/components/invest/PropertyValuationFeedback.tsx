'use client';

import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { RealEstateAnalystResult } from '@/lib/investments/intelligence/analyst';

export function PropertyValuationFeedback({ analysis }: { analysis: RealEstateAnalystResult }) {
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const valuation = analysis.valuation;
  const reasons = [...new Set(analysis.sourceFailures.map(item => item.reason))];
  const reasonText = (code: string) => {
    if (code === 'NYC_NEIGHBORHOOD_REQUIRED') return L('اختر بلدية نيويورك وأدخل اسم الحي الرسمي. المقارنة على مستوى البلدية كاملة لا تكفي.', 'Select a NYC borough and enter its official neighborhood. Borough-wide comparisons are too broad.', 'Choisissez l’arrondissement et son quartier officiel. Un arrondissement entier est trop large.');
    if (code === 'COOK_NEIGHBORHOOD_REQUIRED') return L('أدخل رمز حي المقيم العقاري في شيكاغو من 5 أرقام في خانة الحي.', 'Enter the five-digit Chicago assessor neighborhood code in the district field.', 'Saisissez le code de quartier de l’évaluateur de Chicago à cinq chiffres.');
    if (code === 'PROPERTY_TYPE_UNSUPPORTED') return L('التقييم المتصل يدعم المنازل الفردية في نيويورك وشيكاغو، والأراضي السكنية الخالية في نيويورك. هذا النوع يحتاج مصدرًا إضافيًا.', 'Connected valuation supports one-family houses in NYC and Chicago, and residential vacant land in NYC. This type needs an additional source.', 'L’estimation couvre les maisons individuelles à New York et Chicago, et les terrains résidentiels nus à New York. Ce type exige une autre source.');
    if (code === 'AREA_REQUIRED') return L('أدخل مساحة الأرض للأرض الخالية، أو مساحة المبنى للمنزل مع وحدتها.', 'Enter land area for vacant land, or building floor area for a house, with its unit.', 'Saisissez la surface du terrain nu ou du bâtiment et son unité.');
    return L('تعذر استرجاع أحد المصادر. أعد البحث؛ لن تُستبدل بياناته بأسعار افتراضية.', 'A source could not be retrieved. Retry the search; no assumed prices replace it.', 'Une source est indisponible. Relancez la recherche ; aucun prix supposé ne la remplace.');
  };
  return <div className="real-estate-analyst__research" aria-label={L('تفاصيل التقييم الآلي', 'Automatic valuation details', 'Détails de l’estimation automatique')}>
    {valuation?.status === 'VALUED' ? <>
      <h3>{valuation.estimateKind === 'PRELIMINARY' ? L('تقدير أولي · عينة محدودة', 'Preliminary estimate · small sample', 'Estimation préliminaire · petit échantillon') : L('نطاق المقارنات العقارية', 'Property comparable range', 'Fourchette des biens comparables')}</h3>
      <p>{L('يعتمد على صفقات مسجلة خلال 366 يومًا، بنفس الحي والنوع ومساحة مقاربة. لا يشمل تعديلات حالة العقار أو حقوقه أو التحقق المستقل من علاقة أطراف البيع.', 'Based on recorded sales within 366 days, matching neighborhood, type and similar area. Property condition, title and seller/buyer relationships are not independently verified or adjusted.', 'Fondé sur des ventes enregistrées depuis 366 jours, de quartier, type et surface comparables. L’état du bien, les droits et les liens entre parties ne sont pas vérifiés ni ajustés.')}</p>
      <p>{valuation.estimateKind === 'PRELIMINARY' ? L('أقل من 5 صفقات: نعرض كامل نطاق العينة بثقة منخفضة. النطاق ليس ضمانًا لسعر البيع.', 'Fewer than five sales: the full sample range is shown with low confidence. It is not a guaranteed sale price.', 'Moins de cinq ventes : plage complète de l’échantillon et faible confiance. Le prix de vente n’est pas garanti.') : L('النطاق بين الربيعين 25% و75% من أسعار المتر المرجحة؛ القيمة الوسطية هي الوسيط، وليست تنبؤًا مضمونًا.', 'Range: weighted 25th–75th percentiles of price per area; midpoint: weighted median. This is not a guaranteed prediction.', 'Fourchette : 25e–75e centiles pondérés du prix par surface ; valeur centrale : médiane pondérée. Aucune prédiction garantie.')}</p>
      <p>{L('أساس المساحة:', 'Area basis:', 'Base de surface :')} {valuation.areaBasis === 'BUILT' ? L('مساحة المبنى', 'Building floor area', 'Surface du bâtiment') : L('مساحة الأرض', 'Land area', 'Surface du terrain')} · {L('إصدار المنهجية', 'Methodology version', 'Version de méthode')} <bdi>{valuation.methodologyVersion}</bdi></p>
      {analysis.nativeCurrencyFallback ? <p role="status">{L('عُرض التقدير بعملة المصدر لعدم توفر تحويل موثّق إلى عملة حسابك. لم تُحوّل الأسعار.', 'The estimate uses the source currency because a verified conversion to your account currency is unavailable. Prices were not converted.', 'L’estimation utilise la devise source faute de conversion vérifiée vers votre devise de compte. Les prix ne sont pas convertis.')}</p> : null}
    </> : valuation ? <p>{L('لم تجتز صفقتان مستقلتان على الأقل فحوص الحداثة والموقع والنوع والمساحة والعملة. راجع الحي ومساحة العقار؛ تغيير سعر الشراء لا يصنع أدلة سوقية.', 'Fewer than two independent sales passed freshness, location, type, area and currency checks. Check the neighborhood and property area; changing purchase price cannot create market evidence.', 'Moins de deux ventes indépendantes satisfont les contrôles de date, lieu, type, surface et devise. Vérifiez le quartier et la surface ; modifier le prix d’achat ne crée pas de preuves.')}</p> : null}
    {reasons.map(reason => <p key={reason}>{reasonText(reason)}</p>)}
  </div>;
}
