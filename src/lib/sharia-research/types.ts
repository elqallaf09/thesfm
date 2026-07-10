export const SHARIA_CLASSIFICATIONS = [
  'compliant',
  'non_compliant',
  'requires_review',
  'insufficient_current_data',
  'conflicting_evidence',
] as const;

export type ShariaClassification = typeof SHARIA_CLASSIFICATIONS[number];
export type SourceTier = 1 | 2 | 3 | 4;
export type ReliabilityLevel = 'official' | 'high' | 'medium' | 'context_only' | 'unknown';
export type ExtractionStatus = 'success' | 'partial' | 'blocked' | 'unavailable' | 'failed';
export type SourceType =
  | 'company_ir'
  | 'annual_report'
  | 'quarterly_report'
  | 'exchange_filing'
  | 'regulatory_filing'
  | 'methodology'
  | 'fund_prospectus'
  | 'sharia_board_document'
  | 'financial_data'
  | 'news'
  | 'rss'
  | 'manual_url'
  | 'other';

export type NormalizedQuery = {
  original: string;
  normalized: string;
  compact: string;
  latinAlias: string | null;
  possibleTicker: string | null;
  possibleIsin: string | null;
  exchangeHint: string | null;
};

export type SecurityIdentity = {
  id?: string;
  canonicalId: string;
  name: string;
  nameAr?: string | null;
  ticker: string;
  providerSymbol: string;
  exchange: string;
  exchangeMic?: string | null;
  isin?: string | null;
  cik?: string | null;
  lei?: string | null;
  country?: string | null;
  sector?: string | null;
  industry?: string | null;
  currency?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  lastVerifiedAt?: string | null;
  aliases: string[];
  previousNames: string[];
  identitySources: Array<{
    title: string;
    url: string;
    publisher: string;
    retrievedAt: string;
    tier: SourceTier;
  }>;
};

export type SecurityCandidate = SecurityIdentity & {
  score: number;
  matchedOn: string[];
};

export type IdentityResolution =
  | { status: 'resolved'; query: NormalizedQuery; security: SecurityIdentity; candidates: SecurityCandidate[] }
  | { status: 'ambiguous'; query: NormalizedQuery; candidates: SecurityCandidate[] }
  | { status: 'not_found'; query: NormalizedQuery; candidates: SecurityCandidate[]; reason: string };

export type SourceDocument = {
  id: string;
  adapterId: string;
  sourceTitle: string;
  publisher: string;
  domain: string;
  sourceUrl: string;
  canonicalUrl: string;
  publicationDate: string | null;
  filingDate: string | null;
  retrievalDate: string;
  sourceType: SourceType;
  tier: SourceTier;
  reliability: ReliabilityLevel;
  extractedText: string;
  evidenceSnippets: string[];
  companyIdentifier: string;
  reportingPeriod: string | null;
  contentHash: string;
  mimeType: string | null;
  extractionStatus: ExtractionStatus;
  error: { code: string; message: string; retryable: boolean } | null;
  supports: string[];
  groupedUrls?: string[];
};

export type EvidenceItem = {
  id: string;
  documentId: string;
  category: 'identity' | 'business_activity' | 'financial_value' | 'methodology' | 'conflict' | 'news_context';
  conclusion: string;
  excerpt: string;
  sourceUrl: string;
  sourceTitle: string;
  publisher: string;
  publicationDate: string | null;
  retrievalDate: string;
  tier: SourceTier;
  reliability: ReliabilityLevel;
  reportingPeriod: string | null;
};

export type NormalizedFinancialField =
  | 'total_assets'
  | 'interest_bearing_debt'
  | 'cash_and_equivalents'
  | 'interest_bearing_securities'
  | 'accounts_receivable'
  | 'total_income'
  | 'prohibited_revenue'
  | 'interest_income'
  | 'market_capitalization';

export type FinancialValue = {
  id: string;
  documentId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceTier: SourceTier;
  reportingPeriod: string;
  periodEnd: string;
  filedAt: string | null;
  currency: string;
  value: number;
  unit: string;
  originalField: string;
  normalizedField: NormalizedFinancialField;
  normalizationFormula: string;
  accessionNumber?: string | null;
  form?: string | null;
};

