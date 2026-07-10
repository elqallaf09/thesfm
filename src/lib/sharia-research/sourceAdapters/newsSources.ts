import { createSourceDocument, sanitizeText } from '../contentExtraction';
import { assertSafePublicUrl, secureFetch } from '../secureFetch';
import type { SourceAdapter } from '../types';
import { emptyAdapterResult, failedAdapterResult } from './shared';

type FinnhubNews = { id?: number; category?: string; datetime?: number; headline?: string; image?: string; related?: string; source?: string; summary?: string; url?: string };

function isFinnhubEnabled() {
  const key = process.env.FINNHUB_API_KEY?.trim();
  return Boolean(key && key !== 'your_key_here');
}

export const newsSourcesAdapter: SourceAdapter = {
  id: 'news-sources',
  label: 'Reputable financial news context',
  tier: 3,
  isEnabled: isFinnhubEnabled,
  supports: () => true,
  async research(context) {
    const key = process.env.FINNHUB_API_KEY?.trim();
    if (!key || !isFinnhubEnabled()) return emptyAdapterResult(this.id);
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      symbol: context.security.ticker,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      token: key,
    });
    const requestUrl = `https://finnhub.io/api/v1/company-news?${params.toString()}`;
    try {
      const response = await secureFetch(requestUrl, {
        acceptedContentTypes: ['application/json', 'text/json'],
        maxBytes: 3 * 1024 * 1024,
        cacheTtlMs: 10 * 60 * 1000,
        minDomainIntervalMs: 250,
        signal: context.signal,
      });
      const payload = JSON.parse(new TextDecoder().decode(response.body)) as FinnhubNews[];
      const documents = [];
      for (const item of Array.isArray(payload) ? payload : []) {
        if (!item.url || !item.headline) continue;
        try {
          await assertSafePublicUrl(item.url);
        } catch {
          continue;
        }
        const text = sanitizeText(`${item.headline}. ${item.summary ?? ''}`, 5_000);
        documents.push(createSourceDocument({
          adapterId: this.id,
          sourceTitle: item.headline,
          publisher: item.source || 'Financial news publisher',
          url: item.url,
          publicationDate: item.datetime ? new Date(item.datetime * 1000).toISOString() : null,
          retrievalDate: response.retrievedAt,
          sourceType: 'news',
          tier: 3,
          reliability: 'context_only',
          extractedText: text,
          evidenceSnippets: [text.slice(0, 700)],
          companyIdentifier: context.security.canonicalId,
          mimeType: 'application/json',
          supports: ['current context only; never determines Shariah classification'],
        }));
        if (documents.length >= 8) break;
      }
      return { adapterId: this.id, status: documents.length ? 'success' : 'unavailable', documents, financialValues: [], errors: [] };
    } catch (error) {
      return failedAdapterResult(this.id, error, requestUrl.replace(key, '[redacted]'));
    }
  },
};

export { isFinnhubEnabled };
