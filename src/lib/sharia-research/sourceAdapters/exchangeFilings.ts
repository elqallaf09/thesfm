import { createSourceDocument } from '../contentExtraction';
import { searchUSSymbols } from '@/lib/market/usSymbolResolver';
import type { SourceAdapter } from '../types';
import { emptyAdapterResult, failedAdapterResult } from './shared';

const NASDAQ_DIRECTORY_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt';

export const exchangeFilingsAdapter: SourceAdapter = {
  id: 'exchange-filings',
  label: 'Official exchange security directories',
  tier: 1,
  isEnabled: () => true,
  supports: security => String(security.country ?? '').toUpperCase() === 'US',
  async research(context) {
    try {
      const result = await searchUSSymbols(context.security.ticker, 'stock');
      if (result.source !== 'nasdaqtrader') return emptyAdapterResult(this.id);
      const matches = result.results.filter(item => item.symbol.toUpperCase() === context.security.ticker.toUpperCase());
      if (matches.length === 0) return emptyAdapterResult(this.id);
      const text = matches.map(item => `${item.name}; ticker ${item.symbol}; exchange ${item.exchange}; asset type ${item.assetType}`).join('\n');
      const document = createSourceDocument({
        adapterId: this.id,
        sourceTitle: 'Nasdaq Trader symbol directory',
        publisher: 'Nasdaq',
        url: NASDAQ_DIRECTORY_URL,
        retrievalDate: context.retrievedAt,
        sourceType: 'exchange_filing',
        tier: 1,
        reliability: 'official',
        extractedText: text,
        evidenceSnippets: [text],
        companyIdentifier: context.security.canonicalId,
        mimeType: 'text/plain',
        supports: ['ticker', 'security name', 'exchange listing'],
      });
      return { adapterId: this.id, status: 'success', documents: [document], financialValues: [], errors: [] };
    } catch (error) {
      return failedAdapterResult(this.id, error, NASDAQ_DIRECTORY_URL);
    }
  },
};
