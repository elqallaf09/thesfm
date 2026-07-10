import 'server-only';

import { annualReportsAdapter } from './sourceAdapters/annualReports';
import { companyInvestorRelationsAdapter } from './sourceAdapters/companyInvestorRelations';
import { exchangeFilingsAdapter } from './sourceAdapters/exchangeFilings';
import { indexMethodologiesAdapter } from './sourceAdapters/indexMethodologies';
import { manualUrlSourceAdapter } from './sourceAdapters/manualUrlSource';
import { newsSourcesAdapter, isFinnhubEnabled } from './sourceAdapters/newsSources';
import { regulatoryFilingsAdapter } from './sourceAdapters/regulatoryFilings';
import { reputableFinancialSitesAdapter } from './sourceAdapters/reputableFinancialSites';
import { rssSourcesAdapter } from './sourceAdapters/rssSources';
import { deduplicateEvidence } from './evidenceDeduplication';
import { resolveFinancialConflicts } from './conflictResolver';
import { getMethodology } from './methodologies';
import { analyzeShariaEvidence } from './shariaAnalyzer';
import { webDiscoveryStatus } from './webDiscovery';
import type { EvidenceItem, ResearchProgressStep, SecurityIdentity, SourceAdapter, SourceConfigurationStatus } from './types';

export const SOURCE_ADAPTERS: SourceAdapter[] = [
  companyInvestorRelationsAdapter,
  exchangeFilingsAdapter,
  regulatoryFilingsAdapter,
  annualReportsAdapter,
  indexMethodologiesAdapter,
  reputableFinancialSitesAdapter,
  rssSourcesAdapter,
  newsSourcesAdapter,
  manualUrlSourceAdapter,
];

export function sourceConfigurationStatus(): SourceConfigurationStatus[] {
  return [
    ...SOURCE_ADAPTERS.map(adapter => ({
      id: adapter.id,
      label: adapter.label,
      enabled: adapter.isEnabled(),
      tier: adapter.tier,
      requirement: adapter.id === 'news-sources' && !isFinnhubEnabled() ? 'FINNHUB_API_KEY' : null,
    })),
    webDiscoveryStatus(),
    {
      id: 'playwright-fallback',
      label: 'Controlled JavaScript-rendering fallback',
      enabled: process.env.SHARIA_RESEARCH_PLAYWRIGHT_FALLBACK === 'true',
      tier: 4,
      requirement: process.env.SHARIA_RESEARCH_PLAYWRIGHT_FALLBACK === 'true' ? null : 'SHARIA_RESEARCH_PLAYWRIGHT_FALLBACK=true',
    },
  ];
}

function mergeSecurityIdentity(security: SecurityIdentity, patches: Array<Partial<SecurityIdentity> | undefined>) {
  return patches.reduce<SecurityIdentity>((current, patch) => patch ? ({
    ...current,
    ...patch,
    aliases: Array.from(new Set([...(current.aliases ?? []), ...(patch.aliases ?? [])])),
    previousNames: Array.from(new Set([...(current.previousNames ?? []), ...(patch.previousNames ?? [])])),
    identitySources: Array.from(new Map([...(current.identitySources ?? []), ...(patch.identitySources ?? [])].map(source => [source.url, source])).values()),
  }) : current, security);
}

export async function researchSecurity(input: {
  security: SecurityIdentity;
  query: Parameters<SourceAdapter['research']>[0]['query'];
  methodologyId?: string | null;
  manualUrls?: string[];
  signal?: AbortSignal;
  onProgress?: (step: ResearchProgressStep, progress: number) => Promise<void> | void;
}) {
  const retrievedAt = new Date().toISOString();
  const methodology = getMethodology(input.methodologyId);
  await input.onProgress?.('searching_official_sources', 18);
  const enabled = SOURCE_ADAPTERS.filter(adapter => adapter.isEnabled() && adapter.supports(input.security));
  const settled = await Promise.allSettled(enabled.map(adapter => adapter.research({
    query: input.query,
    security: input.security,
    retrievedAt,
    manualUrls: input.manualUrls,
    signal: input.signal,
  })));
  await input.onProgress?.('retrieving_filings', 46);
  const adapterResults = settled.map((result, index) => result.status === 'fulfilled' ? result.value : ({
    adapterId: enabled[index]?.id ?? `adapter-${index}`,
    status: 'failed' as const,
    documents: [],
    financialValues: [],
    errors: [{ code: 'ADAPTER_REJECTED', message: result.reason instanceof Error ? result.reason.message : String(result.reason), retryable: true }],
  }));
  const security = mergeSecurityIdentity(input.security, adapterResults.map(result => result.identityPatch));
  const documents = deduplicateEvidence(adapterResults.flatMap(result => result.documents));
  const keptDocumentIds = new Set(documents.map(document => document.id));
  const financialValues = adapterResults.flatMap(result => result.financialValues).filter(value => keptDocumentIds.has(value.documentId));
  const evidence: EvidenceItem[] = [];
  await input.onProgress?.('extracting_financial_data', 62);
  const conflicts = resolveFinancialConflicts(financialValues, documents, evidence);
  await input.onProgress?.('checking_business_activities', 74);
  await input.onProgress?.('calculating_ratios', 84);
  await input.onProgress?.('resolving_conflicts', 91);
  const result = analyzeShariaEvidence({ security, documents, financialValues, methodology, conflicts, evidence, retrievedAt });
  await input.onProgress?.('preparing_result', 97);
  return {
    result,
    adapterResults,
    financialValues,
    configuration: sourceConfigurationStatus(),
  };
}
