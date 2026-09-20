import type { EiaCrudeStocksSnapshot } from '@/lib/market/eiaCrudeStocks';

export const OIL_EVIDENCE_CATEGORIES = [
  'hormuz',
  'bab_el_mandeb',
  'production',
  'inventories',
  'shipping',
  'demand_rates',
  'geopolitics',
] as const;

export type OilEvidenceCategory = typeof OIL_EVIDENCE_CATEGORIES[number];
export type OilEvidenceUrgency = 'high' | 'medium' | 'low' | 'unknown';
export type OilPressureDirection = 'tightening' | 'easing' | 'mixed' | 'unknown';

export type OilNewsEvidenceInput = {
  id: string;
  title: string;
  summary?: string | null;
  sourceName?: string | null;
  originalUrl?: string | null;
  publishedAt: string;
  isOfficial?: boolean;
  verificationStatus?: string | null;
  importanceScore?: number | null;
  confidenceScore?: number | null;
  eventType?: string | null;
  conflictSummary?: string | null;
};

export type OilCalendarEvidenceInput = {
  id: string;
  title: string;
  source?: string | null;
  sourceUrl?: string | null;
  dateTimeUtc: string;
  impact?: string | null;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
  unit?: string | null;
  stale?: boolean;
};

export type OilEvidenceItem = {
  id: string;
  kind: 'news' | 'calendar' | 'inventory';
  categories: OilEvidenceCategory[];
  title: string;
  detail: string | null;
  source: string;
  url: string | null;
  publishedAt: string;
  urgency: OilEvidenceUrgency;
  direction: OilPressureDirection;
  verificationStatus: string | null;
  confidenceScore: number | null;
  stale: boolean;
};

export type OilEvidenceCategorySummary = {
  id: OilEvidenceCategory;
  attention: OilEvidenceUrgency;
  direction: OilPressureDirection;
  evidenceCount: number;
  latestAt: string | null;
  items: OilEvidenceItem[];
};

export type OilEvidenceSnapshot = {
  categories: OilEvidenceCategorySummary[];
  items: OilEvidenceItem[];
  inventory: EiaCrudeStocksSnapshot | null;
  generatedAt: string;
};

