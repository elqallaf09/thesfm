/**
 * Deterministic investment-readiness engine (phase 2.9).
 *
 * The score is calculated from validated completion state only — every check
 * maps to a real stored field, document, or record. Nothing here is random,
 * AI-generated, or time-of-render dependent: the same snapshot always
 * produces the same report (pass `now` explicitly in tests). AI may explain
 * this report, but never computes it.
 *
 * Category weights sum to 100 so the total score is a plain weighted
 * average and every point in the UI can be traced back to a named check.
 */

export type ReadinessStatus = 'complete' | 'partial' | 'missing' | 'blocked' | 'needs_review';

export type ReadinessCategoryId =
  | 'profile'
  | 'business_model'
  | 'market'
  | 'financials'
  | 'pitch_deck'
  | 'documents'
  | 'risks'
  | 'funding_request'
  | 'investor_contact';

export type ReadinessCheck = {
  /** Stable id — UI copy is keyed off this, tests assert on it. */
  id: string;
  done: boolean;
  required: boolean;
  /** A missing blocking check caps the category at `blocked`. */
  blocking: boolean;
};

export type ReadinessCategory = {
  id: ReadinessCategoryId;
  weight: number;
  percent: number;
  status: ReadinessStatus;
  checks: ReadinessCheck[];
  missingCheckIds: string[];
  blockerCheckIds: string[];
  /** ISO timestamp of the newest row backing this category, if any. */
  lastUpdated: string | null;
  /** First missing required check — the recommended next action. */
  nextCheckId: string | null;
};

export type ReadinessReport = {
  /** 0–100, weighted, rounded down — never shows 100 unless truly complete. */
  score: number;
  status: ReadinessStatus;
  categories: ReadinessCategory[];
  blockerCheckIds: string[];
  missingRequiredCount: number;
  optionalImprovementCount: number;
  /** ISO timestamp the report was computed at (injectable for tests). */
  computedAt: string;
};

type Row = Record<string, unknown>;

export type ReadinessSnapshot = {
  project: Row | null;
  feasibility: Row | null;
  financialModel: Row | null;
  funding: Row | null;
  pitchDeck: Row | null;
  documents: Row[];
  risks: Row[];
  links: Row[];
  contactEmail?: string | null;
};

export const READINESS_CATEGORY_WEIGHTS: Record<ReadinessCategoryId, number> = {
  profile: 15,
  business_model: 10,
  market: 10,
  financials: 20,
  pitch_deck: 15,
  documents: 10,
  risks: 5,
  funding_request: 10,
  investor_contact: 5,
};

/** Data older than this is flagged `needs_review` instead of `complete`. */
export const STALE_AFTER_DAYS = 365;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? (value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Row[])
    : [];
}

