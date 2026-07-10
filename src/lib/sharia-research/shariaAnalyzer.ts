import { randomUUID } from 'node:crypto';
import { calculateFinancialRatios, isFinancialDataStale } from './financialRatioCalculator';
import { evidenceReliabilityScore, sourceQualityBreakdown } from './sourceScoring';
import type {
  BusinessScreenResult,
  EvidenceItem,
  FinancialValue,
  SecurityIdentity,
  ShariaMethodology,
  ShariaScreeningResult,
  SourceDocument,
} from './types';

const BUSINESS_SOURCE_TYPES = new Set(['company_ir', 'annual_report', 'quarterly_report', 'regulatory_filing', 'fund_prospectus', 'sharia_board_document']);

function excerptAround(text: string, term: string) {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return '';
  return text.slice(Math.max(0, index - 180), Math.min(text.length, index + term.length + 320)).replace(/\s+/g, ' ').trim();
}

function evidenceFromDocument(document: SourceDocument, input: Pick<EvidenceItem, 'category' | 'conclusion' | 'excerpt'>): EvidenceItem {
  return {
    id: randomUUID(),
    documentId: document.id,
    category: input.category,
    conclusion: input.conclusion,
    excerpt: input.excerpt,
    sourceUrl: document.sourceUrl,
    sourceTitle: document.sourceTitle,
    publisher: document.publisher,
    publicationDate: document.publicationDate ?? document.filingDate,
    retrievalDate: document.retrievalDate,
    tier: document.tier,
    reliability: document.reliability,
    reportingPeriod: document.reportingPeriod,
  };
}

function hasStrongDirectActivityPhrase(excerpt: string, category: string) {
  const normalized = excerpt.toLowerCase();
  const directPattern = /(our principal business|our primary business|we are (?:a|an)|the company (?:is|operates|owns)|primarily engaged in)/;
  if (!directPattern.test(normalized)) return false;
  if (category === 'conventional_financial_services' && /(commercial bank|consumer lender|mortgage lender|conventional insurance|credit card issuer)/.test(normalized)) return true;
  if (category === 'gambling' && /(casino|gambling|sports betting|lottery)/.test(normalized)) return true;
  if (category === 'alcohol' && /(brewery|distillery|producer of alcoholic|wine producer)/.test(normalized)) return true;
  if (category === 'tobacco_and_non_medical_cannabis' && /(tobacco|cigarette|recreational cannabis)/.test(normalized)) return true;
  if (category === 'defense_and_weapons' && /(weapons manufacturer|defense equipment|missile systems)/.test(normalized)) return true;
  return false;
}

function analyzeBusiness(
  security: SecurityIdentity,
  documents: SourceDocument[],
  financialValues: FinancialValue[],
  methodology: ShariaMethodology,
  evidence: EvidenceItem[],
): BusinessScreenResult {
  const officialDocuments = documents.filter(document => (
    document.tier === 1
    && document.reliability === 'official'
    && document.extractionStatus === 'success'
    && BUSINESS_SOURCE_TYPES.has(document.sourceType)
  ));
  const substantiveDocuments = officialDocuments.filter(document => (
    ['annual_report', 'quarterly_report', 'company_ir', 'fund_prospectus', 'sharia_board_document'].includes(document.sourceType)
    && document.extractedText.length >= 600
  ));
  const officialDescriptionFound = substantiveDocuments.length > 0;
  const detectedActivities: BusinessScreenResult['detectedActivities'] = [];

  for (const [category, terms] of Object.entries(methodology.businessRules.supportingKeywords)) {
    const categoryEvidence: EvidenceItem[] = [];
    let materialityKnown = false;
    for (const document of substantiveDocuments) {
      for (const term of terms) {
        const excerpt = excerptAround(document.extractedText, term);
        if (!excerpt) continue;
        const item = evidenceFromDocument(document, {
          category: 'business_activity',
          conclusion: `Possible prohibited or questionable activity: ${category}`,
          excerpt,
        });
        evidence.push(item);
        categoryEvidence.push(item);
        if (hasStrongDirectActivityPhrase(excerpt, category)) materialityKnown = true;
        break;
      }
      if (categoryEvidence.length >= 3) break;
    }
    if (categoryEvidence.length > 0) detectedActivities.push({ category, evidence: categoryEvidence, materialityKnown });
  }

  const latestIncome = [...financialValues].filter(value => value.normalizedField === 'total_income').sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  const prohibitedRevenue = financialValues.find(value => value.normalizedField === 'prohibited_revenue' && value.periodEnd === latestIncome?.periodEnd);
  const interestIncome = financialValues.find(value => value.normalizedField === 'interest_income' && value.periodEnd === latestIncome?.periodEnd);
  const prohibitedRevenueRatio = latestIncome && latestIncome.value > 0 && prohibitedRevenue && interestIncome
    ? (prohibitedRevenue.value + interestIncome.value) / latestIncome.value
    : null;
  const reasons: string[] = [];

  if (!officialDescriptionFound) {
    reasons.push('No current substantive Tier 1 business description was extracted.');
    return { status: 'unavailable', detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons };
  }
  if (prohibitedRevenueRatio !== null && prohibitedRevenueRatio > methodology.businessRules.prohibitedRevenueThreshold) {
    reasons.push('Documented prohibited and interest income exceeds the methodology limit.');
    return { status: 'fail', detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons };
  }
  if (detectedActivities.some(activity => activity.materialityKnown)) {
    reasons.push('An official company source describes a directly excluded principal activity.');
    return { status: 'fail', detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons };
  }
  if (detectedActivities.length > 0) {
    reasons.push('Questionable activity terms were found, but public evidence does not establish their revenue materiality.');
    return { status: 'review', detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons };
  }
  reasons.push('Current official business descriptions were found and no configured excluded activity was identified in the extracted evidence.');
  if (prohibitedRevenueRatio === null) {
    reasons.push('Separate prohibited-revenue and interest-income amounts were not both disclosed; neither missing value was treated as zero.');
    return { status: 'review', detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons };
  }
  return { status: 'pass', detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons };
}

