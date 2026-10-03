import type { ConsolidatedNewsStory } from '@/lib/market-news/types';

import { GULF_MARKETS, type GulfMarketId } from './gulfMarkets';

const MARKET_ALIASES: Record<GulfMarketId, string[]> = {
  kuwait: ['boursa kuwait', 'boursakuwait', 'kuwait stock exchange', 'بورصة الكويت', 'سوق الكويت'],
  saudi: ['saudi exchange', 'saudiexchange', 'tadawul', 'تداول السعودية', 'السوق السعودية', 'السوق السعودي'],
  oman: ['muscat stock exchange', 'msx', 'بورصة مسقط'],
  bahrain: ['bahrain bourse', 'بورصة البحرين'],
  'uae-dfm': ['dubai financial market', 'dfm', 'سوق دبي المالي'],
  'uae-adx': ['abu dhabi securities exchange', 'adx', 'سوق أبوظبي للأوراق المالية'],
  qatar: ['qatar stock exchange', 'qse', 'بورصة قطر'],
};

function normalizedCode(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('und').replace(/[^\p{L}\p{N}]+/gu, '');
}

function oneMarket(matches: GulfMarketId[]) {
  return matches.length === 1 ? matches[0] : null;
}

function explicitMarketMatches(values: readonly string[]): GulfMarketId[] {
  const codes = new Set(values.map(normalizedCode).filter(Boolean));
  return GULF_MARKETS
    .filter(market => [market.id, market.code, market.exchangeCode]
      .some(code => codes.has(normalizedCode(code))))
    .map(market => market.id);
}

/** Resolve Gulf news to one exchange without treating shared country codes as exchange identifiers. */
export function resolveGulfNewsMarket(story: ConsolidatedNewsStory): GulfMarketId | null {
  // The article publisher is more specific than enrichment metadata attached
  // during clustering, so it prevents generic notices from leaking to another
  // exchange panel.
  const sourceText = `${story.sourceName} ${story.sourceDomain ?? ''}`.toLocaleLowerCase();
  const sourceMatch = oneMarket(GULF_MARKETS
    .filter(market => MARKET_ALIASES[market.id].some(alias => sourceText.includes(alias)))
    .map(market => market.id));
  if (sourceMatch) return sourceMatch;

  // UAE markets share a country code. Resolve explicit market/exchange codes
  // first; stories naming multiple exchanges intentionally stay unassigned.
  const explicitMatches = explicitMarketMatches([...story.marketCodes, ...story.exchangeCodes]);
  if (explicitMatches.length === 1) return explicitMatches[0];
  if (explicitMatches.length > 1) return null;

  const countryCodes = new Set(story.countries.map(value => value.toLowerCase()));
  const countryMatches = GULF_MARKETS.filter(market => countryCodes.has(market.countryCode.toLowerCase()));
  if (countryMatches.length === 1) return countryMatches[0].id;

  // Only use explicit, unambiguous market references. Generic GCC/UAE
  // coverage must not be silently assigned to Saudi Arabia, DFM, or ADX.
  const text = `${story.title} ${story.summary ?? ''}`.toLocaleLowerCase();
  return oneMarket(GULF_MARKETS
    .filter(market => MARKET_ALIASES[market.id].some(alias => text.includes(alias)))
    .map(market => market.id));
}
