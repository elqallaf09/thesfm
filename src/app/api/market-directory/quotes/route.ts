import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { fetchYahooChartQuote } from '@/lib/market/fetchYahooQuote';
import { DIRECTORY_MAX_PAGE_SIZE } from '@/lib/market/globalMarketDirectoryTypes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'market-directory-quotes' });
  if (limited) return limited;
  const symbols = [...new Set((new URL(request.url).searchParams.get('symbols') || '').split(',').filter(Boolean))];
  if (!symbols.length || symbols.length > DIRECTORY_MAX_PAGE_SIZE || symbols.some(symbol => !/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(symbol))) {
    return NextResponse.json({ success: false, error: 'invalid_symbols' }, { status: 400 });
  }
  try {
    // One bounded page only; browsing never fans out to the whole exchange.
    const international = symbols.filter(symbol => /\.(KW|SS|SZ|DU|AE|AD|SR|QA|BH|OM|T|HK|NS|BO|KS|TO|AX)$/.test(symbol));
    const domestic = symbols.filter(symbol => !international.includes(symbol));
    const [us, other] = await Promise.all([
      fetchStockPrices(domestic.map(symbol => ({ symbol })), process.env.FINNHUB_API_KEY?.trim()),
      Promise.all(international.map(async symbol => {
        // International listings already use Yahoo symbols; avoid a failed
        // US quote request before fetching the supported chart quote.
        const quote = await fetchYahooChartQuote(symbol).catch(() => ({ symbol, price: null, change: null, changePercent: null, available: false, delayed: true as const, source: 'Yahoo Finance' as const, unavailableReason: 'quote_temporarily_unavailable' }));
        return [symbol, quote] as const;
      })),
    ]);
    return NextResponse.json({ success: true, prices: Object.fromEntries([...us, ...other]) }, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ success: false, error: 'quotes_temporarily_unavailable' }, { status: 503 });
  }
}
