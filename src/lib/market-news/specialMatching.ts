import type { ConsolidatedNewsStory } from './types';
import { TOPICS, type TopicId } from './specialTopics';
import { isMetalsMarketNews } from '../news/metalsNews';

const FED_PATTERN = /\b(federal reserve|fomc|fed chair|jerome powell|powell)\b|الاحتياطي الفيدرالي|الفدرالي|باول/iu;
const HEALTHCARE_PATTERN = /\b(healthcare|health care|biotech|biotechnology|pharma|pharmaceutical|medical device|fda|clinical trial|drug approval|diagnostic|hospital)\b|الرعاية الصحية|الأدوية|الدواء|التكنولوجيا الحيوية|تجارب سريرية/iu;
const NEW_LISTING_PATTERN = /\b(ipo|initial public offering|newly listed|new listing|market debut|trading debut|direct listing|public debut|begins trading)\b|اكتتاب|طرح عام|إدراج جديد/iu;
const HISTORICAL_IPO_PATTERN = /\b(since (?:its |their |the )?ipo|(?:years?|decades?) (?:after|since)|(?:invested|bought).{0,60}(?:ipo|public)|ipo.{0,30}(?:years? ago|anniversary))\b|منذ اكتتاب|منذ إدراج|لو استثمرت/iu;
const EARNINGS_PATTERN = /\b(earnings|quarterly results|revenue|eps|guidance|profit|margin|beat estimates|missed estimates)\b|أرباح|إيرادات|نتائج مالية|نتائج الأعمال/iu;
const ANALYST_PATTERN = /\b(analyst|upgrade|downgrade|price target|rating|initiated coverage|overweight|underweight)\b|السعر المستهدف|توصية السهم|رفع التوصية|خفض التوصية/iu;
const MA_PATTERN = /\b(merger|acquisition|takeover|buyout|acquire|acquired|strategic combination)\b|استحواذ|اندماج/iu;
const UNUSUAL_PATTERN = /\b(surg(?:e|es|ed|ing)|plung(?:e|es|ed|ing)|soar\w*|tumbl\w*|spik\w*|slump\w*|jump\w*|fall\w*|rall(?:y|ies|ied)|selloff|unusual volume|heavy volume|trading halt|volatile|volatility|gap up|gap down)\b|قفزة|ارتفاع السهم|هبوط السهم|تراجع السهم|وقف التداول/iu;

export function cleanTopic(value: string | null): TopicId | null {
  const topic = String(value ?? '').trim().toLowerCase();
  return Object.hasOwn(TOPICS, topic) ? topic as TopicId : null;
}

function storyText(story: ConsolidatedNewsStory) {
  return `${story.title} ${story.summary ?? ''} ${story.companyNames.join(' ')} ${story.sectors.join(' ')} ${story.industries.join(' ')}`;
}

function matchesNewListing(story: ConsolidatedNewsStory) {
  if (!NEW_LISTING_PATTERN.test(story.title) || HISTORICAL_IPO_PATTERN.test(story.title)) return false;
  const publishedAt = Date.parse(story.publishedAt);
  const originalPublishedAt = Date.parse(story.earliestPublishedAt);
  const oldest = Number.isFinite(originalPublishedAt) ? Math.min(publishedAt, originalPublishedAt) : publishedAt;
  const now = Date.now();
  return Number.isFinite(oldest) && oldest >= now - TOPICS['new-stocks'].days * 86_400_000
    && publishedAt <= now + 5 * 60_000;
}

export function matchesTopic(topic: TopicId, story: ConsolidatedNewsStory) {
  const text = storyText(story);
  if (topic === 'federal-reserve') return FED_PATTERN.test(text);
  if (topic === 'healthcare-stocks') {
    const hasCompany = story.symbols.length > 0 || story.companyNames.length > 0 || /\b(stock|shares?|nasdaq|nyse|company|pharmaceuticals?)\b|سهم|أسهم|شركة/iu.test(text);
    return hasCompany && HEALTHCARE_PATTERN.test(text);
  }
  if (topic === 'new-stocks') return matchesNewListing(story);
  if (topic === 'metals-news') return isMetalsMarketNews(story);
  if (topic === 'earnings-news') return ['earnings_results', 'earnings_guidance'].includes(story.eventType) || EARNINGS_PATTERN.test(text);
  if (topic === 'analyst-ratings-news') return story.eventType === 'analyst_rating_change' || ANALYST_PATTERN.test(text);
  if (topic === 'mergers-acquisitions-news') return ['merger_acquisition', 'acquisition_offer'].includes(story.eventType) || MA_PATTERN.test(text);
  if (topic === 'unusual-moves-news') return UNUSUAL_PATTERN.test(text);
  return true;
}
