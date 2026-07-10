import { createHash } from 'node:crypto';
import type {
  ConsolidatedNewsStory,
  FinancialEventType,
  NewsFetchParams,
  NormalizedNewsItem,
  NewsSupportingSource,
} from './types';
import { enrichNewsEntities } from './entityResolver';
import { logMarketNewsEvent } from './logger';
import { publisherNetworkKey } from './providers/shared';

const PROCESSING_VERSION = 'market-news-v1';
const TRACKING_PARAMETERS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'referrer', 'source',
]);

const LOW_QUALITY_PATTERNS = [
  /\bsponsored\b/i,
  /\baffiliate\b/i,
  /\badvertorial\b/i,
  /\bpromo(?:tion|tional)?\b/i,
  /\bclick here\b/i,
  /\bbuy now\b/i,
  /\bcoupon\b/i,
  /\bcasino\b/i,
  /\bbetting odds\b/i,
  /محتوى\s+إعلاني/u,
  /إعلان\s+مدفوع/u,
  /contenu\s+sponsorisé/i,
];

const FINANCIAL_TERMS = [
  'stock', 'share', 'market', 'exchange', 'earnings', 'revenue', 'profit', 'loss', 'dividend', 'guidance',
  'acquisition', 'merger', 'ipo', 'listing', 'delisting', 'suspension', 'regulator', 'filing', 'sec', 'contract',
  'inflation', 'interest rate', 'central bank', 'employment', 'currency', 'commodity', 'oil', 'gold', 'bond', 'debt',
  'capital', 'buyback', 'rating', 'bankruptcy', 'restructuring', 'cybersecurity', 'lawsuit', 'trading',
  'سهم', 'أسهم', 'السوق', 'البورصة', 'أرباح', 'إيرادات', 'توزيعات', 'اندماج', 'استحواذ', 'اكتتاب', 'تضخم', 'فائدة',
  'action', 'actions', 'marché', 'bourse', 'résultats', 'bénéfice', 'dividende', 'fusion', 'acquisition', 'inflation', 'taux',
];

type EventRule = { type: FinancialEventType; patterns: RegExp[] };

