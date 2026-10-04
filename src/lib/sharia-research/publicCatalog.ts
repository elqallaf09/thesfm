import { EVIDENCE_VERSION } from './evidenceValidation';
import { isFinancialDataStale } from './financialRatioCalculator';
import { SFM_FTSE_POINT_IN_TIME } from './methodologies';
import { resolveCatalogBoubyanReference } from '@/lib/market/boubyanReference.server';
import { boubyanSecurityKey } from '@/lib/market/boubyanReference';
import { decideBoubyanReference } from '@/lib/market/boubyanDecision';
import { BOUBYAN_METHODOLOGY } from '@/lib/market/boubyanReferenceMetadata';

export type CatalogRow = {
  symbol: string; name?: string | null; asset_type?: string | null; sector?: string | null;
  provider_symbol?: string | null; country?: string | null;
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
  const manualOverride = row.shariah_manual_override === true;
  const manual = manualOverride && Boolean(row.shariah_reason?.trim() && row.shariah_source?.trim())
    && Number.isFinite(reviewed) && reviewed <= now.getTime();
  const financial = data.screeningRules && typeof data.screeningRules === 'object'
    ? (data.screeningRules as { financial?: unknown }).financial : null;
  const persistedStatus = row.shariah_status || 'unclassified';
  let status = persistedStatus;
  if (status !== 'unclassified' && ((!recent && !manual) || (!proven && !fund && !manual))) status = 'needs_review';
  if (status === 'compliant' && !manual && !fund && isFinancialDataStale(typeof data.financialPeriod === 'string' ? data.financialPeriod : null, SFM_FTSE_POINT_IN_TIME.freshnessMonths, now)) status = 'needs_review';
  // A generic fund evidence review remains needs_review. A currently verified
  // provider/SSB Shariah designation is a separate public status: the fund is
  // presented as published-Shariah, while the persisted SFM review can remain
  // needs_review for periodic holdings/source monitoring. A persisted failure is
  // never hidden by the published designation.
  if (fund && !manualOverride && persistedStatus !== 'non_compliant') status = 'needs_review';
  if (publishedDesignation && !manualOverride && persistedStatus !== 'non_compliant') status = 'compliant';
  const labels = { compliant: 'اجتاز الفحص', non_compliant: 'لم يجتز الفحص', needs_review: 'يحتاج مراجعة', unclassified: 'غير مصنف' };
  if (!(status in labels)) status = 'needs_review';
  const statusKey = status as keyof typeof labels;
  const reason = manual ? {
    ar: `مراجعة يدوية موثقة: ${row.shariah_reason}`,
    en: `Documented manual review: ${row.shariah_reason}`,
    fr: `Avis manuel documenté : ${row.shariah_reason}`,
  } : publishedDesignation && !manualOverride && persistedStatus !== 'non_compliant'
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
  const visiblePublishedDesignation = publishedDesignation && !manualOverride && persistedStatus !== 'non_compliant';
  const identity = { symbol: row.symbol, providerSymbol: row.provider_symbol, name: row.name,
    assetType: row.asset_type, exchange: row.exchange, country: row.country };
  const independentItem = {
    symbol: row.symbol, name: row.name || row.symbol, sector: row.sector || '', industry: '', exchange: row.exchange,
    providerSymbol: row.provider_symbol ?? null, country: row.country ?? null,
    canonicalSecurityId: boubyanSecurityKey(identity),
    assetType: row.asset_type === 'etf' ? 'etf' as const : 'stock' as const, shariahStatus: statusKey,
    statusLabelAr: visiblePublishedDesignation ? 'توافق شرعي منشور' : labels[statusKey], reason,
    screeningSource: (proven || fund || manual) ? row.shariah_source ?? null : null,
    methodology: manual
      ? { ar: 'مراجعة يدوية موثقة', en: 'Documented manual review', fr: 'Avis manuel documenté' }
      : visiblePublishedDesignation
        ? { ar: 'منهجية شرعية منشورة + تحقق دوري من المصدر', en: 'Published Shariah methodology + periodic source verification', fr: 'Méthodologie charia publiée + vérification périodique de la source' }
        : fund
          ? { ar: 'مراجعة أدلة صندوق — ليست اعتمادًا شرعيًا', en: 'Fund evidence review — not certification', fr: 'Examen des preuves du fonds — sans certification' }
          : { ar: SFM_FTSE_POINT_IN_TIME.nameAr, en: SFM_FTSE_POINT_IN_TIME.name, fr: SFM_FTSE_POINT_IN_TIME.nameFr },
    lastScreenedAt: Number.isFinite(reviewed) && reviewed <= now.getTime() ? row.shariah_last_reviewed_at ?? null : null,
    fieldCoverage: proven && Array.isArray(data.fieldCoverage) ? data.fieldCoverage : [],
    fundReview: fund ? fundReview : null,
    publishedShariahDesignation: visiblePublishedDesignation ? designation : null,
    financialRatios: !fund && proven && Array.isArray(financial) ? financial : null,
    missingFinancialFields: proven && Array.isArray(data.missingFinancialFields) ? data.missingFinancialFields : [],
    notes: reason,
  };
  const decision = decideBoubyanReference(resolveCatalogBoubyanReference(identity, { now }), {
    status: statusKey,
    source: independentItem.screeningSource,
    reviewedAt: independentItem.lastScreenedAt,
    manualOverride,
    verifiedFailure: statusKey === 'non_compliant' && (proven || fund || manual),
  }, now);
  const referenceFields = {
    publishedShariahReference: decision.reference,
    boubyanReferenceState: decision.resolution?.state ?? null,
    boubyanReferenceReason: decision.resolution?.reason ?? null,
    sourceConflict: decision.conflict,
    independentScreening: decision.reference && (proven || fund || manual) ? independentItem : null,
  };
  if (!decision.applies || !decision.reference) return { ...independentItem, ...referenceFields };
  return {
    ...independentItem,
    ...referenceFields,
    canonicalSecurityId: decision.reference.canonicalId,
    shariahStatus: decision.status,
    statusLabelAr: decision.conflict ? 'تعارض بين المصادر' : decision.resolution!.statusLabel.ar,
    reason: decision.reason ?? reason,
    screeningSource: decision.reference.sourceName,
    methodology: BOUBYAN_METHODOLOGY,
    lastScreenedAt: decision.reference.checkedAt,
    fieldCoverage: [],
    fundReview: null,
    publishedShariahDesignation: null,
    financialRatios: null,
    missingFinancialFields: [],
    notes: decision.reason ?? reason,
    independentScreening: proven || fund || manual ? independentItem : null,
  };
}
