import type { ExchangeListing } from './marketListingParsers';

/** Explicit provider identities; a directory connection does not grant quote access. */
export const REGIONAL_DIRECTORIES = {
  saudi_tadawul: { mic: 'XSAU', currency: 'SAR', minimum: 100 },
  uae_adx: { mic: 'XADS', currency: 'AED', minimum: 30 },
  qatar_qse: { mic: 'DSMD', currency: 'QAR', minimum: 30 },
  egypt_egx: { mic: 'XCAI', currency: 'EGP', minimum: 100 },
} as const;
export type RegionalMarket = keyof typeof REGIONAL_DIRECTORIES;
export type DirectoryFailure = 'rate_limited' | 'access_required' | 'not_configured' | 'source_unavailable' | 'invalid_response';

export function regionalQuoteIdentity(key: string) {
  const match = /^TD:(XSAU|XADS|DSMD|XCAI):([A-Z0-9][A-Z0-9-]{0,23})$/.exec(key);
  if (!match || (match[1] === 'XSAU' && !/^\d{4}$/.test(match[2]))) return null;
  const config = Object.values(REGIONAL_DIRECTORIES).find(item => item.mic === match[1])!;
  return { symbol: match[2], ...config };
}

export function parseRegionalDirectory(payload: unknown, market: RegionalMarket) {
  const config = REGIONAL_DIRECTORIES[market];
  const data = payload as { status?: unknown; data?: unknown } | null;
  if (data?.status !== 'ok' || !Array.isArray(data.data) || data.data.length > 20_000) throw new Error('invalid_response');
  const rows = new Map<string, ExchangeListing>();
  for (const entry of data.data) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const symbol = typeof item.symbol === 'string' ? item.symbol.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const key = `TD:${config.mic}:${symbol}`;
    // Reject cross-exchange results, wrong currencies, synthetic aliases and funds.
    if (item.mic_code !== config.mic || item.currency !== config.currency || item.type !== 'Common Stock' || !name || !regionalQuoteIdentity(key)) continue;
    rows.set(key, { symbol, providerSymbol: key, name, currency: config.currency, exchange: config.mic, assetType: 'stock' });
  }
  return { rows: [...rows.values()], sourceRecords: data.data.length, excludedRecords: data.data.length - rows.size };
}
