const COMPARISON_CUE = /(?:\b(?:compare|versus|vs\.?|contre)\b|(?:قارن|مقارنه|مقارنة))/iu;
const QUESTION_LEAD = /^(?:شنو|وش|ما|ماذا|هل|كيف|كم|ليش|متى|وين|من|what|how|why|when|where|who|which|comment|pourquoi|quand|où|ou|qui|quel)(?:\s|$)/iu;
const ASSET_SHAPE = /^[\p{L}\p{N}.^=:_/&'’+\-\s]+$/u;
const TICKER_TOKEN = /\b[A-Z][A-Z0-9]{0,11}(?:[.^=:_/-][A-Z0-9]+)*\b/g;

const INTENT_PREFIXES = [
  /^(?:حلل(?:\s+لي)?|تحليل(?:\s+ل)?|ابي\s+تحليل(?:\s+ل)?|أبي\s+تحليل(?:\s+ل)?|اعطني\s+تحليل(?:\s+ل)?|عطني\s+تحليل(?:\s+ل)?|شنو\s+(?:رايك|رأيك)\s+(?:في|عن)|ما\s+(?:رايك|رأيك)\s+(?:في|عن)|وش\s+(?:رايك|رأيك)\s+(?:في|عن)|ماذا\s+عن|تكلم\s+عن)\s+/iu,
  /^(?:analy[sz]e(?:\s+the)?|analysis\s+of|tell\s+me\s+about|what\s+do\s+you\s+think\s+about|what\s+about|give\s+me\s+an\s+analysis\s+of)\s+/iu,
  /^(?:analyse(?:\s+de)?|parle[-\s]moi\s+de|que\s+penses[-\s]tu\s+de)\s+/iu,
];

const INSTRUMENT_PREFIX = /^(?:سهم|شركة|صندوق|مؤشر|عملة|زوج(?:\s+عملات)?|stock|share|shares|company|ticker|etf|fund|index|crypto|coin|pair|action|societe|société|indice|fonds|paire)\s+/iu;
const TRAILING_INSTRUMENT = /\s+(?:سهم|شركة|صندوق|مؤشر|stock|share|shares|company|ticker|etf|fund|index|action|societe|société|indice|fonds)$/iu;
const TRAILING_NOISE = /\s+(?:اليوم|الحين|الان|الآن|بسرعة|لو\s+سمحت|today|now|please|right\s+now|aujourd'hui|maintenant)$/iu;

function trimPunctuation(value: string) {
  return value
    .trim()
    .replace(/^["'“”«»]+/u, '')
    .replace(/["'“”«»؟?!.,،;:]+$/u, '')
    .trim();
}

function cleanAssetPhrase(value: string) {
  let cleaned = trimPunctuation(value);
  for (const prefix of INTENT_PREFIXES) {
    if (prefix.test(cleaned)) {
      cleaned = cleaned.replace(prefix, '').trim();
      break;
    }
  }
  cleaned = cleaned.replace(INSTRUMENT_PREFIX, '').trim();
  for (let i = 0; i < 3; i += 1) {
    const previous = cleaned;
    cleaned = trimPunctuation(cleaned.replace(TRAILING_NOISE, '').replace(TRAILING_INSTRUMENT, ''));
    if (cleaned === previous) break;
  }
  return cleaned;
}

function plausibleAssetPhrase(value: string) {
  if (!value || value.length > 80 || !ASSET_SHAPE.test(value)) return false;
  return value.split(/\s+/u).filter(Boolean).length <= 5;
}

/**
 * Produce a small ordered set of untrusted asset queries from the latest user
 * message. Every value still has to pass resolveMarketSymbol; this helper
 * never turns natural language into trusted market identity by itself.
 */
export function implicitMarketAssetCandidates(messages: readonly { role: string; content: string }[]) {
  const latest = [...messages].reverse().find(message => message.role === 'user')?.content.trim();
  if (!latest || latest.length > 160 || /[\r\n]/u.test(latest) || COMPARISON_CUE.test(latest)) return [];

  const candidates: string[] = [];
  const add = (value: string | null | undefined) => {
    const candidate = trimPunctuation(value ?? '');
    if (!plausibleAssetPhrase(candidate)) return;
    if (!candidates.some(item => item.toLocaleLowerCase() === candidate.toLocaleLowerCase())) candidates.push(candidate);
  };

  const trimmed = trimPunctuation(latest);
  const hasExplicitAssetIntent = INTENT_PREFIXES.some(prefix => prefix.test(trimmed));
  const cleaned = cleanAssetPhrase(latest);
  if (hasExplicitAssetIntent || !QUESTION_LEAD.test(latest)) add(cleaned);

  for (const token of latest.match(TICKER_TOKEN) ?? []) add(token);

  return candidates.slice(0, 4);
}
