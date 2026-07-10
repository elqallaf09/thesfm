import { createSourceDocument, evidenceSnippets } from '../contentExtraction';
import { secureFetch } from '../secureFetch';
import type { SourceAdapter } from '../types';
import { failedAdapterResult } from './shared';

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        symbol?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        instrumentType?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        longName?: string;
        shortName?: string;
      };
    }>;
    error?: unknown;
  };
};

export const reputableFinancialSitesAdapter: SourceAdapter = {
  id: 'reputable-financial-sites',
  label: 'Recognized market-data publishers',
  tier: 2,
  isEnabled: () => true,
  supports: security => Boolean(security.providerSymbol || security.ticker),
  async research(context) {
    const symbol = context.security.providerSymbol || context.security.ticker;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    try {
      const response = await secureFetch(url, {
        acceptedContentTypes: ['application/json', 'text/json'],
        maxBytes: 2 * 1024 * 1024,
        cacheTtlMs: 15 * 60 * 1000,
        minDomainIntervalMs: 250,
        signal: context.signal,
      });
      const payload = JSON.parse(new TextDecoder().decode(response.body)) as YahooChartPayload;
      const meta = payload.chart?.result?.[0]?.meta;
      if (!meta?.symbol) throw new Error('MARKET_DATA_IDENTITY_UNAVAILABLE');
      const publicationDate = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null;
      const text = [
        `Security: ${meta.longName || meta.shortName || context.security.name}`,
        `Symbol: ${meta.symbol}`,
        `Exchange: ${meta.fullExchangeName || meta.exchangeName || context.security.exchange}`,
        `Instrument type: ${meta.instrumentType || 'unknown'}`,
        `Currency: ${meta.currency || context.security.currency || 'unknown'}`,
        typeof meta.regularMarketPrice === 'number' ? `Current delayed market price: ${meta.regularMarketPrice}` : '',
      ].filter(Boolean).join('\n');
      const document = createSourceDocument({
        adapterId: this.id,
        sourceTitle: `${meta.longName || meta.shortName || context.security.name} market metadata`,
        publisher: 'Yahoo Finance',
        url: response.finalUrl,
        publicationDate,
        retrievalDate: response.retrievedAt,
        sourceType: 'financial_data',
        tier: 2,
        reliability: 'high',
        extractedText: text,
        evidenceSnippets: evidenceSnippets(text, ['Security:', 'Symbol:', 'Exchange:', 'Currency:']),
        companyIdentifier: context.security.canonicalId,
        mimeType: response.contentType,
        supports: ['secondary identity confirmation', 'exchange', 'currency', 'market context'],
      });
      return {
        adapterId: this.id,
        status: 'success',
        documents: [document],
        financialValues: [],
        identityPatch: {
          name: meta.longName || meta.shortName || context.security.name,
          currency: meta.currency || context.security.currency,
          exchange: meta.fullExchangeName || meta.exchangeName || context.security.exchange,
        },
        errors: [],
      };
    } catch (error) {
      return failedAdapterResult(this.id, error, url);
    }
  },
};
