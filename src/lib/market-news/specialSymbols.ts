import 'server-only';
import type { ConsolidatedNewsStory } from './types';

type SearchQuote = { symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchange?: string };
const cache = new Map<string, { symbol: string | null; expires: number }>();
const pending = new Map<string, Promise<string | null>>();

export function explicitUsSymbols(text: string) {
  return [...new Set([...text.matchAll(/\b(?:NASDAQ|NYSE|NYSEAMERICAN|NYSEARCA)\s*:\s*([A-Z][A-Z0-9.-]{0,9})\b/gi)]
    .map(match => match[1].toUpperCase()))];
}

export function companyHint(title: string) {
  const prefix = title.match(/^(.{3,90}?)\s+(?:announces?|receives?|regains?|gets?|clears?|restores?|shares\b|stock\b)/i)?.[1];
  if (!prefix || /\b(?:nasdaq|nyse|penny|stocks|best|top|why)\b/i.test(prefix)) return null;
  return prefix.replace(/[’']s$/i, '').replace(/[,.:]+$/, '').trim();
}

function companyKey(name: string) {
  return name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(word => word && !['the', 'inc', 'incorporated', 'corp', 'corporation', 'limited', 'ltd', 'plc', 'holdings'].includes(word)).join(' ');
}

export function matchedUsEquity(company: string, quotes: SearchQuote[]) {
  const key = companyKey(company);
  if (key.length < 3) return null;
  const symbols = [...new Set(quotes.filter(quote => quote.quoteType === 'EQUITY'
    && ['NMS', 'NGM', 'NCM', 'NYQ', 'ASE'].includes(quote.exchange ?? '')
    && /^[A-Z][A-Z0-9.-]{0,9}$/.test(quote.symbol ?? '')
    && [quote.longname, quote.shortname].some(name => name && companyKey(name) === key))
    .map(quote => quote.symbol!))];
  return symbols.length === 1 ? symbols[0] : null;
}

async function resolveCompany(company: string): Promise<string | null> {
  const key = companyKey(company);
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.symbol;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    let symbol: string | null = null;
    try {
      const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
      url.search = new URLSearchParams({ q: company, quotesCount: '6', newsCount: '0', enableFuzzyQuery: 'false' }).toString();
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_800), next: { revalidate: 300 },
        headers: { accept: 'application/json', 'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)' },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.quotes)) symbol = matchedUsEquity(company, data.quotes);
      }
    } catch { /* Unresolved identities stay excluded from price classification. */ }
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, { symbol, expires: Date.now() + (symbol ? 300_000 : 30_000) });
    return symbol;
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

// RSS headlines often name small companies outside the local symbol directory.
// Require an exact company-name match on a US equity listing, then let the
// quote layer independently verify USD, instrument type, timestamp and price.
export async function resolveUnderOneSymbols(stories: ConsolidatedNewsStory[]) {
  const candidates = stories.map(story => ({ story, hint: companyHint(story.title) }))
    .filter(entry => entry.hint && entry.story.symbols.length === 0 && explicitUsSymbols(entry.story.title).length === 0)
    .sort((a, b) => Number(/deficiency|non.compliance|below|extension|additional/i.test(b.story.title))
      - Number(/deficiency|non.compliance|below|extension|additional/i.test(a.story.title)));
  const companies = [...new Set(candidates.map(entry => entry.hint!))].slice(0, 12);
  const resolved = new Map(await Promise.all(companies.map(async company => [company, await resolveCompany(company)] as const)));
  return stories.map(story => {
    const explicit = explicitUsSymbols(`${story.title} ${story.summary ?? ''}`);
    const hint = companyHint(story.title);
    const symbol = hint ? resolved.get(hint) : null;
    return { ...story, symbols: [...new Set([...explicit, ...(symbol ? [symbol] : []), ...story.symbols])] };
  });
}