function filledText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveNumber(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function anyFilled(row: Row, keys: string[]): boolean {
  return keys.some(key => filledText(row[key]) || positiveNumber(row[key]));
}

function newestTimestamp(sources: Array<Row | null>): string | null {
  let best: string | null = null;
  let bestTime = 0;
  for (const source of sources) {
    if (!source) continue;
    for (const key of ['updated_at', 'uploaded_at', 'created_at', 'last_review_at']) {
      const raw = String(source[key] ?? '').trim();
      if (!raw) continue;
      const time = new Date(raw).getTime();
      if (Number.isFinite(time) && time > bestTime) {
        bestTime = time;
        best = raw;
      }
    }
  }
  return best;
}

function isStale(lastUpdated: string | null, now: number): boolean {
  if (!lastUpdated) return false;
  const time = new Date(lastUpdated).getTime();
  if (!Number.isFinite(time)) return false;
  return now - time > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

function check(id: string, done: boolean, options: { required?: boolean; blocking?: boolean } = {}): ReadinessCheck {
  return { id, done, required: options.required ?? true, blocking: options.blocking ?? false };
}

function buildCategory(
  id: ReadinessCategoryId,
  checks: ReadinessCheck[],
  lastUpdated: string | null,
  now: number,
): ReadinessCategory {
  const required = checks.filter(item => item.required);
  const doneRequired = required.filter(item => item.done);
  const percent = required.length === 0
    ? 0
    : Math.floor((doneRequired.length / required.length) * 100);
  const missingCheckIds = checks.filter(item => item.required && !item.done).map(item => item.id);
  const blockerCheckIds = checks.filter(item => item.blocking && !item.done).map(item => item.id);

  let status: ReadinessStatus;
  if (blockerCheckIds.length > 0) status = 'blocked';
  else if (percent === 0) status = 'missing';
  else if (percent < 100) status = 'partial';
  else if (isStale(lastUpdated, now)) status = 'needs_review';
  else status = 'complete';

  return {
    id,
    weight: READINESS_CATEGORY_WEIGHTS[id],
    percent,
    status,
    checks,
    missingCheckIds,
    blockerCheckIds,
    lastUpdated,
    nextCheckId: missingCheckIds[0] ?? null,
  };
}

const LEGAL_DOCUMENT_HINTS = ['legal', 'license', 'licence', 'registration', 'contract', 'قانون', 'ترخيص', 'رخصة', 'سجل', 'عقد'];
const FINANCIAL_DOCUMENT_HINTS = ['financial', 'statement', 'audit', 'مالي', 'ميزانية', 'قوائم'];

function documentHaystack(row: Row): string {
  return [row.category, row.document_type, row.documentType, row.type, row.title, row.name, row.file_name, row.notes]
    .map(value => String(value ?? ''))
    .join(' ')
    .toLowerCase();
}

export function documentMatchesHints(row: Row, hints: string[]): boolean {
  const haystack = documentHaystack(row);
  return hints.some(hint => haystack.includes(hint));
}

export function computeReadiness(snapshot: ReadinessSnapshot, now: number = Date.now()): ReadinessReport {
  const project = snapshot.project ?? {};
  const feasibility = snapshot.feasibility ?? {};
  const marketData = record(feasibility.market_data);
  const technicalData = record(feasibility.technical_data);
  const financialModel = snapshot.financialModel ?? {};
  const funding = snapshot.funding ?? {};
  const pitchDeck = snapshot.pitchDeck;
  const deckData = record(pitchDeck?.deck_data);
  const slides = rows(deckData.slides);
  const documents = snapshot.documents;
  const risks = snapshot.risks;
  const activeLinks = snapshot.links.filter(link => !link.revoked_at);

  const profile = buildCategory('profile', [
    check('profile_name', filledText(project.name) || filledText(project.title)),
    check('profile_description', anyFilled(project, ['description', 'notes', 'summary'])),
    check('profile_stage', anyFilled(project, ['status', 'stage', 'timeline'])),
    check('profile_sector', anyFilled(project, ['sector', 'type', 'category', 'emoji']), { required: false }),
  ], newestTimestamp([snapshot.project]), now);

  const businessModel = buildCategory('business_model', [
    check('business_model_value', anyFilled(technicalData, ['business_model', 'value_proposition', 'product', 'product_description'])
      || anyFilled(record(feasibility.financial_data), ['revenue_model'])),
    check('business_model_revenue_streams', rows(financialModel.revenue_streams).length > 0),
    check('business_model_operations', anyFilled(technicalData, ['operations', 'operating_plan', 'team']), { required: false }),
  ], newestTimestamp([snapshot.feasibility, snapshot.financialModel]), now);

  const market = buildCategory('market', [
    check('market_target_customers', anyFilled(marketData, ['target_customers', 'target_market', 'customers'])),
    check('market_size', anyFilled(marketData, ['market_size', 'market_size_estimate', 'tam'])),
    check('market_competition', anyFilled(marketData, ['competition', 'competitors', 'competitive_advantage'])),
  ], newestTimestamp([snapshot.feasibility]), now);

  const financials = buildCategory('financials', [
    check('financials_model', snapshot.financialModel !== null, { blocking: true }),
    check('financials_revenue', rows(financialModel.revenue_streams).length > 0),
    check('financials_costs', rows(financialModel.cost_items).length > 0),
    check('financials_forecast', rows(financialModel.forecast).length > 0),
    check('financials_assumptions', Object.keys(record(financialModel.assumptions)).length > 0, { required: false }),
  ], newestTimestamp([snapshot.financialModel]), now);

  const completedSlides = slides.filter(slide => String(record(slide).status ?? '') === 'complete').length;
  const pitch = buildCategory('pitch_deck', [
    check('pitch_deck_exists', pitchDeck !== null, { blocking: true }),
    check('pitch_deck_half_complete', slides.length > 0 && completedSlides >= Math.ceil(slides.length / 2)),
    check('pitch_deck_fully_complete', slides.length > 0 && completedSlides === slides.length, { required: false }),
  ], newestTimestamp([pitchDeck]), now);

  const documentsCategory = buildCategory('documents', [
    check('documents_any', documents.length > 0, { blocking: true }),
    check('documents_legal', documents.some(row => documentMatchesHints(row, LEGAL_DOCUMENT_HINTS))),
    check('documents_financial', documents.some(row => documentMatchesHints(row, FINANCIAL_DOCUMENT_HINTS)), { required: false }),
  ], newestTimestamp(documents), now);

  const risksCategory = buildCategory('risks', [
    check('risks_recorded', risks.length > 0),
    check('risks_mitigation', risks.length > 0 && risks.every(risk => filledText(risk.mitigation))),
  ], newestTimestamp(risks), now);

  const fundingRequest = buildCategory('funding_request', [
    check('funding_amount', positiveNumber(funding.funding_needed)),
    check('funding_currency', filledText(funding.currency)),
    check('funding_use_of_funds', Object.keys(record(funding.use_of_funds)).length > 0),
    check('funding_type', filledText(funding.funding_type), { required: false }),
  ], newestTimestamp([snapshot.funding]), now);

  const investorContact = buildCategory('investor_contact', [
    check('contact_email', filledText(snapshot.contactEmail)),
    check('contact_share_link', activeLinks.length > 0, { required: false }),
  ], newestTimestamp(snapshot.links), now);

  const categories = [
    profile,
    businessModel,
    market,
    financials,
    pitch,
    documentsCategory,
    risksCategory,
    fundingRequest,
    investorContact,
  ];

  const totalWeight = categories.reduce((sum, category) => sum + category.weight, 0);
  const weighted = categories.reduce((sum, category) => sum + category.weight * category.percent, 0);
  const score = totalWeight === 0 ? 0 : Math.floor(weighted / totalWeight);

  const blockerCheckIds = categories.flatMap(category => category.blockerCheckIds);
  const missingRequiredCount = categories.reduce((sum, category) => sum + category.missingCheckIds.length, 0);
  const optionalImprovementCount = categories.reduce(
    (sum, category) => sum + category.checks.filter(item => !item.required && !item.done).length,
    0,
  );

  let status: ReadinessStatus;
  if (blockerCheckIds.length > 0) status = 'blocked';
  else if (score === 0) status = 'missing';
  else if (score < 100) status = 'partial';
  else if (categories.some(category => category.status === 'needs_review')) status = 'needs_review';
  else status = 'complete';

  return {
    score,
    status,
    categories,
    blockerCheckIds,
    missingRequiredCount,
    optionalImprovementCount,
    computedAt: new Date(now).toISOString(),
  };
}
