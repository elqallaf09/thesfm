import { BOUBYAN_REFERENCE, type BoubyanListId } from './boubyanReferenceMetadata';

export type BoubyanExchange =
  | 'NASDAQ' | 'NYSE' | 'AMEX' | 'NYSE_ARCA' | 'OTC'
  | 'BOURSA_KUWAIT' | 'TADAWUL' | 'DFM' | 'NASDAQ_DUBAI' | 'ADX'
  | 'QSE' | 'BAHRAIN_BOURSE' | 'MUSCAT';

export type BoubyanLocalizedText = { ar: string; en: string; fr: string };

/** A publication row is a security reference, not an asset-type assertion. */
export type BoubyanReferenceRow = {
  listId: BoubyanListId;
  symbol: string;
  name: string;
  exchange: string | null;
  country: string;
  page: number;
  row: number;
  assetType: 'security';
  publishedStatus?: 'compliant' | 'excluded';
  /** Explicit, reviewed issuer aliases only; never search keywords. */
  nameAliases?: readonly string[];
  /** A source problem prevents automatic use even when the ticker matches. */
  identityIssue?: string | null;
  qualityFlags?: readonly string[];
};

export type BoubyanReferenceMetadata = {
  name: string;
  brokerageUrl: string;
  reportingPeriod: string;
  checkedAt: string;
  nextReviewAt: string;
  lists: readonly { id: BoubyanListId; url: string; issuedAt: string }[];
};

export type BoubyanReferenceInput = {
  symbol?: string | null;
  providerSymbol?: string | null;
  name?: string | null;
  assetType?: string | null;
  exchange?: string | null;
  country?: string | null;
};

export type BoubyanReferenceProvenance = {
  id: string;
  canonicalId: string;
  identityKey: string;
  source: 'BOUBYAN';
  sourceName: string;
  sourceUrl: string;
  brokerageUrl: string;
  listId: BoubyanListId;
  reportingPeriod: string;
  issuedAt: string;
  checkedAt: string;
  nextReviewAt: string;
  page: number;
  row: number;
  symbol: string;
  name: string;
  exchange: BoubyanExchange;
  country: string;
  publishedStatus: 'compliant' | 'excluded';
};

export type BoubyanReferenceState =
  | 'listed' | 'not_listed' | 'identity_mismatch' | 'ambiguous'
  | 'out_of_scope' | 'review_due';

export type BoubyanReferenceReasonCode =
  | 'published_membership' | 'not_in_publication' | 'unsupported_asset_type'
  | 'unsupported_exchange' | 'missing_identity' | 'venue_conflict'
  | 'symbol_conflict' | 'country_conflict' | 'company_mismatch' | 'instrument_type_mismatch'
  | 'ambiguous_identity' | 'invalid_source_row' | 'excluded_from_publication'
  | 'source_not_yet_effective' | 'invalid_reference_dates' | 'review_overdue';

export type BoubyanReferenceResult = {
  source: 'BOUBYAN';
  state: BoubyanReferenceState;
  shariahStatus: 'compliant' | 'needs_review' | 'unclassified';
  reasonCode: BoubyanReferenceReasonCode;
  reason: BoubyanLocalizedText;
  statusLabel: BoubyanLocalizedText;
  reference: BoubyanReferenceProvenance | null;
  candidates: BoubyanReferenceProvenance[];
};

