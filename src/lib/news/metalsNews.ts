// Shared by the API and client so cached articles obey the same topic rules.
type ArticleText = {
  title?: string | null;
  headline?: string | null;
  summary?: string | null;
  titleOriginal?: string | null;
  summaryOriginal?: string | null;
};

export function normalizeNewsSearch(value: string) {
  return value.normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();
}

const METALS = [
  { aliases: ['gold', 'الذهب', 'ذهب', 'or', 'xau', 'xauusd', 'xau/usd', 'gc=f'], pattern: /\b(gold|xau(?:usd)?|gc=f)\b|\bl['’]or\b|\bor physique\b|ذهب/u },
  { aliases: ['silver', 'الفضة', 'فضة', 'فضه', 'الفضه', 'argent', 'xag', 'xagusd', 'xag/usd', 'si=f'], pattern: /\b(silver|argent|xag(?:usd)?|si=f)\b|فضه/u },
  { aliases: ['copper', 'النحاس', 'نحاس', 'cuivre', 'hg=f'], pattern: /\b(copper|cuivre|hg=f)\b|نحاس/u },
  { aliases: ['platinum', 'البلاتين', 'بلاتين', 'platine', 'xpt', 'xptusd', 'pl=f'], pattern: /\b(platinum|platine|xpt(?:usd)?|pl=f)\b|بلاتين/u },
  { aliases: ['palladium', 'البلاديوم', 'بلاديوم', 'xpd', 'xpdusd', 'pa=f'], pattern: /\b(palladium|xpd(?:usd)?|pa=f)\b|بلاديوم/u },
];
const METAL_CONTEXT = /\b(precious metals?|industrial metals?|bullion|comex|lme)\b|معادن ثمينه|معادن صناعيه|سبائك/u;
const MARKET_CONTEXT = /\b(prices?|spot|futures|bullion|ounces?|troy|mining|mines?|miners?|refiner\w*|smelt\w*|commodit\w*|comex|lbma|lme|etfs?|stocks?|shares?|invest\w*|asset class|inflation|yields?|interest rates?|supply|demand|production|reserves?|exports?|imports?|tariffs?|rall\w*|surges?|slumps?|gains?|rises?|falls?|drops?|jumps?|tumbles?|record highs?|record lows?|selloff|prix|cours|minier\w*|mines?|onces?|lingots?|metaux|bourse|marche|investissement|production)\b|سعر|اسعار|تداول|بورصه|عقود|اجله|استثمار|تضخم|فائده|عوائد|طلب|انتاج|احتياطي|تعدين|مناجم|سبائك|اونصه|اوقيه|ارتفاع|انخفاض|تراجع|صعود|هبوط|صادرات|واردات/u;
const UNRELATED_CONTEXT = /\b(gold cup|blue and gold|jockey|horse racing|scrimmage|nhl|nfl|nba|olympic\w*|medals?|grammy|silver lining|silver screen|golden globes?)\b|ميدالي|كاس ذهبي|سباق الخيل/u;

function articleText(item: ArticleText) {
  // Derived symbols/company names can be wrong (e.g. Gold Cup -> GOLD).
  // Require evidence in the article itself, including its original language.
  return normalizeNewsSearch([item.title, item.headline, item.summary, item.titleOriginal, item.summaryOriginal].filter(Boolean).join(' '));
}

export function isMetalsMarketNews(item: ArticleText) {
  const text = articleText(item);
  return !UNRELATED_CONTEXT.test(text) && MARKET_CONTEXT.test(text)
    && (METAL_CONTEXT.test(text) || METALS.some(metal => metal.pattern.test(text)));
}

export function matchesMetalSearch(item: ArticleText, query: string): boolean | null {
  const normalized = normalizeNewsSearch(query);
  const metal = METALS.find(candidate => candidate.aliases.some(alias => normalizeNewsSearch(alias) === normalized));
  return metal ? metal.pattern.test(articleText(item)) : null;
}
