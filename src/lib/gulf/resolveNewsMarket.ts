import type { ConsolidatedNewsStory } from '@/lib/market-news/types';

import { GULF_MARKETS, type GulfMarketId } from './gulfMarkets';

function explicitMarketMatches(values: readonly string[]): GulfMarketId[] {
  const codes = new Set(values.map(value => value.trim().toLocaleLowerCase('und')).filter(Boolean));
  return GULF_MARKETS
    .filter(market => [market.id, market.code, market.exchangeCode]
      .some(code => codes.has(code.toLocaleLowerCase('und'))))
    .map(market => market.id);
}

/** Resolve Gulf news to one exchange without treating shared country codes as exchange identifiers. */
export function resolveGulfNewsMarket(story: ConsolidatedNewsStory): GulfMarketId | null {
  // UAE markets share a country code. Always resolve the market/exchange code
  // first, otherwise ADX notices can be incorrectly assigned to DFM. A merged
  // story that names multiple exchanges is deliberately left unassigned rather
  // than being attributed according to the static market list order.
  const explicitMatches = explicitMarketMatches([...story.marketCodes, ...story.exchangeCodes]);
  if (explicitMatches.length === 1) return explicitMatches[0];
  if (explicitMatches.length > 1) return null;

  const countryCodes = new Set(story.countries.map(value => value.toLowerCase()));
  const countryMatches = GULF_MARKETS.filter(market => countryCodes.has(market.countryCode.toLowerCase()));
  if (countryMatches.length === 1) return countryMatches[0].id;

  // Only use explicit, unambiguous market references. Generic GCC/UAE
  // coverage must not be silently assigned to Saudi Arabia, DFM, or ADX.
  const text = `${story.title} ${story.summary ?? ''}`.toLocaleLowerCase();
  const aliases: Record<GulfMarketId, string[]> = {
    kuwait: ['boursa kuwait', 'kuwait stock exchange', 'بورصة الكويت', 'سوق الكويت'],
    saudi: ['saudi exchange', 'tadawul', 'تداول السعودية', 'السوق السعودية', 'السوق السعودي'],
    oman: ['muscat stock exchange', 'msx', 'بورصة مسقط'],
    bahrain: ['bahrain bourse', 'بورصة البحرين'],
    'uae-dfm': ['dubai financial market', 'dfm', 'سوق دبي المالي'],
    'uae-adx': ['abu dhabi securities exchange', 'adx', 'سوق أبوظبي للأوراق المالية'],
    qatar: ['qatar stock exchange', 'qse', 'بورصة قطر'],
  };
  const matches = GULF_MARKETS.filter(market => aliases[market.id].some(alias => text.includes(alias))).map(market => market.id);
  return matches.length === 1 ? matches[0] : null;
}
