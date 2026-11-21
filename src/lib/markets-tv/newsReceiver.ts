import type { TvLanguage, TvNews } from './types';
import { safeTvUrl } from './safeUrl';
import { tvNewsPhotoUrl } from './newsPhoto';

// Reuse the website's public feeds, including its price and screening checks.
export const TV_NEWS_FEEDS = {
  europeNews: "/api/europe-news",
  gulfNews: "/api/gulf-news",
  asiaNews: "/api/asia-market-news",
  cryptoNews: "/api/crypto-news",
  fedNews: "/api/market/special-news?topic=federal-reserve",
  usIpoNews: "/api/market/special-news?topic=ipo-us-news",
  asiaIpoNews: "/api/market/special-news?topic=ipo-asia-news",
  europeIpoNews: "/api/market/special-news?topic=ipo-europe-news",
  ukIpoNews: "/api/market/special-news?topic=ipo-uk-news",
  gulfIpoNews: "/api/market/special-news?topic=ipo-gulf-news",
  arabIpoNews: "/api/market/special-news?topic=ipo-arab-news",
  energyNews: "/api/energy-stocks/news",
  metalsNews: "/api/market/special-news?topic=metals-news",
  healthcareNews: "/api/market/special-news?topic=healthcare-stocks",
  newStocksNews: "/api/market/special-news?topic=new-stocks",
  underDollarNews: "/api/market/special-news?topic=stocks-under-1",
  earningsNews: "/api/market/special-news?topic=earnings-news",
  analystNews: "/api/market/special-news?topic=analyst-ratings-news",
  mergersNews: "/api/market/special-news?topic=mergers-acquisitions-news",
  unusualNews: "/api/market/special-news?topic=unusual-moves-news",
  bankingNews: "/api/banking-stocks/news",
  shariaNews: "/api/sharia-stocks/news",
  growthNews: "/api/growth-stocks/news",
  defensiveNews: "/api/defensive-stocks/news",
  cyclicalNews: "/api/cyclical-stocks/news",
  incomeNews: "/api/dividend-stocks/news",
} as const;
export type TvExtraNewsChannel = keyof typeof TV_NEWS_FEEDS;
export const TV_EXTRA_NEWS_CHANNELS = Object.keys(TV_NEWS_FEEDS) as TvExtraNewsChannel[];
export const TV_NEWS_LABELS = {
  europeNews: ["أخبار الأسواق الأوروبية", "European markets news", "Actualités des marchés européens"],
  gulfNews: ["أخبار أسواق الخليج", "Gulf markets news", "Actualités des marchés du Golfe"],
  asiaNews: ["أخبار السوق الآسيوي", "Asian markets news", "Actualités des marchés asiatiques"],
  cryptoNews: ["أخبار العملات الرقمية", "Crypto news", "Actualités des cryptomonnaies"],
  fedNews: ["أخبار الفدرالي الأمريكي", "Federal Reserve news", "Actualités de la Réserve fédérale"],
  usIpoNews: ["أخبار الاكتتابات الأمريكية", "US IPO News", "Actualités des IPO américaines"],
  asiaIpoNews: ["أخبار الاكتتابات الآسيوية", "Asian IPO News", "Actualités des IPO asiatiques"],
  europeIpoNews: ["أخبار الاكتتابات الأوروبية", "European IPO News", "Actualités des IPO européennes"],
  ukIpoNews: ["أخبار الاكتتابات البريطانية", "UK IPO News", "Actualités des IPO britanniques"],
  gulfIpoNews: ["أخبار الاكتتابات الخليجية", "Gulf IPO News", "Actualités des IPO du Golfe"],
  arabIpoNews: ["أخبار الاكتتابات العربية", "Arab Markets IPO News", "Actualités des IPO arabes"],
  energyNews: ["أخبار الطاقة", "Energy news", "Actualités de l’énergie"],
  metalsNews: ["أخبار المعادن", "Metals news", "Actualités des métaux"],
  healthcareNews: ["أخبار الأسهم الطبية", "Healthcare stocks news", "Actualités des valeurs de santé"],
  newStocksNews: ["أخبار الأسهم الجديدة", "New listings news", "Actualités des introductions en bourse"],
  underDollarNews: ["أخبار أسهم أقل من $1", "Stocks under $1 news", "Actualités des actions à moins de 1 $"],
  earningsNews: ["أخبار الأرباح والنتائج", "Earnings and results", "Bénéfices et résultats"],
  analystNews: ["أخبار المحللين", "Analyst news", "Actualités des analystes"],
  mergersNews: ["أخبار الاندماجات والاستحواذات", "Mergers and acquisitions", "Fusions et acquisitions"],
  unusualNews: ["التحركات غير العادية", "Unusual moves", "Mouvements inhabituels"],
  bankingNews: ["أخبار البنوك", "Banking news", "Actualités bancaires"],
  shariaNews: ["أخبار الأسهم الشرعية", "Sharia stocks news", "Actualités des actions conformes à la charia"],
  growthNews: ["أخبار أسهم النمو", "Growth stocks news", "Actualités des valeurs de croissance"],
  defensiveNews: ["أخبار الأسهم الدفاعية", "Defensive stocks news", "Actualités des valeurs défensives"],
  cyclicalNews: ["أخبار الأسهم الدورية", "Cyclical stocks news", "Actualités des valeurs cycliques"],
  incomeNews: ["أخبار أسهم الدخل المرتفع", "High income stocks news", "Actualités des valeurs de rendement"],
} as const;
export const TV_NEWS_TOPICS = ['news', 'technology', ...TV_EXTRA_NEWS_CHANNELS] as const;
export type TvReceiverNewsChannel = typeof TV_NEWS_TOPICS[number] | 'kuwait';
export function isTvExtraNewsChannel(value: unknown): value is TvExtraNewsChannel {
  return typeof value === 'string' && Object.hasOwn(TV_NEWS_FEEDS, value);
}
export function receiverNewsPath(channel: TvReceiverNewsChannel, language: TvLanguage) {
  if (channel === 'news') return `/api/tv/news?language=${language}`;
  if (!isTvExtraNewsChannel(channel)) return `/api/tv/news?language=${language}&channel=${channel}`;
  if (channel === 'shariaNews') return `/api/sharia-stocks/news?lang=${language}&limit=24&view=headlines&scope=compliant`;
  const path = TV_NEWS_FEEDS[channel];
  const headlinesOnly = /^\/api\/[a-z]+-stocks\/news$/.test(path) || path === '/api/europe-news';
  return `${path}${path.includes('?') ? '&' : '?'}lang=${language}&limit=24${headlinesOnly ? '&view=headlines' : ''}`;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function date(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}
export function receiverNewsPayload(value: unknown, channel: TvReceiverNewsChannel) {
  const body = record(value), extra = isTvExtraNewsChannel(channel);
  const rows = extra ? body.items : body.stories;
  const topic = extra ? new URL(TV_NEWS_FEEDS[channel], 'https://www.the-sfm.com').searchParams.get('topic') : null;
  const category = extra ? TV_NEWS_FEEDS[channel].match(/^\/api\/([a-z]+)-stocks\/news$/)?.[1] : null;
  const valid = Array.isArray(rows) && (extra ? (!topic || body.topic === topic) && (!category || body.category === category) : body.channel === (channel === 'news' ? 'all' : channel));
  const seen = new Set<string>();
  const stories: TvNews[] = valid ? rows.flatMap(value => {
    const item = record(value), url = typeof item.url === 'string' ? safeTvUrl(item.url) : null;
    const title = typeof item.title === 'string' ? item.title : item.headline;
    const source = typeof item.source === 'string' ? item.source : item.sourceName;
    const publishedAt = date(item.publishedAt);
    if (!url || typeof title !== 'string' || !title.trim() || typeof source !== 'string' || !source.trim() || !publishedAt || seen.has(url)) return [];
    if (channel === 'shariaNews' && item.shariahStatus !== 'compliant') return [];
    seen.add(url);
    const imageUrl = [item.imageUrl, item.image, item.thumbnail]
      .map(tvNewsPhotoUrl).find(Boolean);
    const status = item.shariahStatus;
    const screening: TvNews['screening'] = channel === 'shariaNews' ? status === 'compliant' || status === 'needs_review' || status === 'non_compliant' ? status : 'unclassified' : undefined;
    return [{ id: typeof item.id === 'string' ? item.id : url, title, source, publishedAt, url, ...(imageUrl ? { imageUrl } : {}), ...(screening ? { screening } : {}) }];
  }).slice(0, 60) : [];
  return { stories, invalid: !valid || body.success === false || body.ok === false,
    partial: body.partialFailure === true, stored: body.storedFallbackUsed === true,
    updatedAt: date(body.lastSuccessfulUpdate) ?? date(body.generatedAt) };
}