const EVENT_RULES: EventRule[] = [
  { type: 'dividend_cancellation', patterns: [/dividend.{0,24}(cancel|suspend|omit|cut)/i, /(cancel|suspend|omit).{0,24}dividend/i, /إلغاء.{0,16}توزيعات/u, /annul.{0,20}dividende/i] },
  { type: 'dividend_announcement', patterns: [/\bdividend\b/i, /توزيعات.{0,10}(نقدية|أرباح)?/u, /\bdividende\b/i] },
  { type: 'earnings_guidance', patterns: [/\bguidance\b/i, /\boutlook\b/i, /توقعات.{0,16}(أرباح|إيرادات)/u, /prévision.{0,18}(résultat|revenu)/i] },
  { type: 'earnings_results', patterns: [/\bearnings\b/i, /quarterly results/i, /financial results/i, /نتائج.{0,14}(مالية|أعمال)/u, /résultats.{0,16}(financiers|trimestriels)/i] },
  { type: 'acquisition_offer', patterns: [/takeover offer/i, /acquisition offer/i, /عرض.{0,12}استحواذ/u, /offre.{0,12}(rachat|acquisition)/i] },
  { type: 'merger_acquisition', patterns: [/\bmerger\b/i, /\bacquisition\b/i, /\btakeover\b/i, /اندماج|استحواذ/u, /fusion|rachat/i] },
  { type: 'ipo_listing', patterns: [/\bipo\b/i, /initial public offering/i, /new listing/i, /طرح.{0,12}(عام|أولي)|اكتتاب/u, /introduction en bourse/i] },
  { type: 'delisting', patterns: [/\bdelist/i, /شطب.{0,12}(سهم|إدراج)/u, /radiation.{0,12}cote/i] },
  { type: 'trading_suspension', patterns: [/trading.{0,12}suspend/i, /suspend.{0,12}trading/i, /وقف.{0,12}التداول/u, /suspension.{0,12}cotation/i] },
  { type: 'regulatory_action', patterns: [/regulator.{0,20}(action|fine|charge|probe)/i, /\bsec (charges|fines|sues|investigates)\b/i, /إجراء.{0,12}رقابي|غرامة.{0,12}تنظيمية/u, /sanction.{0,16}réglementaire/i] },
  { type: 'lawsuit_legal_decision', patterns: [/\blawsuit\b/i, /court (rules|decision|order)/i, /legal decision/i, /دعوى|حكم.{0,12}قضائي/u, /procès|décision.{0,12}justice/i] },
  { type: 'credit_rating_change', patterns: [/rating.{0,18}(upgrade|downgrade|outlook)/i, /(upgrade|downgrade).{0,18}rating/i, /تصنيف.{0,16}ائتماني/u, /notation.{0,18}(relevée|abaissée)/i] },
  { type: 'debt_issuance', patterns: [/debt issuance/i, /bond (sale|offering|issue)/i, /إصدار.{0,12}(سندات|صكوك|دين)/u, /émission.{0,12}(obligataire|dette)/i] },
  { type: 'capital_increase', patterns: [/capital increase/i, /rights issue/i, /زيادة.{0,12}رأس المال/u, /augmentation.{0,12}capital/i] },
  { type: 'share_buyback', patterns: [/share buyback/i, /stock repurchase/i, /إعادة.{0,12}شراء.{0,12}أسهم/u, /rachat.{0,12}actions/i] },
  { type: 'insider_transaction', patterns: [/insider (sale|purchase|transaction|trading)/i, /تعاملات.{0,12}مطلعين/u, /opération.{0,12}initié/i] },
  { type: 'management_change', patterns: [/(ceo|cfo|chairman|president).{0,20}(resign|appoint|named|leave)/i, /(appoint|name).{0,20}(ceo|cfo|chairman|president)/i, /تعيين|استقالة.{0,18}(رئيس|مدير)/u, /nomm.{0,18}(directeur|président)|démission/i] },
  { type: 'major_contract', patterns: [/major contract/i, /awarded.{0,16}contract/i, /wins.{0,16}contract/i, /عقد.{0,16}(كبير|رئيسي|جديد)/u, /contrat.{0,16}majeur/i] },
  { type: 'product_launch', patterns: [/product launch/i, /launches.{0,18}(product|service|platform)/i, /إطلاق.{0,16}(منتج|خدمة|منصة)/u, /lancement.{0,16}(produit|service)/i] },
  { type: 'cybersecurity_incident', patterns: [/cyber(?:security)? (attack|incident|breach)/i, /data breach/i, /ransomware/i, /هجوم.{0,12}سيبراني|اختراق.{0,12}بيانات/u, /cyberattaque|violation.{0,12}données/i] },
  { type: 'operational_disruption', patterns: [/operational disruption/i, /outage/i, /production halt/i, /تعطل.{0,12}(تشغيلي|الإنتاج)|توقف.{0,12}الإنتاج/u, /perturbation.{0,12}opérationnelle/i] },
  { type: 'bankruptcy_restructuring', patterns: [/\bbankrupt/i, /chapter 11/i, /restructur/i, /إفلاس|إعادة.{0,12}هيكلة/u, /faillite|restructuration/i] },
  { type: 'analyst_rating_change', patterns: [/analyst.{0,16}(upgrade|downgrade)/i, /(upgrade|downgrade).{0,16}(stock|shares)/i, /محلل.{0,14}(رفع|خفض).{0,12}التوصية/u, /analyste.{0,16}(relève|abaisse)/i] },
  { type: 'interest_rate_decision', patterns: [/interest rate.{0,18}(decision|raise|cut|hold)/i, /rate (hike|cut|decision)/i, /قرار.{0,12}(الفائدة|سعر الخصم)/u, /décision.{0,16}taux/i] },
  { type: 'inflation_report', patterns: [/\binflation\b/i, /\bcpi\b/i, /consumer price index/i, /التضخم|أسعار المستهلك/u, /inflation|prix à la consommation/i] },
  { type: 'employment_report', patterns: [/employment report/i, /nonfarm payroll/i, /\bnfp\b/i, /unemployment rate/i, /تقرير.{0,12}الوظائف|البطالة/u, /rapport.{0,12}emploi|chômage/i] },
  { type: 'commodity_price_event', patterns: [/\b(oil|gold|silver|copper|natural gas).{0,24}(price|surge|fall|rally|drop)/i, /أسعار.{0,12}(النفط|الذهب|الفضة|الغاز)/u, /prix.{0,12}(pétrole|or|argent|gaz)/i] },
  { type: 'currency_event', patterns: [/\b(currency|dollar|euro|yen|sterling).{0,24}(surge|fall|rally|drop|intervention)/i, /العملة|الدولار|اليورو|الين/u, /devise|dollar|euro|yen/i] },
  { type: 'geopolitical_event', patterns: [/geopolit/i, /sanctions/i, /war|conflict|ceasefire/i, /جيوسياسي|عقوبات|حرب|نزاع/u, /géopolitique|sanctions|guerre|conflit/i] },
  { type: 'exchange_announcement', patterns: [/stock exchange.{0,18}(announc|notice)/i, /exchange notice/i, /إعلان.{0,12}البورصة|إفصاح.{0,12}السوق/u, /avis.{0,12}bourse/i] },
  { type: 'shariah_classification_update', patterns: [/shariah.{0,18}(classification|compliance|screen)/i, /تصنيف.{0,12}شرعي|توافق.{0,12}شرعي/u, /classification.{0,12}charia/i] },
  { type: 'macroeconomic_release', patterns: [/\bgdp\b/i, /economic growth/i, /retail sales/i, /industrial production/i, /الناتج.{0,12}المحلي|نمو.{0,12}اقتصادي/u, /pib|croissance économique/i] },
];

