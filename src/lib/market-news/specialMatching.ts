import type { ConsolidatedNewsStory, NormalizedNewsItem } from './types';
import { TOPICS, type TopicId } from './specialTopics';
import { isMetalsMarketNews } from '../news/metalsNews';
import { hasIpoRegionEvidence, isIpoTopic, type IpoTopicId } from './ipoRegions';

const FED_PATTERN = /\b(federal reserve|fomc|fed chair|jerome powell|powell)\b|الاحتياطي الفيدرالي|الفدرالي|باول/iu;
const HEALTHCARE_PATTERN = /\b(healthcare|health care|biotech|biotechnology|pharma|pharmaceutical|medical device|fda|clinical trial|drug approval|diagnostic|hospital)\b|الرعاية الصحية|الأدوية|الدواء|التكنولوجيا الحيوية|تجارب سريرية/iu;
const NEW_LISTING_PATTERN = /\b(ipo|initial public offering|newly listed|new listing|market debut|trading debut|direct listing|public debut|begins trading)\b|اكتتاب|طرح عام|إدراج جديد/iu;
// Regional IPO pages accept the same evidence in the languages their feeds use.
const REGIONAL_IPO_PATTERN = /\b(ipos?|initial public offering|public offering|newly listed|new listing|market debut|trading debut|stock market debut|direct listing|public debut|begins trading|go(?:es|ing)? public|flotation|intention to float|listing on|introduction en bourse|entrée en bourse|börsengang|börsendebüt)\b|اكتتاب|طرح عام|طرح أولي|الطرح العام/iu;
const ARABIC_LISTING = /[إا]دراج|[يت]درج/u;
const EQUITY_CONTEXT = /أسهم|سهم|شركة|شركات|البورصة|بورصة|سوق (?:دبي|أبوظبي|الأسهم)|تاسي/u;
// Bond/fund listings, capital increases and administrative lists also use "إدراج" or "اكتتاب".
const NON_EQUITY_OFFERING = /\b(?:follow-on|secondary offering|rights issue|bond issuance|treasury bills?|ETF listing)\b|أذون خزانة|أدوات دين|صكوك|سندات|صناديق المؤشرات|(?:[يت]درج|إدراج) (?:ال)?صندوق|حقوق [أا]ولوية|اكتتاب.{0,60}(?:صندوق النقد|هيئة التنمية الدولية)|الاكتتاب (?:المباشر|التأميني)/iu;
const CAPITAL_INCREASE = /زيادة رأس (?:ال)?مال/u;
const INITIAL_OFFER = /\b(?:ipo|initial public offering)\b|(?:ال)?(?:طرح|اكتتاب) (?:ال)?عام (?:ال)?أولي/iu;
const NON_LISTING_EVENT = /(?:إلغاء|يلغي|شطب|نقل|تنقل) (?:قيد |ال)?إدراج|قوائم (?:الإرهاب|العقوبات)|قائمة (?:الإرهاب|العقوبات)|القائمة الرمادية|عقود الفروقات|العقود الدائمة/iu;
// Hiring a communications agency does not establish where the shares will trade.
const PR_APPOINTMENT = /\b(?:hires?|appoints?|retains?)\b.{0,70}\b(?:public affairs|public relations|PR agency|communications agency)\b/iu;
const HISTORICAL_IPO_PATTERN = /\b(since (?:its |their |the )?ipo|(?:years?|decades?) (?:after|since)|(?:invested|bought).{0,60}(?:ipo|public)|ipo.{0,30}(?:years? ago|anniversary))\b|منذ (?:ال)?اكتتاب|منذ (?:ال)?إدراج|لو استثمرت/iu;
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

type ListingStory = NormalizedNewsItem & { earliestPublishedAt?: string };

function matchesNewListing(story: ListingStory, topic: TopicId = 'new-stocks', title = story.title) {
  const capitalIncreaseOnly = CAPITAL_INCREASE.test(title) && !INITIAL_OFFER.test(title);
  if (topic !== 'new-stocks' && (capitalIncreaseOnly || NON_EQUITY_OFFERING.test(title) || NON_LISTING_EVENT.test(title) || PR_APPOINTMENT.test(title))) return false;
  const ipo = topic === 'new-stocks' ? NEW_LISTING_PATTERN.test(title)
    : REGIONAL_IPO_PATTERN.test(title) || (ARABIC_LISTING.test(title) && EQUITY_CONTEXT.test(title));
  if (!ipo || HISTORICAL_IPO_PATTERN.test(title)) return false;
  const publishedAt = Date.parse(story.publishedAt);
  const originalPublishedAt = Date.parse(story.earliestPublishedAt ?? '');
  const oldest = Number.isFinite(originalPublishedAt) ? Math.min(publishedAt, originalPublishedAt) : publishedAt;
  const now = Date.now();
  return Number.isFinite(oldest) && oldest >= now - TOPICS[topic].days * 86_400_000
    && publishedAt <= now + 5 * 60_000;
}

export function ipoArticleText(story: Pick<NormalizedNewsItem, 'title' | 'summary' | 'sourceName'>) {
  const source = story.sourceName.trim();
  const stripSuffix = (text: string, separator: RegExp) => {
    if (!source || !text.endsWith(source)) return text;
    const prefix = text.slice(0, -source.length);
    return separator.test(prefix) ? prefix.replace(separator, '').trimEnd() : text;
  };
  const title = stripSuffix(story.title.trim(), /\s+[|–—-]\s*$/u);
  const description = (story.summary ?? '').replace(/&nbsp;/gi, ' ').trim();
  // Google repeats the headline followed by the publisher in its RSS description.
  const summary = stripSuffix(description, /(?:\s+[|–—-]\s*|\s{2,})$/u);
  return { title, summary: summary === title || summary === source ? '' : summary };
}

export function matchesRegionalIpo(topic: IpoTopicId, story: ListingStory) {
  // RSS may append the publisher to both the title and description.
  const { title, summary } = ipoArticleText(story);
  const exchange = story.isOfficial && story.sourceType === 'official_exchange' ? story.exchangeCodes.join(' ') : '';
  return matchesNewListing(story, topic, title)
    && hasIpoRegionEvidence(topic, title, summary, exchange);
}

export function matchesTopic(topic: TopicId, story: ConsolidatedNewsStory) {
  const text = storyText(story);
  if (topic === 'federal-reserve') return FED_PATTERN.test(text);
  if (topic === 'healthcare-stocks') {
    const hasCompany = story.symbols.length > 0 || story.companyNames.length > 0 || /\b(stock|shares?|nasdaq|nyse|company|pharmaceuticals?)\b|سهم|أسهم|شركة/iu.test(text);
    return hasCompany && HEALTHCARE_PATTERN.test(text);
  }
  if (topic === 'new-stocks') return matchesNewListing(story);
  if (isIpoTopic(topic)) return matchesRegionalIpo(topic, story);
  if (topic === 'metals-news') return isMetalsMarketNews(story);
  if (topic === 'earnings-news') return ['earnings_results', 'earnings_guidance'].includes(story.eventType) || EARNINGS_PATTERN.test(text);
  if (topic === 'analyst-ratings-news') return story.eventType === 'analyst_rating_change' || ANALYST_PATTERN.test(text);
  if (topic === 'mergers-acquisitions-news') return ['merger_acquisition', 'acquisition_offer'].includes(story.eventType) || MA_PATTERN.test(text);
  if (topic === 'unusual-moves-news') return UNUSUAL_PATTERN.test(text);
  return true;
}