const EXCHANGE_ALIASES: Record<BoubyanExchange, readonly string[]> = {
  NASDAQ: ['NSDQ', 'XNAS', 'NASDAQGS', 'NASDAQGM', 'NASDAQCM', 'NASDAQ STOCK MARKET', 'NASDAQ GLOBAL SELECT MARKET', 'NASDAQ GLOBAL MARKET', 'NASDAQ CAPITAL MARKET'],
  NYSE: ['XNYS', 'NEW YORK STOCK EXCHANGE'],
  AMEX: ['XASE', 'NYSE AMERICAN', 'NYSE MKT'],
  NYSE_ARCA: ['NYSE ARCA', 'NYSEARCA', 'ARCX', 'ARCA'],
  OTC: ['OTCMKTS', 'OTC MARKETS', 'OTCQX', 'OTCQB', 'PINX', 'PINK'],
  BOURSA_KUWAIT: ['KSE', 'XKUW', 'KW', 'KUWAIT', 'BOURSA KUWAIT', 'KUWAIT STOCK EXCHANGE', 'بورصة الكويت'],
  TADAWUL: ['XSAU', 'SAUDI', 'SAUDI EXCHANGE', 'SAUDI STOCK EXCHANGE', 'SA', 'SR', 'تداول', 'السوق السعودية'],
  DFM: ['XDFM', 'DUBAI', 'DUBAI FINANCIAL MARKET', 'DU', 'سوق دبي المالي'],
  NASDAQ_DUBAI: ['NASDAQ DUBAI', 'DIFX', 'NDX', 'ناسداك دبي'],
  ADX: ['XADS', 'ABU DHABI', 'ABU DHABI SECURITIES EXCHANGE', 'AD', 'سوق أبوظبي'],
  QSE: ['QATAR', 'QATAR STOCK EXCHANGE', 'QE', 'QA', 'DSMD', 'بورصة قطر'],
  BAHRAIN_BOURSE: ['BAHRAIN', 'BAHRAIN BOURSE', 'BHB', 'BH', 'XBAH', 'بورصة البحرين'],
  MUSCAT: ['MUSCAT STOCK EXCHANGE', 'MSX', 'MSM', 'OMAN', 'OM', 'XMUS', 'بورصة مسقط'],
};

const EXCHANGE_COUNTRIES: Record<BoubyanExchange, string> = {
  NASDAQ: 'US', NYSE: 'US', AMEX: 'US', NYSE_ARCA: 'US', OTC: 'US',
  BOURSA_KUWAIT: 'KW', TADAWUL: 'SA', DFM: 'AE', NASDAQ_DUBAI: 'AE',
  ADX: 'AE', QSE: 'QA', BAHRAIN_BOURSE: 'BH', MUSCAT: 'OM',
};

const REGIONAL_SUFFIXES: Record<string, BoubyanExchange> = {
  KW: 'BOURSA_KUWAIT', SR: 'TADAWUL', DU: 'DFM', AD: 'ADX',
  QA: 'QSE', BH: 'BAHRAIN_BOURSE', OM: 'MUSCAT',
};

function text(value: unknown) { return String(value ?? '').trim(); }
function exchangeToken(value: unknown) { return text(value).toUpperCase().replace(/[\s.-]+/g, '_'); }

const EXCHANGE_LOOKUP = new Map(Object.entries(EXCHANGE_ALIASES).flatMap(([venue, aliases]) =>
  [venue, ...aliases].map(alias => [exchangeToken(alias), venue as BoubyanExchange] as const),
));

/** Intentionally does not collapse NASDAQ, NYSE, NYSE American and NYSE Arca to US. */
export function normalizeBoubyanExchange(value: unknown): BoubyanExchange | null {
  return EXCHANGE_LOOKUP.get(exchangeToken(value)) ?? null;
}

function normalizeCountry(value: unknown) {
  const token = exchangeToken(value);
  const aliases: Record<string, string> = {
    USA: 'US', UNITED_STATES: 'US', UNITED_STATES_OF_AMERICA: 'US',
    KUWAIT: 'KW', SAUDI_ARABIA: 'SA', KSA: 'SA',
    UAE: 'AE', UNITED_ARAB_EMIRATES: 'AE', QATAR: 'QA', BAHRAIN: 'BH', OMAN: 'OM',
  };
  return aliases[token] ?? token;
}

const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited',
  'plc', 'llc', 'llp', 'lp', 'sa', 'saa', 'nv', 'ag', 'se', 'psc', 'pjsc',
  'qpsc', 'qsc', 'bsc', 'kscp', 'kpsc', 'kscc', 'ksc', 'sakp', 'saog', 'saoc',
  'sjsc', 'cjsc', 'scjsc',
]);

/** No fuzzy matching: meaningful issuer, fund and share-class terms survive. */
export function normalizeBoubyanCompanyName(value: unknown): string {
  const normalized = text(value).normalize('NFKC').toLowerCase()
    .replace(/\b(?:[a-z]\.){2,}/g, letters => letters.replace(/\./g, ''))
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+(?:common stock|ordinary shares|common shares)$/, '');
  const words = normalized.split(/\s+/).filter(Boolean);
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