const EVENT_IMPORTANCE: Partial<Record<FinancialEventType, number>> = {
  trading_suspension: 94,
  bankruptcy_restructuring: 93,
  merger_acquisition: 88,
  acquisition_offer: 88,
  regulatory_action: 86,
  interest_rate_decision: 90,
  earnings_results: 78,
  earnings_guidance: 78,
  dividend_cancellation: 82,
  capital_increase: 79,
  delisting: 91,
  cybersecurity_incident: 82,
  operational_disruption: 76,
  ipo_listing: 74,
  credit_rating_change: 75,
  share_buyback: 68,
  dividend_announcement: 66,
  macroeconomic_release: 82,
  inflation_report: 88,
  employment_report: 84,
  geopolitical_event: 84,
  exchange_announcement: 72,
};

const POSITIVE_PATTERNS = [/beats? estimates/i, /record (profit|revenue)/i, /raises? guidance/i, /upgrade/i, /wins? contract/i, /buyback/i, /dividend increase/i, /نمو.{0,12}(الأرباح|الإيرادات)/u, /رفع.{0,12}التوقعات/u, /dépasse.{0,12}prévisions/i];
const NEGATIVE_PATTERNS = [/misses? estimates/i, /profit warning/i, /cuts? guidance/i, /downgrade/i, /bankrupt/i, /fraud/i, /data breach/i, /suspend.{0,12}trading/i, /خفض.{0,12}التوقعات|خسائر|إفلاس|احتيال/u, /avertissement.{0,12}résultats|faillite/i];

const STATUS_GROUPS = {
  completed: [/\b(completed|closed|finali[sz]ed|approved)\b/i, /تم.{0,8}(الاستحواذ|الاندماج|الإتمام)|اكتمل/u, /achevé|finalisé|approuvé/i],
  ongoing: [/\b(negotiat|talks|considering|ongoing|seeking)\b/i, /مفاوضات|محادثات|قيد.{0,8}(الدراسة|التفاوض)/u, /négociation|pourparlers|en cours/i],
  denied: [/\b(denied|rejected|cancelled|canceled|terminated|no deal)\b/i, /رفض|إلغاء|إنهاء.{0,8}(الصفقة|المفاوضات)/u, /refusé|annulé|résilié/i],
};

const CONFLICT_SENSITIVE_EVENTS = new Set<FinancialEventType>([
  'earnings_results', 'earnings_guidance', 'dividend_announcement', 'dividend_cancellation',
  'merger_acquisition', 'acquisition_offer', 'trading_suspension', 'regulatory_action',
  'capital_increase', 'interest_rate_decision', 'credit_rating_change',
]);

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))];
}

export function normalizeNewsTitle(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/(?:^|\s)[|–—-]\s*(reuters|bloomberg|cnbc|yahoo finance|marketwatch|google news)\s*$/i, '')
    .replace(/[^\p{L}\p{N}%$€£¥]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveCanonicalUrl(value: string | null | undefined) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    url.hash = '';
    [...url.searchParams.keys()].forEach(key => {
      if (TRACKING_PARAMETERS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    });
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

export function calculateContentHash(item: Pick<NormalizedNewsItem, 'title' | 'summary' | 'publishedAt'>) {
  const input = [normalizeNewsTitle(item.title), normalizeNewsTitle(item.summary ?? ''), String(item.publishedAt).slice(0, 10)].join('|');
  return createHash('sha256').update(input).digest('hex');
}

function titleTokens(value: string) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'at', 'with', 'from', 'de', 'du', 'des', 'le', 'la', 'les', 'et', 'un', 'une', 'في', 'من', 'إلى', 'على', 'عن', 'مع', 'و']);
  return normalizeNewsTitle(value).split(' ').filter(token => token.length > 1 && !stopWords.has(token));
}

