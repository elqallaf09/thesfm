import { randomUUID } from 'node:crypto';
import { calculateFinancialRatios, isFinancialDataStale } from './financialRatioCalculator';
import type { BusinessScreenResult, EvidenceItem, FinancialValue, SecurityIdentity, ShariaMethodology, SourceDocument } from './types';

const BUSINESS_TYPES = new Set(['company_ir', 'annual_report', 'quarterly_report', 'fund_prospectus', 'sharia_board_document']);
const ISLAMIC_INSTITUTION = /\b(?:islamic bank|islamic banking|takaful|shariah?[- ](?:compliant|based) (?:bank|financial institution))\b|بنك إسلامي|مصرف إسلامي/i;
const DIRECT: Record<string, RegExp> = {
  conventional_financial_services: /\b(?:we are|the company is|our primary business is|our principal business is) (?:a |an )?(?:registered |regulated |national |state |leading )*(?:commercial bank|consumer lender|mortgage lender|conventional insurer|credit card issuer)\b/i,
  gambling: /\b(?:our principal business is operating|our primary business is operating) (?:a |an |the )?(?:casino|casinos|sports betting|gambling)\b/i,
  alcohol: /\b(?:we are|the company is|our principal business is) (?:a |an )?(?:brewery|distillery|wine producer|producer of alcoholic beverages)\b/i,
  tobacco_and_non_medical_cannabis: /\b(?:we (?:manufacture|produce)|the company (?:manufactures|produces)|our principal business is (?:manufacturing|producing)) (?:tobacco|cigarettes|recreational cannabis)\b/i,
  defense_and_weapons: /\b(?:we are|the company is|our principal business is) (?:a |an )?(?:weapons manufacturer|arms manufacturer|manufacturer of military weapons)\b/i,
};

export function analyzeBusinessEvidence(security: SecurityIdentity, documents: SourceDocument[], values: FinancialValue[], methodology: ShariaMethodology, evidence: EvidenceItem[], now: Date): BusinessScreenResult {
  const substantive = documents.filter(document => document.tier === 1 && document.reliability === 'official'
    && document.extractionStatus === 'success' && document.companyIdentifier === security.canonicalId
    && BUSINESS_TYPES.has(document.sourceType) && document.extractedText.length >= 600
    && !isFinancialDataStale(document.reportingPeriod ?? document.publicationDate?.slice(0, 10) ?? null, methodology.freshnessMonths, now));
  const officialDescriptionFound = substantive.length > 0;
  const detectedActivities: BusinessScreenResult['detectedActivities'] = [];
  const incomeMethod = { ...methodology, financialRatioRules: [{
    id: 'income-evidence', name: 'Combined income', nameAr: 'الدخل غير المتوافق', nameFr: 'Revenus non conformes',
    numeratorFields: ['interest_income', 'prohibited_revenue'] as FinancialValue['normalizedField'][],
    denominatorField: 'total_income' as const, operator: '<=' as const,
    threshold: methodology.businessRules.prohibitedRevenueThreshold, thresholdLabel: '5%',
    unavailableBehavior: 'insufficient_data' as const, sourceSection: methodology.businessRules.sourceSection,
  }] };
  const income = calculateFinancialRatios(values, incomeMethod, now)[0];
  const prohibitedRevenueRatio = income.status === 'pass' || income.status === 'fail' ? income.value : null;
  const result = (status: BusinessScreenResult['status'], reason: string): BusinessScreenResult => ({ status, detectedActivities, officialDescriptionFound, prohibitedRevenueRatio, reasons: [reason] });

  // Institution exception is checked BEFORE any conventional-finance phrase.
  if (substantive.some(document => ISLAMIC_INSTITUTION.test(document.extractedText))) {
    return result('review', 'An Islamic financial institution requires a documented institution-level Shariah review; ordinary corporate ratios are not an institutional certification.');
  }
  for (const [category, terms] of Object.entries(methodology.businessRules.supportingKeywords)) {
    const categoryEvidence: EvidenceItem[] = [];
    let materialityKnown = false;
    for (const document of substantive) {
      // Same-sentence principal-activity evidence, not adjacent customer/risk-factor mentions.
      const sentences = document.extractedText.split(/(?<=[.!?])\s+|\n+/);
      const sentence = sentences.find(text => terms.some(term => text.toLowerCase().includes(term.toLowerCase())));
      if (!sentence) continue;
      const direct = sentences.find(text => DIRECT[category]?.test(text)
        && !/\b(?:not|no longer|do not|does not|ceased)\b/i.test(text));
      const item: EvidenceItem = {
        id: randomUUID(), documentId: document.id, category: 'business_activity', conclusion: direct ? `Direct principal activity: ${category}` : `Activity mention requiring context: ${category}`,
        excerpt: (direct ?? sentence).slice(0, 1_200), sourceUrl: document.sourceUrl, sourceTitle: document.sourceTitle,
        publisher: document.publisher, publicationDate: document.publicationDate, retrievalDate: document.retrievalDate,
        tier: document.tier, reliability: document.reliability, reportingPeriod: document.reportingPeriod,
      };
      categoryEvidence.push(item); evidence.push(item); materialityKnown ||= Boolean(direct);
      if (categoryEvidence.length >= 3) break;
    }
    if (categoryEvidence.length) detectedActivities.push({ category, evidence: categoryEvidence, materialityKnown });
  }
  if (detectedActivities.some(activity => activity.materialityKnown)) {
    return result('fail', 'A current official issuer document explicitly describes its principal business as a configured excluded activity.');
  }
  if (income.status === 'fail') return result('fail', 'Documented interest and other non-compliant income already exceed the configured combined-income limit.');
  if (!officialDescriptionFound) return result('unavailable', 'No current substantive official issuer business description was extracted.');
  if (detectedActivities.length) return result('review', 'Activity mentions alone do not establish prohibited operations or their revenue share.');
  if (income.status !== 'pass') return result('review', `Quantified interest and other non-compliant revenue evidence is incomplete: ${income.warning}`);
  return result('pass', 'Current official business evidence and the quantified combined-income check passed.');
}