function supportedAssetType(value: unknown): 'stock' | 'etf' | null {
  const kind = text(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (['etf', 'exchange_traded_fund'].includes(kind)) return 'etf';
  return ['stock', 'stocks', 'equity', 'equities', 'common_stock', 'common_share', 'common_shares', 'ordinary_share', 'ordinary_shares'].includes(kind) ? 'stock' : null;
}

function instrumentTypeMatches(row: BoubyanReferenceRow, inputType: 'stock' | 'etf') {
  const explicitEtf = /\betfs?\b|\bexchange[ -]traded funds?\b/i.test(row.name);
  const fundLike = /\b(?:etfs?|funds?|trust|ucits|sicav)\b/i.test(row.name)
    || row.qualityFlags?.includes('fund_or_trust_name_requires_instrument_type_match');
  const specialInstrument = /\b(?:warrants?|preferred|preference|rights)\b/i.test(row.name)
    || /\s(?:WS|WTS|PR(?:\s[A-Z])?|RT|UT)$/i.test(row.symbol);
  if (specialInstrument) return false;
  // "Trust" can name a REIT, closed-end fund or other company; it is not ETF proof.
  return inputType === 'etf' ? explicitEtf : !fundLike;
}

function symbolLocator(value: unknown) {
  let symbol = text(value).toUpperCase().replace(/\s+/g, ' ');
  let venue: BoubyanExchange | null = null;
  let conflict = false;
  const prefix = symbol.match(/^([^:]+):(.+)$/);
  if (prefix) {
    venue = normalizeBoubyanExchange(prefix[1]);
    conflict = !venue;
    symbol = prefix[2].trim();
  }
  const suffix = symbol.match(/\.([A-Z]+)$/);
  const suffixVenue = suffix ? REGIONAL_SUFFIXES[suffix[1]] : undefined;
  if (suffixVenue) {
    if (venue && venue !== suffixVenue) conflict = true;
    venue ??= suffixVenue;
    symbol = symbol.slice(0, -(suffix![0].length));
  }
  // US .N/.PK/.P suffixes and preferred/warrant/share-class markers are preserved.
  return { symbol, venue, conflict };
}

function identity(input: BoubyanReferenceInput) {
  const symbol = symbolLocator(input.symbol || input.providerSymbol);
  const provider = text(input.providerSymbol) ? symbolLocator(input.providerSymbol) : null;
  const explicitVenue = normalizeBoubyanExchange(input.exchange);
  const venues = [explicitVenue, symbol.venue, provider?.venue].filter((value): value is BoubyanExchange => Boolean(value));
  const exchange = venues[0] ?? null;
  const country = normalizeCountry(input.country);
  let problem: BoubyanReferenceReasonCode | null = null;
  if (symbol.conflict || provider?.conflict || venues.some(value => value !== exchange)) problem = 'venue_conflict';
  else if (text(input.exchange) && !explicitVenue) problem = 'unsupported_exchange';
  else if (provider && symbol.symbol !== provider.symbol) problem = 'symbol_conflict';
  else if (exchange && country && country !== EXCHANGE_COUNTRIES[exchange]) problem = 'country_conflict';
  else if (!symbol.symbol || !exchange) problem = 'missing_identity';
  return { symbol: symbol.symbol, exchange, country: country || (exchange ? EXCHANGE_COUNTRIES[exchange] : ''), problem };
}

/** Stable keys are available only when the supplied security identity is consistent. */
export function boubyanSecurityKey(input: BoubyanReferenceInput): string | null {
  const value = identity(input);
  return !value.problem && value.exchange ? `${value.exchange}:${value.symbol}` : null;
}

type RowIndex = { byKey: Map<string, BoubyanReferenceRow[]>; bySymbol: Map<string, BoubyanReferenceRow[]> };

function indexRows(rows: readonly BoubyanReferenceRow[]): RowIndex {
  const byKey = new Map<string, BoubyanReferenceRow[]>();
  const bySymbol = new Map<string, BoubyanReferenceRow[]>();
  for (const row of rows) {
    const symbol = symbolLocator(row.symbol).symbol;
    const key = boubyanSecurityKey(row);
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), row]);
    bySymbol.set(symbol, [...(bySymbol.get(symbol) ?? []), row]);
  }
  return { byKey, bySymbol };
}

