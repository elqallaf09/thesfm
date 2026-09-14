import 'server-only';
import type { ExchangeListing } from '@/lib/market/marketListingParsers';
import { LISTING_SOURCES, parseKuwaitListings, parseShanghaiListings, parseShenzhenListings } from '@/lib/market/marketListingParsers';
import { getUSSymbolUniverse } from '@/lib/market/usSymbolResolver';

export type ListingResult = { rows: ExchangeListing[]; source: string; asOf: string | null; status: 'directory' | 'snapshot' };
type ListingSource = 'kuwait' | 'shanghai' | 'shenzhen' | 'us';
const cache = new Map<ListingSource, { expires: number; promise: Promise<ListingResult> }>();

async function fetchDirectory(url: string) {
  const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6500) });
  if (!response.ok) throw new Error('listing_source_unavailable');
  return response;
}

async function fetchChineseWorkbook(url: string) {
  const [response, xlsx] = await Promise.all([fetchDirectory(url), import('xlsx')]);
  const book = xlsx.read(await response.arrayBuffer(), { type: 'array' });
  return parseShenzhenListings(xlsx.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]]));
}

async function load(source: ListingSource): Promise<ListingResult> {
  if (source === 'us') {
    const result = await getUSSymbolUniverse();
    return { rows: result.rows.map(row => ({ ...row, sector: undefined })), source: 'https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs', asOf: result.source === 'nasdaqtrader' ? new Date().toISOString() : null, status: result.source === 'nasdaqtrader' ? 'directory' : 'snapshot' };
  }
  try {
    let rows: ExchangeListing[];
    if (source === 'kuwait') {
      const [en, ar] = await Promise.all([
        fetchDirectory(LISTING_SOURCES.kuwait).then(response => response.json()),
        fetchDirectory(LISTING_SOURCES.kuwait.replace('L=E', 'L=A')).then(response => response.json()).catch(() => null),
      ]);
      const bundled = await import('@/data/market-symbols/boursa-kuwait.json');
      const names = new Map(bundled.default.filter(row => row.company_name_ar).map(row => [row.symbol, row.company_name_ar!]));
      if (ar) for (const row of parseKuwaitListings(ar)) if (/[\u0600-\u06ff]/.test(row.name)) names.set(row.symbol, row.name);
      rows = parseKuwaitListings(en).map(row => ({ ...row, localName: names.get(row.symbol) }));
    } else if (source === 'shanghai') {
      rows = parseShanghaiListings(await (await fetchDirectory(LISTING_SOURCES.shanghai)).text());
    } else {
      const [a, b] = await Promise.all([fetchChineseWorkbook(LISTING_SOURCES.shenzhen), fetchChineseWorkbook(LISTING_SOURCES.shenzhenB)]);
      rows = [...new Map([...a, ...b].map(row => [row.symbol, row])).values()];
    }
    const minimum = source === 'kuwait' ? 100 : source === 'shanghai' ? 2000 : 2500;
    if (rows.length < minimum) throw new Error('incomplete_listing_directory');
    return { rows, source: LISTING_SOURCES[source], asOf: new Date().toISOString(), status: 'directory' };
  } catch {
    const snapshots = await import('@/data/market-symbols/global-directory-snapshot.json');
    const snapshot = snapshots.default[source];
    return { rows: snapshot.rows as ExchangeListing[], source: LISTING_SOURCES[source], asOf: snapshots.default.asOf, status: 'snapshot' };
  }
}

export function getGlobalMarketListings(source: ListingSource): Promise<ListingResult> {
  const current = cache.get(source);
  if (current && current.expires > Date.now()) return current.promise;
  const promise = load(source).then(result => {
    cache.set(source, { promise: Promise.resolve(result), expires: Date.now() + (result.status === 'directory' ? 86400000 : 300000) });
    return result;
  }).catch(error => { cache.delete(source); throw error; });
  cache.set(source, { promise, expires: Date.now() + 300000 });
  return promise;
}