const KEYWORDS: Record<OilEvidenceCategory, RegExp[]> = {
  hormuz: [/\bhormuz\b/i, /مضيق\s*هرمز/u, /هرمز/u],
  bab_el_mandeb: [/\bbab[\s-]+(?:el|al)[\s-]+mand(?:e|a)b\b/i, /\bmandeb\b/i, /\bred sea\b/i, /باب\s*المندب/u, /البحر\s*الأحمر/u],
  production: [/\bopec\+?\b/i, /\bproduction\b/i, /\boutput\b/i, /\bsupply cut\b/i, /\bspare capacity\b/i, /أوبك/u, /الإنتاج/u, /خفض\s*الإنتاج/u, /الطاقة\s*الفائضة/u],
  inventories: [/\binventor(?:y|ies)\b/i, /\bstockpiles?\b/i, /\bcrude stocks?\b/i, /\beia\b/i, /مخزون/u, /المخزونات/u],
  shipping: [/\btankers?\b/i, /\bshipping\b/i, /\bfreight\b/i, /\binsurance\b/i, /\bvessels?\b/i, /\bmaritime\b/i, /\bports?\b/i, /ناقلات/u, /الشحن/u, /التأمين/u, /الموانئ/u],
  demand_rates: [/\boil demand\b/i, /\bconsumption\b/i, /\binterest rates?\b/i, /\brate (?:cut|hike|decision)\b/i, /\bfederal reserve\b/i, /\bchina(?:'s)? demand\b/i, /الطلب/u, /الاستهلاك/u, /الفائدة/u, /الفيدرالي/u],
  geopolitics: [/\bsanctions?\b/i, /\bwar\b/i, /\bconflict\b/i, /\battack(?:ed|s)?\b/i, /\bmissile\b/i, /\bceasefire\b/i, /\bmilitary\b/i, /عقوبات/u, /حرب/u, /نزاع/u, /هجوم/u, /صاروخ/u, /وقف\s*إطلاق\s*النار/u],
};

const HIGH_URGENCY = [
  /\bclosed?\b/i, /\bclosure\b/i, /\bblocked?\b/i, /\bblockade\b/i, /\bhalt(?:ed|s)?\b/i,
  /\boutage\b/i, /\boffline\b/i, /\battack(?:ed|s)?\b/i, /\bstrike\b/i, /\bseized?\b/i,
  /\bsuspended?\b/i, /\bmajor disruption\b/i, /إغلاق/u, /تعطل/u, /هجوم/u, /استهداف/u,
];

const MEDIUM_URGENCY = [
  /\brisk\b/i, /\bthreat\b/i, /\bwarning\b/i, /\btension\b/i, /\bsanctions?\b/i,
  /\bcut(?:s|ting)? production\b/i, /\bsupply cut\b/i, /\bshortage\b/i, /\brerout(?:e|ed|ing)\b/i,
  /مخاطر/u, /تهديد/u, /توتر/u, /عقوبات/u, /خفض\s*الإنتاج/u,
];

const TIGHTENING = [
  /\bclosed?\b/i, /\bclosure\b/i, /\bblocked?\b/i, /\bhalt(?:ed|s)?\b/i, /\boutage\b/i,
  /\boffline\b/i, /\battack(?:ed|s)?\b/i, /\bsanctions?\b/i, /\bproduction cut\b/i,
  /\bsupply cut\b/i, /\bshortage\b/i, /\binventory draw\b/i, /\bstock draw\b/i,
  /إغلاق/u, /تعطل/u, /عقوبات/u, /خفض\s*الإنتاج/u, /سحب\s*من\s*المخزون/u,
];

const EASING = [
  /\breopen(?:ed|ing|s)?\b/i, /\bresum(?:e|ed|ing|es)\b/i, /\brestor(?:e|ed|ing|es)\b/i,
  /\bproduction increase\b/i, /\boutput increase\b/i, /\bsupply increase\b/i,
  /\binventory build\b/i, /\bstock build\b/i, /\bceasefire\b/i,
  /إعادة\s*فتح/u, /استئناف/u, /زيادة\s*الإنتاج/u, /ارتفاع\s*المخزون/u, /وقف\s*إطلاق\s*النار/u,
];

function textFor(value: { title: string; summary?: string | null }) {
  return (value.title + ' ' + (value.summary ?? '')).replace(/\s+/g, ' ').trim();
}

export function categoriesForOilEvidence(text: string) {
  return OIL_EVIDENCE_CATEGORIES.filter(category => KEYWORDS[category].some(pattern => pattern.test(text)));
}

function directionForText(text: string): OilPressureDirection {
  const tightening = TIGHTENING.some(pattern => pattern.test(text));
  const easing = EASING.some(pattern => pattern.test(text));
  if (tightening && easing) return 'mixed';
  if (tightening) return 'tightening';
  if (easing) return 'easing';
  return 'unknown';
}

function urgencyForText(text: string, importanceScore: number | null | undefined, impact?: string | null): OilEvidenceUrgency {
  if (HIGH_URGENCY.some(pattern => pattern.test(text)) || impact === 'high' || (importanceScore ?? 0) >= 75) return 'high';
  if (MEDIUM_URGENCY.some(pattern => pattern.test(text)) || impact === 'medium' || (importanceScore ?? 0) >= 50) return 'medium';
  if (text.trim()) return 'low';
  return 'unknown';
}

function finiteScore(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

function newsEvidence(story: OilNewsEvidenceInput): OilEvidenceItem | null {
  const text = textFor(story);
  const categories = categoriesForOilEvidence(text);
  if (categories.length === 0) return null;
  return {
    id: 'news:' + story.id,
    kind: 'news',
    categories,
    title: story.title,
    detail: story.summary?.trim() || story.conflictSummary?.trim() || null,
    source: story.sourceName?.trim() || 'Market news',
    url: story.originalUrl?.trim() || null,
    publishedAt: story.publishedAt,
    urgency: urgencyForText(text, story.importanceScore),
    direction: directionForText(text),
    verificationStatus: story.verificationStatus ?? (story.isOfficial ? 'official' : null),
    confidenceScore: finiteScore(story.confidenceScore),
    stale: false,
  };
}

function calendarEvidence(event: OilCalendarEvidenceInput): OilEvidenceItem | null {
  const text = event.title;
  const categories = categoriesForOilEvidence(text);
  if (categories.length === 0) return null;
  const values = [
    event.actual !== null && event.actual !== undefined ? 'actual ' + event.actual + (event.unit ?? '') : '',
    event.forecast !== null && event.forecast !== undefined ? 'forecast ' + event.forecast + (event.unit ?? '') : '',
    event.previous !== null && event.previous !== undefined ? 'previous ' + event.previous + (event.unit ?? '') : '',
  ].filter(Boolean);
  return {
    id: 'calendar:' + event.id,
    kind: 'calendar',
    categories,
    title: event.title,
    detail: values.length ? values.join(' · ') : null,
    source: event.source?.trim() || 'Economic calendar',
    url: event.sourceUrl?.trim() || null,
    publishedAt: event.dateTimeUtc,
    urgency: urgencyForText(text, null, event.impact),
    direction: directionForText(text),
    verificationStatus: 'calendar',
    confidenceScore: null,
    stale: Boolean(event.stale),
  };
}

function inventoryEvidence(inventory: EiaCrudeStocksSnapshot): OilEvidenceItem {
  const draw = inventory.weeklyChange < 0;
  const magnitude = Math.abs(inventory.weeklyChange);
  return {
    id: 'inventory:eia:' + inventory.asOf,
    kind: 'inventory',
    categories: ['inventories'],
    title: 'U.S. commercial crude stocks ' + inventory.latest.toFixed(1) + ' million barrels',
    detail: (draw ? 'weekly draw ' : 'weekly build ') + Math.abs(inventory.weeklyChange).toFixed(1) + ' million barrels (' + (inventory.weeklyChangePct > 0 ? '+' : '') + inventory.weeklyChangePct.toFixed(2) + '%)',
    source: inventory.source,
    url: inventory.sourceUrl,
    publishedAt: inventory.asOf + 'T00:00:00.000Z',
    urgency: magnitude >= 8 ? 'high' : magnitude >= 3 ? 'medium' : 'low',
    direction: draw ? 'tightening' : inventory.weeklyChange > 0 ? 'easing' : 'unknown',
    verificationStatus: 'official',
    confidenceScore: 1,
    stale: false,
  };
}

function urgencyRank(value: OilEvidenceUrgency) {
  return value === 'high' ? 3 : value === 'medium' ? 2 : value === 'low' ? 1 : 0;
}

function summarizeDirection(items: OilEvidenceItem[]): OilPressureDirection {
  const directions = new Set(items.map(item => item.direction).filter(direction => direction !== 'unknown'));
  if (directions.size === 0) return 'unknown';
  if (directions.size > 1 || directions.has('mixed')) return 'mixed';
  return [...directions][0] as OilPressureDirection;
}

export function buildOilEvidenceSnapshot(input: {
  news?: OilNewsEvidenceInput[];
  calendar?: OilCalendarEvidenceInput[];
  inventory?: EiaCrudeStocksSnapshot | null;
  now?: Date;
}): OilEvidenceSnapshot {
  const newsItems = (input.news ?? []).flatMap(story => {
    const item = newsEvidence(story);
    return item ? [item] : [];
  });
  const calendarItems = (input.calendar ?? []).flatMap(event => {
    const item = calendarEvidence(event);
    return item ? [item] : [];
  });
  const inventoryItems = input.inventory ? [inventoryEvidence(input.inventory)] : [];

  const items = [...inventoryItems, ...newsItems, ...calendarItems]
    .filter(item => Number.isFinite(Date.parse(item.publishedAt)))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

  const categories = OIL_EVIDENCE_CATEGORIES.map(id => {
    const matching = items.filter(item => item.categories.includes(id));
    const categoryItems = matching.slice(0, 6);
    const attention = categoryItems.reduce<OilEvidenceUrgency>(
      (highest, item) => urgencyRank(item.urgency) > urgencyRank(highest) ? item.urgency : highest,
      'unknown',
    );
    return {
      id,
      attention,
      direction: summarizeDirection(categoryItems),
      evidenceCount: matching.length,
      latestAt: categoryItems[0]?.publishedAt ?? null,
      items: categoryItems,
    };
  });

  return {
    categories,
    items: items.slice(0, 36),
    inventory: input.inventory ?? null,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}