export function calculateTitleSimilarity(left: string, right: string) {
  const a = new Set(titleTokens(left));
  const b = new Set(titleTokens(right));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export function classifyFinancialEvent(item: Pick<NormalizedNewsItem, 'title' | 'summary'>): FinancialEventType {
  const text = `${item.title} ${item.summary ?? ''}`;
  return EVENT_RULES.find(rule => rule.patterns.some(pattern => pattern.test(text)))?.type ?? 'unknown';
}

function publishedTimestamp(value: string | null | undefined) {
  const timestamp = new Date(String(value ?? '')).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function queryMatches(item: NormalizedNewsItem, params: Partial<NewsFetchParams>) {
  const haystack = normalizeNewsTitle([
    item.title, item.summary ?? '', item.sourceName, item.symbols.join(' '), item.companyNames.join(' '),
    item.marketCodes.join(' '), item.exchangeCodes.join(' '), item.sectors.join(' '), item.eventType,
  ].join(' '));
  const rawQuery = String(params.query ?? '').trim();
  const query = normalizeNewsTitle(rawQuery);
  if (!query) return true;

  // Curated provider queries commonly contain OR-separated market topics. Treat
  // those as alternatives rather than requiring every word from every topic.
  if (/\s+OR\s+/i.test(rawQuery)) {
    return rawQuery
      .split(/\s+OR\s+/i)
      .map(clause => normalizeNewsTitle(clause).split(' ').filter(Boolean))
      .some(tokens => tokens.length > 0 && tokens.every(token => haystack.includes(token)));
  }

  const tokens = unique(query.split(' '));
  const matched = tokens.filter(token => haystack.includes(token)).length;
  return tokens.length <= 3
    ? matched === tokens.length
    : matched >= Math.min(2, Math.ceil(tokens.length * 0.25));
}

export function calculateRelevanceScore(item: NormalizedNewsItem, params: Partial<NewsFetchParams> = {}) {
  const published = publishedTimestamp(item.publishedAt);
  const ageHours = published === null ? Number.POSITIVE_INFINITY : Math.max(0, (Date.now() - published) / 3600000);
  const recency = ageHours <= 6 ? 1 : ageHours <= 24 ? 0.9 : ageHours <= 72 ? 0.72 : ageHours <= 168 ? 0.55 : ageHours <= 720 ? 0.35 : 0.1;
  const text = normalizeNewsTitle(`${item.title} ${item.summary ?? ''}`);
  const financial = FINANCIAL_TERMS.some(term => text.includes(normalizeNewsTitle(term))) || item.eventType !== 'unknown';
  const requestedSymbols = new Set((params.symbols ?? []).map(symbol => symbol.toUpperCase()));
  const entityMatch = item.symbols.some(symbol => requestedSymbols.has(symbol.toUpperCase()))
    ? Math.max(0.9, item.entityConfidenceScore)
    : item.entityConfidenceScore;
  const evidence = clamp((item.sourceReliability * 0.8) + (item.isOfficial ? 0.2 : 0));
  const query = queryMatches(item, params) ? 1 : 0;
  const result = (recency * 0.18) + (evidence * 0.24) + (entityMatch * 0.28) + (financial ? 0.2 : 0) + (query * 0.1);
  return Math.round(clamp(result) * 100);
}

export function calculateImportanceScore(item: NormalizedNewsItem) {
  let score = EVENT_IMPORTANCE[item.eventType] ?? (item.isOfficial ? 58 : 42);
  if (item.isOfficial) score += 9;
  if (item.marketCodes.length > 1 || item.symbols.length >= 4) score += 7;
  if (item.sourceReliability >= 0.9) score += 4;
  const ageHours = Math.max(0, (Date.now() - (publishedTimestamp(item.publishedAt) ?? 0)) / 3600000);
  if (ageHours <= 24) score += 4;
  return Math.round(clamp(score, 0, 100));
}

function sentimentFor(item: Pick<NormalizedNewsItem, 'title' | 'summary'>): NormalizedNewsItem['sentiment'] {
  const text = `${item.title} ${item.summary ?? ''}`;
  const positive = POSITIVE_PATTERNS.filter(pattern => pattern.test(text)).length;
  const negative = NEGATIVE_PATTERNS.filter(pattern => pattern.test(text)).length;
  if (positive > 0 && negative > 0) return 'mixed';
  if (positive > 0) return 'positive';
  if (negative > 0) return 'negative';
  return 'unknown';
}

export function analyzeExpectedImpact(item: NormalizedNewsItem): Pick<NormalizedNewsItem, 'sentiment' | 'impactDirection' | 'expectedImpact' | 'impactHorizon' | 'impactReason'> {
  const sentiment = item.sentiment === 'unknown' ? sentimentFor(item) : item.sentiment;
  const importance = item.importanceScore || calculateImportanceScore(item);
  const expectedImpact = importance >= 80 ? 'high' : importance >= 58 ? 'medium' : importance >= 38 ? 'low' : 'unknown';
  const immediate = new Set<FinancialEventType>(['trading_suspension', 'earnings_results', 'dividend_announcement', 'interest_rate_decision', 'regulatory_action', 'cybersecurity_incident']);
  const medium = new Set<FinancialEventType>(['capital_increase', 'debt_issuance', 'major_contract', 'product_launch', 'macroeconomic_release']);
  const impactHorizon = immediate.has(item.eventType) ? 'immediate' : medium.has(item.eventType) ? 'medium_term' : item.eventType === 'unknown' ? 'unknown' : 'short_term';
  return {
    sentiment,
    impactDirection: sentiment,
    expectedImpact,
    impactHorizon,
    impactReason: item.eventType === 'unknown' ? 'insufficient_evidence' : `event:${item.eventType}`,
  };
}

export function isRelevantNewsItem(item: NormalizedNewsItem, params: Partial<NewsFetchParams> = {}) {
  const published = publishedTimestamp(item.publishedAt);
  if (published === null || published > Date.now() + 10 * 60 * 1000) return { accepted: false, reason: 'invalid_publication_date' } as const;
  if (!resolveCanonicalUrl(item.originalUrl) || !item.title.trim()) return { accepted: false, reason: 'invalid_source_metadata' } as const;
  if (LOW_QUALITY_PATTERNS.some(pattern => pattern.test(`${item.title} ${item.summary ?? ''}`))) return { accepted: false, reason: 'promotional_or_low_quality' } as const;
  if (item.title.trim().length < 12) return { accepted: false, reason: 'insufficient_information' } as const;
  const from = publishedTimestamp(params.from);
  const to = publishedTimestamp(params.to);
  if (from !== null && published < from) return { accepted: false, reason: 'outside_date_range' } as const;
  if (to !== null && published > to + 86400000) return { accepted: false, reason: 'outside_date_range' } as const;
  if (params.officialOnly && !item.isOfficial) return { accepted: false, reason: 'official_only' } as const;
  if (!queryMatches(item, params)) return { accepted: false, reason: 'query_mismatch' } as const;
  if (params.strictEntityFilter && (params.symbols ?? []).length > 0 && !item.symbols.some(symbol => (params.symbols ?? []).map(value => value.toUpperCase()).includes(symbol.toUpperCase()))) {
    return { accepted: false, reason: 'entity_mismatch' } as const;
  }
  const text = normalizeNewsTitle(`${item.title} ${item.summary ?? ''}`);
  const financiallyRelevant = item.isOfficial || item.eventType !== 'unknown' || item.symbols.length > 0 || FINANCIAL_TERMS.some(term => text.includes(normalizeNewsTitle(term)));
  if (!financiallyRelevant) return { accepted: false, reason: 'not_financially_relevant' } as const;
  return { accepted: true, reason: null } as const;
}

function fingerprintFor(item: NormalizedNewsItem) {
  const numbers = `${item.title} ${item.summary ?? ''}`.match(/(?:[$€£¥]\s*)?\d[\d,.]*(?:\s*(?:%|million|billion|m|bn|مليون|مليار))?/gi) ?? [];
  const identity = item.symbols.length > 0 ? item.symbols.slice().sort().join(',') : titleTokens(item.title).slice(0, 6).sort().join(',');
  const dateBucket = item.publishedAt.slice(0, 10);
  return createHash('sha256').update([identity, item.eventType, unique(numbers).slice(0, 5).join(','), dateBucket].join('|')).digest('hex');
}

export function normalizeNewsItem(item: NormalizedNewsItem, params: Partial<NewsFetchParams> = {}): NormalizedNewsItem {
  const canonicalUrl = resolveCanonicalUrl(item.canonicalUrl) ?? resolveCanonicalUrl(item.originalUrl);
  const normalizedTitle = normalizeNewsTitle(item.title);
  const enriched = enrichNewsEntities({
    ...item,
    canonicalUrl,
    normalizedTitle,
    contentHash: item.contentHash || calculateContentHash(item),
    processingVersion: PROCESSING_VERSION,
  }, params);
  const eventType = item.eventType && item.eventType !== 'unknown' ? item.eventType : classifyFinancialEvent(enriched);
  const withScores: NormalizedNewsItem = {
    ...enriched,
    eventType,
    relevanceScore: calculateRelevanceScore({ ...enriched, eventType }, params),
    importanceScore: calculateImportanceScore({ ...enriched, eventType }),
    eventFingerprint: item.eventFingerprint || fingerprintFor({ ...enriched, eventType }),
  };
  return { ...withScores, ...analyzeExpectedImpact(withScores) };
}

function timeDistanceHours(a: NormalizedNewsItem, b: NormalizedNewsItem) {
  const left = publishedTimestamp(a.publishedAt) ?? 0;
  const right = publishedTimestamp(b.publishedAt) ?? 0;
  return Math.abs(left - right) / 3600000;
}

export function areDuplicateStories(left: NormalizedNewsItem, right: NormalizedNewsItem) {
  if (left.canonicalUrl && right.canonicalUrl && left.canonicalUrl === right.canonicalUrl) return true;
  if (left.contentHash && right.contentHash && left.contentHash === right.contentHash) return true;
  if (left.normalizedTitle && left.normalizedTitle === right.normalizedTitle && timeDistanceHours(left, right) <= 168) return true;
  const similarity = calculateTitleSimilarity(left.title, right.title);
  if (similarity >= 0.92 && timeDistanceHours(left, right) <= 120) return true;
  const sameEntities = left.symbols.some(symbol => right.symbols.includes(symbol));
  const compatibleEvent = left.eventType === right.eventType && left.eventType !== 'unknown';
  if (similarity >= 0.72 && timeDistanceHours(left, right) <= 72 && (sameEntities || compatibleEvent)) return true;
  if (sameEntities && compatibleEvent && left.eventFingerprint === right.eventFingerprint && timeDistanceHours(left, right) <= 48) return true;
  return false;
}

export function detectDuplicates(items: NormalizedNewsItem[]) {
  const groups: NormalizedNewsItem[][] = [];
  for (const item of items) {
    const existing = groups.find(group => group.some(candidate => areDuplicateStories(candidate, item)));
    if (existing) {
      existing.push(item);
      logMarketNewsEvent('duplicate_detected', { sourceId: item.sourceId, canonicalUrl: item.canonicalUrl, groupSize: existing.length });
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

function primaryRank(item: NormalizedNewsItem) {
  const evidenceRank = item.isOfficial
    ? 0
    : item.sourceType === 'company_ir' || item.sourceType === 'corporate_press_release'
      ? 1
      : item.sourceType === 'social_signal'
        ? 4
        : 2;
  const effectivePriority = item.sourceType === 'social_signal' ? 5 : item.sourcePriority;
  return [evidenceRank, effectivePriority, -item.sourceReliability, publishedTimestamp(item.publishedAt) ?? Number.MAX_SAFE_INTEGER] as const;
}

export function choosePrimarySource(items: NormalizedNewsItem[]) {
  return items.slice().sort((left, right) => {
    const a = primaryRank(left);
    const b = primaryRank(right);
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3];
  })[0];
}

function sourceNetwork(item: NormalizedNewsItem) {
  return publisherNetworkKey(item.sourceNetworkId || item.sourceDomain || item.sourceName);
}

const MATERIAL_CLAIM_LABELS: Array<[string, RegExp]> = [
  ['dividend', /\bdividend\b|توزيعات|أرباح موزعة/i],
  ['earnings_per_share', /\beps\b|earnings per share|ربحية السهم/i],
  ['revenue', /\brevenue\b|\bsales\b|إيرادات|مبيعات/i],
  ['profit', /\bprofit\b|net income|أرباح صافية|صافي الربح/i],
  ['offer_price', /offer price|purchase price|سعر العرض|قيمة الصفقة/i],
  ['interest_rate', /interest rate|policy rate|سعر الفائدة/i],
  ['inflation', /inflation|consumer price|التضخم/i],
  ['capital', /capital increase|share capital|زيادة رأس المال/i],
];

function normalizedClaimValue(value: string) {
  return value.toLocaleLowerCase('und')
    .replace(/\bbn\b/g, 'billion')
    .replace(/\bm\b/g, 'million')
    .replace(/\bpercent\b/g, '%')
    .replace(/\s+/g, '')
    .replace(/,/g, '');
}

function materialNumberClaims(item: NormalizedNewsItem) {
  const text = item.title;
  const claims = new Map<string, Set<string>>();
  const numberPattern = /(?:[$€£¥]\s*)?\d[\d,.]*(?:\s*(?:%|percent|million|billion|m|bn|مليون|مليار))?/gi;
  for (const match of text.matchAll(numberPattern)) {
    const raw = match[0];
    if (/^20\d{2}$/.test(raw.trim())) continue;
    const index = match.index ?? 0;
    const context = text.slice(Math.max(0, index - 55), Math.min(text.length, index + raw.length + 35));
    const label = MATERIAL_CLAIM_LABELS.find(([, pattern]) => pattern.test(context))?.[0];
    if (!label) continue;
    const values = claims.get(label) ?? new Set<string>();
    values.add(normalizedClaimValue(raw));
    claims.set(label, values);
  }
  return claims;
}

export type ConflictDetectionResult = { conflicting: boolean; code: 'status_disagreement' | 'material_value_disagreement' | null; sourceIds: string[] };

export function detectConflicts(items: NormalizedNewsItem[]): ConflictDetectionResult {
  const independent = items.filter((item, index) => items.findIndex(candidate => sourceNetwork(candidate) === sourceNetwork(item)) === index);
  if (independent.length < 2) return { conflicting: false, code: null, sourceIds: [] };

  const statuses = independent.map(item => {
    const text = `${item.title} ${item.summary ?? ''}`;
    const group = (Object.entries(STATUS_GROUPS) as Array<[keyof typeof STATUS_GROUPS, RegExp[]]>).find(([, patterns]) => patterns.some(pattern => pattern.test(text)))?.[0];
    return { item, group };
  }).filter(entry => entry.group);
  if (new Set(statuses.map(entry => entry.group)).size >= 2) {
    return { conflicting: true, code: 'status_disagreement', sourceIds: statuses.map(entry => entry.item.sourceId) };
  }

  const eventType = independent[0]?.eventType ?? 'unknown';
  if (CONFLICT_SENSITIVE_EVENTS.has(eventType)) {
    const claims = independent.map(item => ({ item, claims: materialNumberClaims(item) }));
    for (const [label] of MATERIAL_CLAIM_LABELS) {
      const comparable = claims
        .map(entry => ({ item: entry.item, values: entry.claims.get(label) ?? new Set<string>() }))
        .filter(entry => entry.values.size === 1);
      const distinct = new Set(comparable.map(entry => [...entry.values][0]));
      if (comparable.length >= 2 && distinct.size >= 2) {
        return { conflicting: true, code: 'material_value_disagreement', sourceIds: comparable.map(entry => entry.item.sourceId) };
      }
    }
  }
  return { conflicting: false, code: null, sourceIds: [] };
}

function supportingSource(item: NormalizedNewsItem): NewsSupportingSource {
  return {
    sourceId: item.sourceId,
    sourceName: item.sourceName,
    sourceDomain: item.sourceDomain,
    originalUrl: item.originalUrl,
    publishedAt: item.publishedAt,
    isOfficial: item.isOfficial,
    sourceType: item.sourceType,
    reliabilityScore: item.sourceReliability,
    sourceNetworkId: item.sourceNetworkId,
  };
}

function clusterId(items: NormalizedNewsItem[]) {
  const seed = items.map(item => item.eventFingerprint || item.contentHash || item.canonicalUrl || item.id).sort().join('|');
  return `story-${createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
}

export function clusterRelatedStories(items: NormalizedNewsItem[]): ConsolidatedNewsStory[] {
  return detectDuplicates(items).map(group => {
    const primary = choosePrimarySource(group) ?? group[0];
    const conflict = detectConflicts(group);
    const networks = unique(group.map(sourceNetwork));
    const independentSourceCount = networks.length;
    const credibleNetworks = unique(group
      .filter(item => item.isOfficial || (item.sourceType !== 'social_signal' && item.sourceReliability >= 0.6))
      .map(sourceNetwork));
    const supportingSources = group
      .filter(item => item.id !== primary.id)
      .map(supportingSource);
    const verificationStatus: ConsolidatedNewsStory['verificationStatus'] = conflict.conflicting
      ? 'conflicting'
      : primary.isOfficial
        ? 'official'
        : credibleNetworks.length >= 2
          ? 'confirmed'
          : primary.sourceType === 'social_signal' || primary.sourceReliability < 0.5
            ? 'unverified'
            : 'single_source';
    const earliest = group.slice().sort((a, b) => (publishedTimestamp(a.publishedAt) ?? 0) - (publishedTimestamp(b.publishedAt) ?? 0))[0]?.publishedAt ?? primary.publishedAt;
    const latest = group.slice().sort((a, b) => (publishedTimestamp(b.updatedAt ?? b.publishedAt) ?? 0) - (publishedTimestamp(a.updatedAt ?? a.publishedAt) ?? 0))[0]?.updatedAt
      ?? group.slice().sort((a, b) => (publishedTimestamp(b.publishedAt) ?? 0) - (publishedTimestamp(a.publishedAt) ?? 0))[0]?.publishedAt
      ?? primary.publishedAt;
    const id = clusterId(group);
    const confidenceScore = clamp(
      (primary.sourceReliability * 0.5)
      + (primary.entityConfidenceScore * 0.25)
      + (verificationStatus === 'official' ? 0.25 : verificationStatus === 'confirmed' ? 0.18 : 0.05),
    );
    const story: ConsolidatedNewsStory = {
      ...primary,
      id,
      duplicateGroupId: id,
      symbols: unique(group.flatMap(item => item.symbols)),
      companyNames: unique(group.flatMap(item => item.companyNames)),
      marketCodes: unique(group.flatMap(item => item.marketCodes)),
      exchangeCodes: unique(group.flatMap(item => item.exchangeCodes)),
      countries: unique(group.flatMap(item => item.countries)),
      sectors: unique(group.flatMap(item => item.sectors)),
      industries: unique(group.flatMap(item => item.industries)),
      assetTypes: unique(group.flatMap(item => item.assetTypes)),
      currencies: unique(group.flatMap(item => item.currencies)),
      earliestPublishedAt: earliest,
      latestUpdatedAt: latest,
      verificationStatus,
      corroboratingSourceCount: Math.max(0, credibleNetworks.length - 1),
      independentSourceCount,
      supportingSources,
      conflictSummary: conflict.code,
      confidenceScore,
      importanceScore: Math.min(100, Math.max(...group.map(item => item.importanceScore)) + Math.min(8, Math.max(0, independentSourceCount - 1) * 3)),
      whyItMatters: primary.eventType === 'unknown' ? 'materiality_not_established' : `event:${primary.eventType}`,
    };
    if (conflict.conflicting) {
      story.impactDirection = 'unknown';
      story.expectedImpact = 'unknown';
      story.impactHorizon = 'unknown';
      story.impactReason = 'conflicting_sources';
      logMarketNewsEvent('conflict_detected', { storyId: id, code: conflict.code, sourceCount: independentSourceCount });
    }
    logMarketNewsEvent('story_cluster_created', { storyId: id, articleCount: group.length, independentSourceCount, verificationStatus });
    return story;
  });
}

export function processNewsItems(items: NormalizedNewsItem[], params: Partial<NewsFetchParams> = {}) {
  const rejected: Array<{ item: NormalizedNewsItem; reason: string }> = [];
  const accepted = items.flatMap(item => {
    const normalizedItem = normalizeNewsItem(item, params);
    const decision = isRelevantNewsItem(normalizedItem, params);
    if (!decision.accepted) {
      rejected.push({ item: normalizedItem, reason: decision.reason });
      return [];
    }
    return [normalizedItem];
  });
  logMarketNewsEvent('news_normalized', { received: items.length, accepted: accepted.length, rejected: rejected.length, processingVersion: PROCESSING_VERSION });
  if (rejected.length > 0) {
    const reasons = rejected.reduce<Record<string, number>>((result, entry) => {
      result[entry.reason] = (result[entry.reason] ?? 0) + 1;
      return result;
    }, {});
    logMarketNewsEvent('news_rejected', { count: rejected.length, reasons });
  }
  return { items: accepted, stories: clusterRelatedStories(accepted), rejected };
}
