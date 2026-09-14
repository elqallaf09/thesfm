import { randomUUID } from 'node:crypto';
import { analyzeBusinessEvidence } from './businessEvidence';
import { EVIDENCE_VERSION, missingFinancialFields, validFinancialValue } from './evidenceValidation';
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
  const sourceById = new Map(decisionDocuments.map(document => [document.id, document]));
  const supportedValues = input.financialValues.filter(value => {
    const source = sourceById.get(value.documentId);
    return source && source.companyIdentifier === input.security.canonicalId && source.extractionStatus === 'success'
      && source.tier <= 2 && source.sourceUrl === value.sourceUrl;
  });
  const ratios = calculateFinancialRatios(supportedValues, input.methodology, new Date(retrievedAt));
  const business = analyzeBusinessEvidence(input.security, decisionDocuments, supportedValues, input.methodology, evidence, new Date(retrievedAt));
  addFinancialEvidence(supportedValues.filter(value => validFinancialValue(value, new Date(retrievedAt))), decisionDocuments, evidence);
  const conflicts = input.conflicts ?? [];
  const lastFinancialReportDate = ratios.map(ratio => ratio.reportingPeriod).filter((value): value is string => Boolean(value)).sort((a, b) => b.localeCompare(a))[0] ?? null;
  const stale = isFinancialDataStale(lastFinancialReportDate, input.methodology.freshnessMonths, new Date(retrievedAt));
  const unavailableChecks = ratios.filter(ratio => ratio.status === 'unavailable').map(ratio => ratio.name);
  if (business.status === 'unavailable' || business.status === 'review') unavailableChecks.push('فحص النشاط التجاري والدخل غير المتوافق');
  const failedChecks = ratios.filter(ratio => ratio.status === 'fail').map(ratio => ratio.name);
  if (business.status === 'fail') failedChecks.push('فحص النشاط التجاري');

  let classification: ShariaScreeningResult['classification'];
  if (conflicts.length > 0) classification = 'conflicting_evidence';
  else if (business.institutionalReviewRequired) classification = 'requires_review';
  else if (business.status === 'fail' || failedChecks.length > 0) classification = 'non_compliant';
  else if (stale) classification = 'insufficient_current_data';
  else if (unavailableChecks.length > 0) classification = 'insufficient_current_data';
  else if (business.status === 'review') classification = 'requires_review';
  else if (business.status === 'pass' && ratios.every(ratio => ratio.status === 'pass')) classification = 'compliant';
  else classification = 'requires_review';

  const score = confidenceScore({
    documents: decisionDocuments.filter(document => document.sourceType !== 'methodology'),
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
    documents: decisionDocuments.filter(document => document.sourceType !== 'methodology'),
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
    evidenceVersion: EVIDENCE_VERSION,
    missingFinancialFields: missingFinancialFields(supportedValues, new Date(retrievedAt)),
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
    documents: decisionDocuments.filter(document => document.sourceType !== 'methodology'),
    evidence,
    relatedNews,
    retrievedAt,
    reportingPeriod: lastFinancialReportDate,
    cacheState: 'live',
    warnings,
  };
}