export type RatioRule = {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  numeratorFields: NormalizedFinancialField[];
  denominatorField: NormalizedFinancialField;
  operator: '<=';
  threshold: number;
  thresholdLabel: string;
  unavailableBehavior: 'insufficient_data';
  sourceSection: string;
};

export type ShariaMethodology = {
  id: string;
  version: string;
  name: string;
  nameAr: string;
  nameFr: string;
  sourceDocument: {
    title: string;
    publisher: string;
    url: string;
    versionDate: string;
  };
  businessRules: {
    prohibitedRevenueThreshold: number;
    thresholdLabel: string;
    directActivityExclusions: string[];
    supportingKeywords: Record<string, string[]>;
    sourceSection: string;
  };
  financialRatioRules: RatioRule[];
  denominatorRules: string;
  purificationGuidance: string;
  freshnessMonths: number;
  notes: string[];
};

export type RatioResult = {
  ruleId: string;
  name: string;
  nameAr: string;
  nameFr: string;
  numerator: number | null;
  denominator: number | null;
  value: number | null;
  threshold: number;
  formula: string;
  status: 'pass' | 'fail' | 'unavailable';
  reportingPeriod: string | null;
  currency: string | null;
  inputs: FinancialValue[];
  warning: string | null;
};

export type BusinessScreenResult = {
  status: 'pass' | 'fail' | 'review' | 'unavailable';
  detectedActivities: Array<{
    category: string;
    evidence: EvidenceItem[];
    materialityKnown: boolean;
  }>;
  officialDescriptionFound: boolean;
  prohibitedRevenueRatio: number | null;
  reasons: string[];
};

export type SourceQualityBreakdown = Record<'tier1' | 'tier2' | 'tier3' | 'tier4', number>;

export type ShariaScreeningResult = {
  id: string;
  security: SecurityIdentity;
  classification: ShariaClassification;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  confidenceExplanation: string;
  methodology: ShariaMethodology;
  lastFinancialReportDate: string | null;
  reasons: string[];
  businessScreen: BusinessScreenResult;
  financialRatios: RatioResult[];
  failedChecks: string[];
  unavailableChecks: string[];
  conflicts: Array<{ field: string; summary: string; evidenceIds: string[] }>;
  sourceCount: number;
  sourceQualityBreakdown: SourceQualityBreakdown;
  documents: SourceDocument[];
  evidence: EvidenceItem[];
  relatedNews: SourceDocument[];
  retrievedAt: string;
  reportingPeriod: string | null;
  cacheState: 'live' | 'recently_cached' | 'outdated';
  warnings: string[];
};

export type AdapterContext = {
  query: NormalizedQuery;
  security: SecurityIdentity;
  retrievedAt: string;
  manualUrls?: string[];
  signal?: AbortSignal;
};

export type SourceAdapterResult = {
  adapterId: string;
  status: ExtractionStatus;
  documents: SourceDocument[];
  financialValues: FinancialValue[];
  identityPatch?: Partial<SecurityIdentity>;
  errors: Array<{ code: string; message: string; retryable: boolean; url?: string }>;
};

export type SourceAdapter = {
  id: string;
  label: string;
  tier: SourceTier;
  isEnabled: () => boolean;
  supports: (security: SecurityIdentity) => boolean;
  research: (context: AdapterContext) => Promise<SourceAdapterResult>;
};

export type ResearchProgressStep =
  | 'identifying_security'
  | 'awaiting_security_selection'
  | 'searching_official_sources'
  | 'retrieving_filings'
  | 'extracting_financial_data'
  | 'checking_business_activities'
  | 'calculating_ratios'
  | 'resolving_conflicts'
  | 'preparing_result';

export type ResearchJobStatus = 'queued' | 'running' | 'awaiting_selection' | 'completed' | 'failed' | 'cancelled' | 'expired';

export type ResearchJob = {
  id: string;
  userId: string;
  status: ResearchJobStatus;
  progress: number;
  currentStep: ResearchProgressStep;
  normalizedQuery: NormalizedQuery;
  securityId: string | null;
  methodologyId: string;
  resultId: string | null;
  candidates: SecurityCandidate[];
  partialErrors: SourceAdapterResult['errors'];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
};

export type SourceConfigurationStatus = {
  id: string;
  label: string;
  enabled: boolean;
  tier: SourceTier;
  requirement: string | null;
};
