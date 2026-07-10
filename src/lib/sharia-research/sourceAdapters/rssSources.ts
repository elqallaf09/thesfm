import { createSourceDocument, decodeHtmlEntities, htmlToPlainText, sanitizeText } from '../contentExtraction';
import { assertSafePublicUrl, secureFetch } from '../secureFetch';
import type { SourceAdapter } from '../types';
import { failedAdapterResult } from './shared';

function xmlValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? '';
  return decodeHtmlEntities(match.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim());
}

function parseRssDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export const rssSourcesAdapter: SourceAdapter = {
  id: 'rss-sources',
  label: 'Public market-news RSS feeds',
  tier: 3,
  isEnabled: () => true,
  supports: () => true,
  async research(context) {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(context.security.ticker)}&region=US&lang=en-US`;
    try {
      const response = await secureFetch(url, {
        acceptedContentTypes: ['application/rss+xml', 'application/xml', 'text/xml'],
        maxBytes: 2 * 1024 * 1024,
        cacheTtlMs: 10 * 60 * 1000,
        minDomainIntervalMs: 250,
        signal: context.signal,
      });
      const xml = new TextDecoder().decode(response.body);
      const documents = [];
      for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
        const block = match[1];
        const title = sanitizeText(xmlValue(block, 'title'), 500);
        const link = xmlValue(block, 'link');
        if (!title || !link) continue;
        try { await assertSafePublicUrl(link); } catch { continue; }
        const description = sanitizeText(htmlToPlainText(xmlValue(block, 'description')), 4_000);
        documents.push(createSourceDocument({
          adapterId: this.id,
          sourceTitle: title,
          publisher: xmlValue(block, 'source') || 'RSS publisher',
          url: link,
          publicationDate: parseRssDate(xmlValue(block, 'pubDate')),
          retrievalDate: response.retrievedAt,
          sourceType: 'rss',
          tier: 3,
          reliability: 'context_only',
          extractedText: `${title}. ${description}`,
          evidenceSnippets: [description || title],
          companyIdentifier: context.security.canonicalId,
          mimeType: response.contentType,
          supports: ['current context only; never determines Shariah classification'],
        }));
        if (documents.length >= 8) break;
      }
      return { adapterId: this.id, status: documents.length ? 'success' : 'unavailable', documents, financialValues: [], errors: [] };
    } catch (error) {
      return failedAdapterResult(this.id, error, url);
    }
  },
};
