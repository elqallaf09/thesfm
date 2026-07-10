import { extractHtmlContent, extractPdfText, evidenceSnippets, createSourceDocument } from '../contentExtraction';
import { secureFetch } from '../secureFetch';
import type { AdapterContext, ReliabilityLevel, SourceAdapterResult, SourceType, SourceTier } from '../types';

export const BUSINESS_EVIDENCE_TERMS = [
  'business', 'revenue', 'segment', 'subsidiar', 'interest income', 'debt', 'cash', 'receivable',
  'alcohol', 'tobacco', 'pork', 'banking', 'lending', 'insurance', 'weapon', 'defense', 'casino',
  'gambling', 'music', 'hotel', 'cinema', 'adult entertainment', 'online dating',
];

export function emptyAdapterResult(adapterId: string, status: SourceAdapterResult['status'] = 'unavailable'): SourceAdapterResult {
  return { adapterId, status, documents: [], financialValues: [], errors: [] };
}

export function failedAdapterResult(adapterId: string, error: unknown, url?: string): SourceAdapterResult {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'SOURCE_RETRIEVAL_FAILED';
  return {
    adapterId,
    status: code === 'ROBOTS_DISALLOWED' ? 'blocked' : 'failed',
    documents: [],
    financialValues: [],
    errors: [{ code, message: error instanceof Error ? error.message : String(error), retryable: !code.includes('BLOCKED'), url }],
  };
}

export async function fetchDocument(input: {
  context: AdapterContext;
  adapterId: string;
  url: string;
  title: string;
  publisher: string;
  sourceType: SourceType;
  tier: SourceTier;
  reliability: ReliabilityLevel;
  publicationDate?: string | null;
  filingDate?: string | null;
  reportingPeriod?: string | null;
  supports?: string[];
  respectRobots?: boolean;
}) {
  const response = await secureFetch(input.url, {
    acceptedContentTypes: ['text/html', 'application/xhtml+xml', 'application/pdf', 'text/plain'],
    maxBytes: 15 * 1024 * 1024,
    cacheTtlMs: input.sourceType === 'news' ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000,
    respectRobots: input.respectRobots ?? true,
    signal: input.context.signal,
  });
  const isPdf = response.contentType?.toLowerCase().includes('pdf') || response.finalUrl.toLowerCase().endsWith('.pdf');
  const decoded = isPdf ? null : new TextDecoder().decode(response.body);
  const extracted = isPdf
    ? await extractPdfText(response.body)
    : extractHtmlContent(decoded ?? '');
  const title = extracted.title || input.title;
  const text = extracted.text;
  const snippets = evidenceSnippets(text, BUSINESS_EVIDENCE_TERMS);
  return createSourceDocument({
    adapterId: input.adapterId,
    sourceTitle: title,
    publisher: input.publisher,
    url: response.finalUrl,
    canonicalUrl: !isPdf && 'canonical' in extracted ? extracted.canonical : null,
    publicationDate: input.publicationDate ?? (!isPdf && 'publishedAt' in extracted ? extracted.publishedAt : null),
    filingDate: input.filingDate,
    retrievalDate: response.retrievedAt,
    sourceType: input.sourceType,
    tier: input.tier,
    reliability: input.reliability,
    extractedText: text,
    evidenceSnippets: snippets,
    companyIdentifier: input.context.security.canonicalId,
    reportingPeriod: input.reportingPeriod,
    mimeType: response.contentType,
    supports: input.supports,
  });
}

export function extractSameOriginResearchLinks(html: string, baseUrl: string) {
  const base = new URL(baseUrl);
  const results = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const label = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/(investor|annual.?report|quarterly|financial.?result|10-[kq]|filing|إفصاح|تقرير.?سنوي|علاقات.?المستثمرين)/i.test(`${href} ${label}`)) continue;
    try {
      const url = new URL(href, base);
      if (url.origin === base.origin && ['http:', 'https:'].includes(url.protocol)) results.add(url.toString());
    } catch {
      // Ignore malformed remote links.
    }
    if (results.size >= 4) break;
  }
  return Array.from(results);
}
