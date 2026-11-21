import type { StockCategoryStock } from './stockCategoryConfigs';
import type { ConsolidatedNewsStory } from '../market-news/types';

type Headline = Pick<ConsolidatedNewsStory, 'title' | 'symbols' | 'isOfficial' | 'sourceId' | 'originalUrl'>;
const names: Record<string, string[]> = {
  AAPL: ['آبل', 'أبل'], MSFT: ['مايكروسوفت'], NVDA: ['إنفيديا', 'انفيديا', 'إنفيديا كورب'],
  GOOGL: ['غوغل', 'جوجل', 'ألفابت'], META: ['Meta', 'ميتا'], TSLA: ['تسلا'],
  AVGO: ['برودكوم'], AMD: ['إيه إم دي'], JNJ: ['جونسون آند جونسون', 'جونسون أند جونسون'],
  ABBV: ['آبفي', 'أبفي'], PEP: ['بيبسيكو'], TSM: ['TSMC'], COST: ['Costco', 'كوستكو'],
};
function words(value: string) {
  return ' ' + value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
}

export function shariaHeadlineStock(story: Headline, stocks: ReadonlyMap<string, StockCategoryStock>) {
  const candidates = story.symbols.flatMap(symbol => {
    const stock = stocks.get(symbol.toUpperCase());
    return stock ? [stock] : [];
  });
  if (story.isOfficial) {
    const issuer = candidates.find(stock => story.sourceId === 'issuer-' + stock.symbol.toLowerCase());
    if (issuer) return issuer;
  }
  const headline = words(story.title);
  return candidates.find(stock => [stock.name, ...(stock.aliases ?? []), ...(names[stock.symbol] ?? [])]
    .some(name => headline.includes(words(name)))
    || story.title.replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').includes(stock.symbol)) ?? null;
}