const REASONS: Record<BoubyanReferenceReasonCode, BoubyanLocalizedText> = {
  published_membership: { ar: 'تطابقت هوية الورقة المالية مع قائمة بوبيان كابيتال المنشورة.', en: 'The security identity matches Boubyan Capital’s published list.', fr: 'L’identité du titre correspond à la liste publiée par Boubyan Capital.' },
  not_in_publication: { ar: 'غير مدرج في قائمة بوبيان المتاحة؛ الغياب عن القائمة لا يعني عدم التوافق الشرعي.', en: 'Not listed in the available Boubyan publication; absence is not a non-compliance decision.', fr: 'Absent de la publication Boubyan disponible ; cette absence ne constitue pas une décision de non-conformité.' },
  unsupported_asset_type: { ar: 'هذا المرجع يطبق على هوية سهم أو صندوق متداول محددة فقط؛ نوع الأصل الحالي خارج النطاق أو غير محدد.', en: 'This reference applies only to an identified stock or ETF; this asset type is unsupported or unspecified.', fr: 'Cette référence concerne uniquement une action ou un ETF identifié ; ce type d’actif est non couvert ou non précisé.' },
  unsupported_exchange: { ar: 'البورصة المحددة غير مدعومة أو لا تحدد مكان التداول بدقة؛ لا تكفي تسمية السوق الأمريكي العامة للمطابقة.', en: 'The exchange is unsupported or insufficiently specific; a general US market label does not establish the trading venue.', fr: 'La place boursière est non couverte ou imprécise ; la mention générale du marché américain ne suffit pas.' },
  missing_identity: { ar: 'يلزم رمز التداول والبورصة والاسم المطابق لتحديد هوية الورقة المالية.', en: 'An exact ticker, exchange and matching issuer name are required to identify the security.', fr: 'Un symbole exact, une place boursière et un nom d’émetteur concordant sont nécessaires.' },
  venue_conflict: { ar: 'تتعارض البورصة مع بادئة الرمز أو لاحقته؛ يلزم التحقق من هوية الورقة المالية.', en: 'The exchange conflicts with the symbol prefix or suffix; the security identity needs verification.', fr: 'La place boursière contredit le préfixe ou le suffixe du symbole ; l’identité du titre doit être vérifiée.' },
  symbol_conflict: { ar: 'رمز التداول ورمز المزود لا يحددان الورقة المالية نفسها.', en: 'The ticker and provider symbol do not identify the same security.', fr: 'Le symbole et celui du fournisseur ne désignent pas le même titre.' },
  country_conflict: { ar: 'بلد السوق المحدد لا يتطابق مع البورصة؛ يلزم التحقق من الهوية.', en: 'The supplied market country does not match the exchange; identity verification is required.', fr: 'Le pays de marché fourni ne correspond pas à la place boursière ; une vérification est nécessaire.' },
  company_mismatch: { ar: 'الرمز موجود لكن اسم الشركة أو البورصة لا يتطابقان بدقة مع المرجع؛ لا يجوز نقل التصنيف بالرمز وحده.', en: 'The ticker exists, but the issuer name or exchange does not match the reference exactly; a ticker alone cannot transfer a designation.', fr: 'Le symbole existe, mais le nom de l’émetteur ou la place boursière diffère ; le symbole seul ne permet pas de transférer une désignation.' },
  instrument_type_mismatch: { ar: 'نوع الأداة لا يتطابق مع وصف السطر؛ لا تعامل الصناديق أو أدوات الحقوق والأسهم الممتازة كأسهم عادية تلقائياً.', en: 'The instrument type does not match the source row; funds, rights and preferred securities are not automatically ordinary stocks.', fr: 'Le type d’instrument ne correspond pas à la ligne source ; les fonds, droits et titres préférentiels ne sont pas automatiquement des actions ordinaires.' },
  ambiguous_identity: { ar: 'توجد هوية غير محسومة أو عدة سجلات محتملة؛ يحتاج التصنيف إلى مراجعة.', en: 'The identity is unresolved or multiple publication rows are possible; review is required.', fr: 'L’identité reste incertaine ou plusieurs lignes sont possibles ; un examen est nécessaire.' },
  invalid_source_row: { ar: 'بيانات الهوية أو توثيق السطر في المرجع غير مكتملة أو متعارضة؛ يحتاج السجل إلى مراجعة.', en: 'The reference row has incomplete or inconsistent identity or provenance; review is required.', fr: 'L’identité ou la provenance de la ligne est incomplète ou incohérente ; un examen est nécessaire.' },
  excluded_from_publication: { ar: 'يحمل السطر إشارة خروج صريحة من القائمة؛ لا تعد هذه الإشارة وحدها حكماً بعدم التوافق الشرعي.', en: 'The row explicitly indicates exit from the list; this alone is not a non-compliance decision.', fr: 'La ligne indique explicitement une sortie de la liste ; cela seul ne constitue pas une décision de non-conformité.' },
  source_not_yet_effective: { ar: 'لم يكن هذا الإصدار قد نُشر واعتمد في المنصة عند التاريخ المطلوب.', en: 'This edition had not yet been published and adopted by the platform at the requested date.', fr: 'Cette édition n’avait pas encore été publiée et adoptée par la plateforme à la date demandée.' },
  invalid_reference_dates: { ar: 'تواريخ إصدار المرجع أو مراجعته غير صالحة أو متعارضة؛ لا يمكن اعتماد التصنيف.', en: 'The publication or review dates are invalid or inconsistent; the designation cannot be applied.', fr: 'Les dates de publication ou de révision sont invalides ou incohérentes ; la désignation ne peut pas être appliquée.' },
  review_overdue: { ar: 'حل موعد المراجعة الربع سنوية؛ يظل السجل توثيقاً للإصدار السابق ويحتاج إلى تحديث.', en: 'The quarterly review is due; this remains a record of the earlier edition and needs updating.', fr: 'La révision trimestrielle est échue ; cette ligne conserve la trace de l’ancienne édition et doit être actualisée.' },
};