function addFinancialEvidence(values: FinancialValue[], documents: SourceDocument[], evidence: EvidenceItem[]) {
  const documentById = new Map(documents.map(document => [document.id, document]));
  const seen = new Set<string>();
  for (const value of values) {
    const key = `${value.documentId}:${value.normalizedField}:${value.periodEnd}:${value.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const document = documentById.get(value.documentId);
    if (!document) continue;
    evidence.push(evidenceFromDocument(document, {
      category: 'financial_value',
      conclusion: `Financial input: ${value.normalizedField}`,
      excerpt: `${value.originalField} = ${value.value} ${value.currency}; period ${value.periodEnd}; normalization: ${value.normalizationFormula}`,
    }));
  }
}

function confidenceScore(input: {
  documents: SourceDocument[];
  business: BusinessScreenResult;
  availableRatioCount: number;
  ratioCount: number;
  stale: boolean;
  conflicts: number;
}) {
  const business = input.business.status === 'pass' || input.business.status === 'fail' ? 25 : input.business.status === 'review' ? 15 : 0;
  const ratios = Math.round((input.availableRatioCount / Math.max(input.ratioCount, 1)) * 40);
  const reliability = evidenceReliabilityScore(input.documents);
  const freshness = input.stale ? 0 : 10;
  const conflictPenalty = input.conflicts > 0 ? 25 : 0;
  return Math.max(0, Math.min(95, business + ratios + reliability + freshness - conflictPenalty));
}

/**
 * Evidence completeness (confidenceScore) measures how much verifiable evidence was gathered.
 * Classification confidence measures something different: given that evidence, how sure the
 * decisive signal is — i.e. how close ratios sit to their pass/fail threshold, how directly the
 * business screen evidence supports its verdict, and how well-corroborated the decisive documents
 * are. For the "we can't decide" classifications, it instead scores how clearly that gap/conflict
 * is established, not directional certainty.
 */
function classificationConfidenceScore(input: {
  classification: ShariaScreeningResult['classification'];
  business: BusinessScreenResult;
  ratios: RatioResultForConfidence[];
  documents: SourceDocument[];
  conflictCount: number;
  stale: boolean;
}) {
  const { classification, business, ratios, documents, conflictCount, stale } = input;

  if (classification === 'conflicting_evidence') {
    const highTierSources = documents.filter(document => document.tier <= 2).length;
    return Math.max(0, Math.min(100, 50 + Math.min(highTierSources * 8, 30) + Math.min(conflictCount * 5, 20)));
  }

  if (classification === 'insufficient_current_data') {
    const evaluated = ratios.length + 1;
    const unavailable = ratios.filter(ratio => ratio.status === 'unavailable').length + (business.status === 'unavailable' ? 1 : 0);
    const gapClarity = evaluated > 0 ? unavailable / evaluated : 0;
    const staleBonus = stale ? 20 : 0;
    return Math.max(0, Math.min(100, 45 + Math.round(gapClarity * 35) + staleBonus));
  }

  const evaluatedRatios = ratios.filter(ratio => ratio.status === 'pass' || ratio.status === 'fail');
  const ratioMargins = evaluatedRatios.map(ratio => {
    if (ratio.value === null || ratio.threshold <= 0) return 0;
    return Math.min(1, Math.abs(ratio.threshold - ratio.value) / ratio.threshold);
  });
  const avgRatioMargin = ratioMargins.length > 0 ? ratioMargins.reduce((sum, margin) => sum + margin, 0) / ratioMargins.length : 0;
  const marginScore = Math.round(avgRatioMargin * 40);

  const businessHasClearSignal = business.status === 'pass'
    || (business.status === 'fail' && business.detectedActivities.some(activity => activity.materialityKnown));
  const businessClarity = businessHasClearSignal ? 20 : business.status === 'review' ? 5 : 0;

  const corroboratingSources = documents.filter(document => document.tier === 1 && document.extractionStatus === 'success').length;
  const corroboration = Math.min(20, corroboratingSources * 5);

  const base = classification === 'requires_review' ? 30 : 40;
  return Math.max(0, Math.min(100, base + marginScore + businessClarity + corroboration));
}

type RatioResultForConfidence = Pick<ShariaScreeningResult['financialRatios'][number], 'status' | 'value' | 'threshold'>;

export function analyzeShariaEvidence(input: {
  security: SecurityIdentity;
  documents: SourceDocument[];
  financialValues: FinancialValue[];
  methodology: ShariaMethodology;
  conflicts?: ShariaScreeningResult['conflicts'];
  evidence?: EvidenceItem[];
  retrievedAt?: string;
}): ShariaScreeningResult {
  const retrievedAt = input.retrievedAt ?? new Date().toISOString();
  const evidence = input.evidence ?? [];
  const decisionDocuments = input.documents.filter(document => !['news', 'rss'].includes(document.sourceType));
  const relatedNews = input.documents.filter(document => ['news', 'rss'].includes(document.sourceType));
  const ratios = calculateFinancialRatios(input.financialValues, input.methodology);
  const business = analyzeBusiness(input.security, decisionDocuments, input.financialValues, input.methodology, evidence);
  addFinancialEvidence(input.financialValues, decisionDocuments, evidence);
  const conflicts = input.conflicts ?? [];
  const lastFinancialReportDate = ratios.map(ratio => ratio.reportingPeriod).filter((value): value is string => Boolean(value)).sort((a, b) => b.localeCompare(a))[0] ?? null;
  const stale = isFinancialDataStale(lastFinancialReportDate, input.methodology.freshnessMonths, new Date(retrievedAt));
  const unavailableChecks = ratios.filter(ratio => ratio.status === 'unavailable').map(ratio => ratio.name);
  if (business.status === 'unavailable') unavailableChecks.push('فحص النشاط التجاري');
  const failedChecks = ratios.filter(ratio => ratio.status === 'fail').map(ratio => ratio.name);
  if (business.status === 'fail') failedChecks.push('فحص النشاط التجاري');

  let classification: ShariaScreeningResult['classification'];
  if (conflicts.length > 0) classification = 'conflicting_evidence';
  else if (stale) classification = 'insufficient_current_data';
  else if (failedChecks.length > 0) classification = 'non_compliant';
  else if (unavailableChecks.length > 0) classification = 'insufficient_current_data';
  else if (business.status === 'review') classification = 'requires_review';
  else if (business.status === 'pass' && ratios.every(ratio => ratio.status === 'pass')) classification = 'compliant';
  else classification = 'requires_review';

  const score = confidenceScore({
    documents: decisionDocuments,
    business,
    availableRatioCount: ratios.filter(ratio => ratio.status !== 'unavailable').length,
    ratioCount: ratios.length,
    stale,
    conflicts: conflicts.length,
  });
  const confidenceLabel = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low';
  const classificationConfidence = classificationConfidenceScore({
    classification,
    business,
    ratios,
    documents: decisionDocuments,
    conflictCount: conflicts.length,
    stale,
  });
  const classificationConfidenceLabel = classificationConfidence >= 80 ? 'high' : classificationConfidence >= 55 ? 'medium' : 'low';
  const reasons = [
    ...business.reasons,
    ...ratios.map(ratio => ratio.status === 'unavailable'
      ? `${ratio.name}: unavailable — ${ratio.warning}`
      : `${ratio.name}: ${(Number(ratio.value) * 100).toFixed(2)}% versus ${(ratio.threshold * 100).toFixed(2)}%.`),
  ];
  const warnings = [
    'This confidence score measures source reliability and completeness, not religious certainty.',
    ...(stale ? [`The latest usable financial period (${lastFinancialReportDate ?? 'unknown'}) exceeds the ${input.methodology.freshnessMonths}-month freshness limit.`] : []),
    ...(relatedNews.length ? ['News is displayed as supporting context only and was excluded from the classification decision.'] : []),
    ...(input.financialValues.some(value => value.normalizedField === 'interest_bearing_securities')
      ? ['Marketable-security XBRL labels may include instruments whose interest-bearing nature requires manual verification.']
      : []),
  ];

  return {
    id: randomUUID(),
    security: input.security,
    classification,
    confidence: score,
    confidenceLabel,
    confidenceExplanation: `Evidence completeness score: ${score}/100. It reflects source tier, extraction success, current-period ratio coverage, and conflicts.`,
    classificationConfidence,
    classificationConfidenceLabel,
    classificationConfidenceExplanation: `Classification confidence: ${classificationConfidence}/100. It reflects how far ratios sit from their threshold, how directly the business-screen evidence supports the verdict, and corroboration across Tier-1 sources — separate from evidence completeness.`,
    methodology: input.methodology,
    lastFinancialReportDate,
    reasons,
    businessScreen: business,
    financialRatios: ratios,
    failedChecks,
    unavailableChecks,
    conflicts,
    sourceCount: input.documents.length,
    sourceQualityBreakdown: sourceQualityBreakdown(input.documents),
    documents: decisionDocuments,
    evidence,
    relatedNews,
    retrievedAt,
    reportingPeriod: lastFinancialReportDate,
    cacheState: 'live',
    warnings,
  };
}
