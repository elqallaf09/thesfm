export type NewsPageBackgroundCategory =
  | 'tech'
  | 'crypto'
  | 'banking'
  | 'energy'
  | 'gulf'
  | 'europe'
  | 'sharia'
  | 'growth'
  | 'dividend'
  | 'defensive'
  | 'cyclical'
  | 'healthcare'
  | 'food'
  | 'high-income';

const NEWS_BACKGROUND_CLASSES: Record<NewsPageBackgroundCategory, string> = {
  tech: 'news-bg-tech',
  crypto: 'news-bg-crypto',
  banking: 'news-bg-banking',
  energy: 'news-bg-energy',
  gulf: 'news-bg-gulf',
  europe: 'news-bg-europe',
  sharia: 'news-bg-sharia',
  growth: 'news-bg-growth',
  dividend: 'news-bg-dividend',
  defensive: 'news-bg-defensive',
  cyclical: 'news-bg-cyclical',
  healthcare: 'news-bg-healthcare',
  food: 'news-bg-food',
  'high-income': 'news-bg-high-income',
};

export function getNewsBackgroundVariant(category: NewsPageBackgroundCategory) {
  return NEWS_BACKGROUND_CLASSES[category];
}

export function getNewsPageBackground(category: NewsPageBackgroundCategory) {
  return `news-page-bg ${getNewsBackgroundVariant(category)}`;
}