function outcome(state: BoubyanReferenceState, reasonCode: BoubyanReferenceReasonCode, reference: BoubyanReferenceProvenance | null = null, candidates: BoubyanReferenceProvenance[] = []): BoubyanReferenceResult {
  const shariahStatus = state === 'listed' ? 'compliant' : state === 'not_listed' || state === 'out_of_scope' ? 'unclassified' : 'needs_review';
  const reason = { ...REASONS[reasonCode] };
  const statusLabel = shariahStatus === 'compliant' && reference ? {
    ar: `مدرج في قائمة بوبيان · ${reference.reportingPeriod}`,
    en: `Listed by Boubyan · ${reference.reportingPeriod}`,
    fr: `Publié par Boubyan · ${reference.reportingPeriod}`,
  } : state === 'not_listed' ? {
    ar: 'غير مدرج في قائمة بوبيان', en: 'Not listed by Boubyan', fr: 'Absent de la liste Boubyan',
  } : shariahStatus === 'unclassified' ? {
    ar: 'غير مصنف', en: 'Unclassified', fr: 'Non classé',
  } : { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À réviser' };
  if (reference) {
    reason.ar += ` الإصدار: ${reference.reportingPeriod}؛ تاريخ النشر: ${reference.issuedAt}، الصفحة ${reference.page}، السطر ${reference.row}.`;
    reason.en += ` Edition: ${reference.reportingPeriod}; published ${reference.issuedAt}, page ${reference.page}, row ${reference.row}.`;
    reason.fr += ` Édition : ${reference.reportingPeriod} ; publication le ${reference.issuedAt}, page ${reference.page}, ligne ${reference.row}.`;
  }
  return { source: 'BOUBYAN', state, shariahStatus, reasonCode, reason, statusLabel, reference, candidates };
}

function provenance(row: BoubyanReferenceRow, metadata: BoubyanReferenceMetadata): BoubyanReferenceProvenance | null {
  const list = metadata.lists.find(value => value.id === row.listId);
  const security = identity(row);
  if (!list || security.problem || !security.exchange || !text(row.name) || !Number.isInteger(row.page) || row.page < 1 || !Number.isInteger(row.row) || row.row < 1) return null;
  if (row.assetType !== 'security' || (row.publishedStatus !== undefined && !['compliant', 'excluded'].includes(row.publishedStatus))) return null;
  if (!text(metadata.reportingPeriod) || !/^https:\/\/boubyancapital\.com\//.test(list.url)) return null;
  const expectedList = security.country === 'US' ? 'usa' : security.country === 'KW' ? 'kuwait' : 'gcc';
  if (list.id !== expectedList) return null;
  const canonicalId = `${security.exchange}:${security.symbol}`;
  return {
    id: `BOUBYAN:${metadata.reportingPeriod}:${list.id}:${row.page}:${row.row}`,
    canonicalId, identityKey: canonicalId, source: 'BOUBYAN', sourceName: metadata.name,
    sourceUrl: list.url, brokerageUrl: metadata.brokerageUrl, listId: list.id,
    reportingPeriod: metadata.reportingPeriod, issuedAt: list.issuedAt,
    checkedAt: metadata.checkedAt, nextReviewAt: metadata.nextReviewAt,
    page: row.page, row: row.row, symbol: security.symbol, name: row.name,
    exchange: security.exchange, country: security.country,
    publishedStatus: row.publishedStatus ?? 'compliant',
  };
}

function resolveIndexed(input: BoubyanReferenceInput, index: RowIndex, metadata: BoubyanReferenceMetadata, now: Date): BoubyanReferenceResult {
  const assetType = supportedAssetType(input.assetType);
  if (!assetType) return outcome('out_of_scope', 'unsupported_asset_type');
  const checkedAt = Date.parse(metadata.checkedAt);
  const nextReviewAt = Date.parse(metadata.nextReviewAt);
  const nowMs = now.getTime();
  if (![checkedAt, nextReviewAt, nowMs].every(Number.isFinite) || nextReviewAt <= checkedAt) return outcome('review_due', 'invalid_reference_dates');
  if (nowMs < checkedAt) return outcome('review_due', 'source_not_yet_effective');

  const value = identity(input);
  if (value.problem) return outcome(value.problem === 'unsupported_exchange' || value.problem === 'missing_identity' ? 'ambiguous' : 'identity_mismatch', value.problem);
  if (!normalizeBoubyanCompanyName(input.name)) return outcome('ambiguous', 'missing_identity');
  const key = `${value.exchange}:${value.symbol}`;
  const rows = index.byKey.get(key) ?? [];
  if (!rows.length) {
    const elsewhere = index.bySymbol.get(value.symbol) ?? [];
    if (elsewhere.length) return outcome('ambiguous', 'ambiguous_identity');
    if (nowMs >= nextReviewAt) return outcome('review_due', 'review_overdue');
    return outcome('not_listed', 'not_in_publication');
  }

  const candidates = rows.map(row => provenance(row, metadata)).filter((row): row is BoubyanReferenceProvenance => row !== null);
  const expectedName = normalizeBoubyanCompanyName(input.name);
  const matching = rows.filter(row => [row.name, ...(row.nameAliases ?? [])].some(name => normalizeBoubyanCompanyName(name) === expectedName));
  if (!matching.length) return outcome('identity_mismatch', 'company_mismatch', null, candidates);
  if (matching.length !== 1 || rows.length !== 1) return outcome('ambiguous', 'ambiguous_identity', null, candidates);
  const row = matching[0];
  const reference = provenance(row, metadata);
  if (!reference || row.identityIssue) return outcome('ambiguous', 'invalid_source_row', reference, candidates);
  const issuedAt = Date.parse(reference.issuedAt);
  if (!Number.isFinite(issuedAt) || issuedAt > checkedAt || issuedAt >= nextReviewAt) return outcome('review_due', 'invalid_reference_dates');
  if (nowMs < issuedAt) return outcome('review_due', 'source_not_yet_effective');
  if (reference.publishedStatus === 'excluded') return outcome('ambiguous', 'excluded_from_publication', reference);
  if (!instrumentTypeMatches(row, assetType)) return outcome('ambiguous', 'instrument_type_mismatch', reference);
  if (nowMs >= nextReviewAt) return outcome('review_due', 'review_overdue', reference);
  return outcome('listed', 'published_membership', reference);
}

/**
 * Keep the publication data out of shared/client imports. Server adapters and
 * reviewed small client snapshots supply their own rows explicitly.
 */
export function resolveBoubyanReference(input: BoubyanReferenceInput, options: {
  rows: readonly BoubyanReferenceRow[];
  now?: Date;
  metadata?: BoubyanReferenceMetadata;
}): BoubyanReferenceResult {
  return resolveIndexed(input, indexRows(options.rows), options.metadata ?? BOUBYAN_REFERENCE, options.now ?? new Date());
}

/** Index once when classifying a catalog; never scan the full source per asset. */
export function createBoubyanReferenceResolver(rows: readonly BoubyanReferenceRow[], metadata: BoubyanReferenceMetadata = BOUBYAN_REFERENCE) {
  const index = indexRows(rows);
  return (input: BoubyanReferenceInput, options: { now?: Date } = {}) => resolveIndexed(input, index, metadata, options.now ?? new Date());
}
