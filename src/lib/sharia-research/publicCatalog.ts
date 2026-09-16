import { EVIDENCE_VERSION } from './evidenceValidation';
import { isFinancialDataStale } from './financialRatioCalculator';
import { SFM_FTSE_POINT_IN_TIME } from './methodologies';

type CatalogRow = {
  symbol: string; name?: string | null; asset_type?: string | null; sector?: string | null;
  exchange?: string | null; shariah_status?: string | null; shariah_manual_override?: boolean | null;
  shariah_source?: string | null; shariah_reason?: string | null; shariah_last_reviewed_at?: string | null;
  shariah_screening_data?: Record<string, unknown> | null;
};
export function publicCatalogItem(row: CatalogRow, now = new Date()) {
  const data = row.shariah_screening_data ?? {};
  const reviewed = row.shariah_last_reviewed_at ? Date.parse(row.shariah_last_reviewed_at) : NaN;
  const recent = Number.isFinite(reviewed) && reviewed <= now.getTime() && now.getTime() - reviewed < 7 * 86_400_000;
  const proven = data.evidenceVersion === EVIDENCE_VERSION && data.methodologyId === SFM_FTSE_POINT_IN_TIME.id && data.methodologyVersion === SFM_FTSE_POINT_IN_TIME.version;
  const fund = row.asset_type === 'etf' && data.evidenceVersion === EVIDENCE_VERSION
    && data.methodologyId === 'SFM_FUND_EVIDENCE_REVIEW' && data.methodologyVersion === '1';
  const fundReview = fund && data.fundReview && typeof data.fundReview === 'object'
    ? data.fundReview as Record<string, unknown> : null;
  const designation = fundReview?.publishedShariahDesignation && typeof fundReview.publishedShariahDesignation === 'object'
    ? fundReview.publishedShariahDesignation as Record<string, unknown> : null;
  const publishedDesignation = Boolean(recent && designation?.state === 'verified'
    && typeof designation.sourceUrl === 'string' && typeof designation.provider === 'string');
  const manual = row.shariah_manual_override === true && Boolean(row.shariah_reason && row.shariah_source);
  const financial = data.screeningRules && typeof data.screeningRules === 'object'
    ? (data.screeningRules as { financial?: unknown }).financial : null;
  const persistedStatus = row.shariah_status || 'unclassified';
  let status = persistedStatus;
  if (status !== 'unclassified' && (!recent || (!proven && !manual))) status = 'needs_review';
  if (status === 'compliant' && !manual && isFinancialDataStale(typeof data.financialPeriod === 'string' ? data.financialPeriod : null, SFM_FTSE_POINT_IN_TIME.freshnessMonths, now)) status = 'needs_review';
  // A generic fund evidence review remains needs_review. A currently verified
  // provider/SSB Shariah designation is a separate public status: the fund is
  // presented as published-Shariah, while the persisted SFM review can remain
  // needs_review for periodic holdings/source monitoring. A persisted failure is
  // never hidden by the published designation.
  if (fund && !manual) status = 'needs_review';
  if (publishedDesignation && !manual && persistedStatus !== 'non_compliant') status = 'compliant';
  const labels = { compliant: 'اجتاز الفحص', non_compliant: 'لم يجتز الفحص', needs_review: 'يحتاج مراجعة', unclassified: 'غير مصنف' };
  if (!(status in labels)) status = 'needs_review';
  const statusKey = status as keyof typeof labels;
  const reason = publishedDesignation && persistedStatus !== 'non_compliant'
    ? {
        ar: 'يوجد توافق شرعي منشور من مدير الصندوق/جهته الشرعية وتم التحقق من المصدر الرسمي. متابعة THE SFM هنا تحقق دوري من استمرار المصدر والمنهجية، وليست إعادة إصدار فتوى من الصفر.',
        en: 'The fund has a published Shariah designation verified from its official source. THE SFM performs periodic source/methodology monitoring rather than issuing a new fatwa.',
        fr: 'Le fonds dispose d’une désignation charia publiée et vérifiée depuis sa source officielle. THE SFM effectue un suivi périodique de la source et de la méthodologie, sans émettre une nouvelle fatwa.',
      }
    : status === 'compliant'
      ? { ar: 'اجتازت الأدلة الحالية فحوص المنهجية المحددة؛ ليست فتوى أو اعتمادًا رسميًا.', en: 'Current evidence passed the specified screen; not a fatwa or certification.', fr: 'Les preuves actuelles satisfont le filtre indiqué ; ni fatwa ni certification.' }
      : status === 'non_compliant'
        ? { ar: 'توجد أدلة حالية على عدم اجتياز فحص واحد على الأقل؛ راجع المصدر والسبب.', en: 'Current evidence fails at least one required check; inspect the source and reason.', fr: 'Une preuve actuelle indique au moins un échec ; consulter la source et le motif.' }
        : { ar: 'لا توجد نتيجة مكتملة وحديثة قابلة للاعتماد. نقص البيانات لا يعني التوافق أو عدمه.', en: 'No complete current determination. Missing evidence proves neither compliance nor non-compliance.', fr: 'Aucune conclusion complète et actuelle. Une donnée absente ne prouve ni conformité ni non-conformité.' };
  const visiblePublishedDesignation = publishedDesignation && persistedStatus !== 'non_compliant';
  return {
    symbol: row.symbol, name: row.name || row.symbol, sector: row.sector || '', industry: '', exchange: row.exchange,
    assetType: row.asset_type === 'etf' ? 'etf' : 'stock', shariahStatus: statusKey,
    statusLabelAr: visiblePublishedDesignation ? 'توافق شرعي منشور' : labels[statusKey], reason,
    screeningSource: (proven || fund || manual) ? row.shariah_source ?? null : null,
    methodology: manual
      ? { ar: 'مراجعة يدوية موثقة', en: 'Documented manual review', fr: 'Avis manuel documenté' }
      : visiblePublishedDesignation
        ? { ar: 'منهجية شرعية منشورة + تحقق دوري من المصدر', en: 'Published Shariah methodology + periodic source verification', fr: 'Méthodologie charia publiée + vérification périodique de la source' }
        : fund
          ? { ar: 'مراجعة أدلة صندوق — ليست اعتمادًا شرعيًا', en: 'Fund evidence review — not certification', fr: 'Examen des preuves du fonds — sans certification' }
          : { ar: SFM_FTSE_POINT_IN_TIME.nameAr, en: SFM_FTSE_POINT_IN_TIME.name, fr: SFM_FTSE_POINT_IN_TIME.nameFr },
    lastScreenedAt: Number.isFinite(reviewed) && reviewed <= now.getTime() ? row.shariah_last_reviewed_at : null,
    fieldCoverage: proven && Array.isArray(data.fieldCoverage) ? data.fieldCoverage : [],
    fundReview: fund ? fundReview : null,
    publishedShariahDesignation: visiblePublishedDesignation ? designation : null,
    financialRatios: !fund && proven && Array.isArray(financial) ? financial : null,
    missingFinancialFields: proven && Array.isArray(data.missingFinancialFields) ? data.missingFinancialFields : [],
    notes: reason,
  };
}
