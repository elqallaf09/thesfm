import { NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/marketDataProvider';
import { normalizeAssetType } from '@/lib/market/marketService';

const DEFAULT_ASSETS = [
  { symbol: 'NVDA', assetType: 'stock', name: 'NVIDIA' },
  { symbol: 'AAPL', assetType: 'stock', name: 'Apple' },
  { symbol: 'MSFT', assetType: 'stock', name: 'Microsoft' },
  { symbol: 'TSLA', assetType: 'stock', name: 'Tesla' },
  { symbol: 'QQQ', assetType: 'etf', name: 'Invesco QQQ' },
  { symbol: 'SPY', assetType: 'etf', name: 'SPDR S&P 500 ETF' },
  { symbol: 'EURUSD', assetType: 'forex', name: 'EUR/USD' },
  { symbol: 'USDJPY', assetType: 'forex', name: 'USD/JPY' },
  { symbol: 'XAUUSD', assetType: 'gold', name: 'Gold' },
  { symbol: 'BTCUSD', assetType: 'crypto', name: 'Bitcoin' },
] as const;

function changeFromHistory(history: Array<{ close: number }>, daysBack: number, latestPrice: number) {
  const point = history.at(-1 - daysBack);
  if (!point?.close || point.close <= 0) return null;
  return ((latestPrice - point.close) / point.close) * 100;
}

export async function GET() {
  const settled = await Promise.allSettled(DEFAULT_ASSETS.map(asset => proxyAnalyze(asset.symbol, asset.assetType, asset)));
  const rows = settled
    .map((result, index) => ({ result, asset: DEFAULT_ASSETS[index] }))
    .filter(({ result }) => result.status === 'fulfilled' && result.value.success)
    .map(({ result, asset }) => {
      if (result.status !== 'fulfilled' || !result.value.success) return null;
      const analysis = result.value;
      const history = analysis.history.filter(point => Number.isFinite(point.close));
      return {
        symbol: asset.symbol,
        name: analysis.name || asset.name,
        price: analysis.latestPrice,
        currency: analysis.currency,
        exchange: analysis.exchange,
        country: analysis.country,
        change_1d: analysis.changePercent,
        change_1w: changeFromHistory(history, 5, analysis.latestPrice),
        change_1m: changeFromHistory(history, 21, analysis.latestPrice),
        asset_type: normalizeAssetType(analysis.assetType),
        trend: analysis.trend,
        source: analysis.source ?? 'yahoo',
        updated_at: analysis.fetchedAt ?? new Date().toISOString(),
      };
    })
    .filter(Boolean);

  const hasConfiguredProvider = settled.some(result => result.status === 'fulfilled' && result.value.marketDataService !== 'not_configured');

  return NextResponse.json({
    success: rows.length > 0,
    source: 'yahoo',
    code: rows.length > 0 ? undefined : hasConfiguredProvider ? 'provider_no_data' : 'market_data_not_configured',
    message: rows.length > 0 ? undefined : hasConfiguredProvider
      ? 'Market provider did not return usable performance data.'
      : 'Yahoo Finance market data is not available right now.',
    items: rows,
    updated_at: new Date().toISOString(),
  }, { status: rows.length > 0 ? 200 : 503 });
}
