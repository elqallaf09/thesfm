import { describe, expect, it } from 'vitest';
import { filterSpecialNews } from '@/lib/news/specialNewsSearch';
import { isMetalsMarketNews } from '@/lib/news/metalsNews';
import { dedupeNewsItems, newsArticleKey } from '@/lib/news/clientNewsUtils';

const articles = [
  { id: 'legacy-collision', url: 'https://example.com/gold', title: 'Gold mining stocks gain as bullion demand rises', symbols: ['GOLD'] },
  { id: 'legacy-collision', url: 'https://example.com/silver', title: 'Silver futures rise on industrial demand', symbols: ['SILVER'] },
  { id: 'arabic-silver', url: 'https://example.com/ar', title: 'سعر الفضة اليوم: تقلبات عقب قرار الاحتياطي الفيدرالي' },
  { id: 'sports', url: 'https://example.com/sports', title: 'Sabres announce rosters for Blue and Gold Scrimmage', symbols: ['GOLD'], companyNames: ['Gold'] },
];

describe('metals news relevance and multilingual search', () => {
  it.each(['الفضة', 'فضة', 'الفضه', 'الفِضَّة', ' Silver ', 'XAG', 'XAG/USD', 'SI=F', 'argent'])(
    'finds only silver articles when searching %s', query => {
      const result = filterSpecialNews(articles, query, 'metals-news');
      expect(result.map(item => item.url)).toEqual(['https://example.com/silver', 'https://example.com/ar']);
    },
  );
  it('keeps distinct legacy IDs renderable and restores the same set after clearing search', () => {
    const items = dedupeNewsItems(articles);
    expect(items).toHaveLength(4);
    expect(new Set(items.map(newsArticleKey)).size).toBe(4);
    expect(filterSpecialNews(items, 'الذهب', 'metals-news').map(item => item.url)).toEqual(['https://example.com/gold']);
    expect(filterSpecialNews(items, 'الفضة', 'metals-news')).toHaveLength(2);
    expect(filterSpecialNews(items, 'لا يوجد خبر مطابق', 'metals-news')).toEqual([]);
    expect(filterSpecialNews(items, '', 'metals-news')).toHaveLength(3);
  });
  it.each([
    'Sabres announce rosters for Blue and Gold Scrimmage | Buffalo Sabres - NHL.com',
    'Forever Young Too Much for Foes in Jockey Club Gold Cup - BloodHorse',
    'It’s Not Just Matching Shoes. Trump Team Matching Gold Rolexes Too',
    'Silver medal winner celebrates record prize money',
    'Stocks find a silver lining after earnings',
    'Oil prices or gas prices could rise',
  ])('rejects unrelated content despite injected metal metadata: %s', title => {
    expect(filterSpecialNews([{ title, symbols: ['GOLD'], companyNames: ['Gold'], sectors: ['mining'] }], '', 'metals-news')).toEqual([]);
  });
  it.each([
    'Multiple unions threaten strikes at Barricks flagship Mali gold mine, documents show',
    'The Politics of Gold Mining Stocks',
    'JPMorgan says one asset class could soon beat gold',
    'Copper supply tightens as smelters reduce production',
    'Gold hits record highs',
    'ارتفاع الذهب وتراجع الفضة',
    'Platinum demand grows as palladium exports fall',
    'Le cours de l’or progresse sur le marché',
    'Le prix de l’argent augmente',
    'ارتفاع أسعار النحاس والبلاتين',
  ])('retains financial metals coverage: %s', title => {
    expect(isMetalsMarketNews({ title })).toBe(true);
  });
  it('searches original text when the translation uses a different language', () => {
    const item = { title: 'ارتفاع أسعار المعدن', titleOriginal: 'Silver prices rise', summaryOriginal: 'Silver futures gain' };
    expect(filterSpecialNews([item], 'الفضة', 'metals-news')).toEqual([item]);
    expect(filterSpecialNews([item], 'futures', 'metals-news')).toEqual([item]);
  });
  it('does not apply metal relevance rules to other news topics', () => {
    const item = { title: 'Apple revenue grows', source: 'Reuters', symbols: ['AAPL'] };
    expect(filterSpecialNews([item], 'AAPL', 'earnings-news')).toEqual([item]);
  });
  it('joins translated articles by URL without overwriting a different story with the same ID', () => {
    const translated = { ...articles[1], title: 'ارتفاع العقود الآجلة للفضة' };
    const byArticle = new Map([[newsArticleKey(translated), translated]]);
    const merged = articles.map(item => byArticle.get(newsArticleKey(item)) ?? item);
    expect(merged[0]).toEqual(articles[0]);
    expect(merged[1].title).toBe(translated.title);
  });
});
