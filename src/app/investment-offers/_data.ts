import { supabase } from '@/integrations/supabase/client';
import { documentMatchesHints } from '@/lib/investor/readiness';
import type { InvestorCopy } from './_text';

export type Lang = 'ar' | 'en' | 'fr';
export type Row = Record<string, any>;

export type WorkspaceData = {
  projects: Row[];
  feasibilities: Row[];
  financialModels: Row[];
  fundingReadiness: Row[];
  pitchDecks: Row[];
  strategicDocuments: Row[];
  projectDocuments: Row[];
  risks: Row[];
  links: Row[];
  events: Row[];
  questions: Row[];
  diligenceItems: Row[];
};

export const EMPTY_WORKSPACE: WorkspaceData = {
  projects: [],
  feasibilities: [],
  financialModels: [],
  fundingReadiness: [],
  pitchDecks: [],
  strategicDocuments: [],
  projectDocuments: [],
  risks: [],
  links: [],
  events: [],
  questions: [],
  diligenceItems: [],
};

export function isMissingTableError(message: string) {
  return /does not exist|schema cache|not find|relation/i.test(message);
}

export async function loadRows(table: string, userId: string) {
  try {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).limit(1000);
    if (error) return { rows: [] as Row[], error: error.message ?? 'Load error' };
    return { rows: (data ?? []) as Row[], error: '' };
  } catch (error) {
    return { rows: [] as Row[], error: error instanceof Error ? error.message : 'Load error' };
  }
}

export function projectIdOf(row: Row) {
  return String(row.project_id ?? row.projectId ?? '');
}

export function recordValue(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

export function rowArray(value: unknown): Row[] {
  return Array.isArray(value)
    ? (value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Row[])
    : [];
}

export function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function textOf(row: Row | null | undefined, keys: string[], fallback = '') {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

export function formatDate(value: unknown, lang: Lang) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: unknown, lang: Lang) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatMoney(value: unknown, currency: unknown, lang: Lang, fallback: string) {
  const amount = numberValue(value);
  if (amount === null || amount <= 0) return fallback;
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const currencyCode = String(currency ?? '').trim().toUpperCase();
  try {
    if (/^[A-Z]{3}$/.test(currencyCode)) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 3 }).format(amount);
    }
  } catch {
    // Fall through to a plain number plus the stored currency text.
  }
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(amount);
  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

/* ── Document categorization ─────────────────────────────────────────── */

export type DocumentCategoryId =
  | 'company'
  | 'legal'
  | 'financial'
  | 'market'
  | 'pitch'
  | 'contracts'
  | 'diligence'
  | 'other';

const DOCUMENT_CATEGORY_HINTS: Array<{ id: DocumentCategoryId; hints: string[] }> = [
  { id: 'legal', hints: ['legal', 'license', 'licence', 'registration', 'permit', 'قانون', 'ترخيص', 'رخصة', 'سجل تجاري'] },
  { id: 'contracts', hints: ['contract', 'agreement', 'عقد', 'اتفاق'] },
  { id: 'financial', hints: ['financial', 'statement', 'audit', 'balance', 'مالي', 'ميزانية', 'قوائم'] },
  { id: 'market', hints: ['market', 'research', 'سوق', 'دراسة'] },
  { id: 'pitch', hints: ['pitch', 'deck', 'presentation', 'عرض تقديمي'] },
  { id: 'diligence', hints: ['due diligence', 'due_diligence', 'diligence', 'فحص'] },
  { id: 'company', hints: ['company', 'profile', 'incorporation', 'شركة', 'تأسيس', 'هوية'] },
];

export function categorizeDocument(row: Row): DocumentCategoryId {
  for (const { id, hints } of DOCUMENT_CATEGORY_HINTS) {
    if (documentMatchesHints(row, hints)) return id;
  }
  return 'other';
}

export function documentCategoryLabel(id: DocumentCategoryId, text: InvestorCopy): string {
  const labels: Record<DocumentCategoryId, string> = {
    company: text.docCategoryCompany,
    legal: text.docCategoryLegal,
    financial: text.docCategoryFinancial,
    market: text.docCategoryMarket,
    pitch: text.docCategoryPitch,
    contracts: text.docCategoryContracts,
    diligence: text.docCategoryDiligence,
    other: text.docCategoryOther,
  };
  return labels[id];
}

export function documentTimestamp(row: Row) {
  return new Date(String(row.updated_at ?? row.uploaded_at ?? row.created_at ?? '')).getTime() || 0;
}

export function uniqueDocumentRows(rows: Row[]) {
  const grouped = new Map<string, Row>();
  for (const row of rows) {
    const sourceUrl = String(row.source_url ?? row.sourceUrl ?? '').trim().toLowerCase();
    const key = sourceUrl
      ? [row.user_id, projectIdOf(row), row.category || '', sourceUrl, row.document_type || row.type || 'uploaded_file'].join('|')
      : `record:${row.id}`;
    const current = grouped.get(key);
    if (!current || documentTimestamp(row) >= documentTimestamp(current)) grouped.set(key, row);
  }
  return Array.from(grouped.values()).sort((left, right) => documentTimestamp(right) - documentTimestamp(left));
}

/* ── Due-diligence checklist ─────────────────────────────────────────── */

export type DiligenceGroupId =
  | 'identity'
  | 'ownership'
  | 'legal'
  | 'financial_statements'
  | 'tax'
  | 'contracts'
  | 'ip'
  | 'liabilities'
  | 'risks'
  | 'funding';

export type DiligenceItem = {
  group: DiligenceGroupId;
  key: string;
  required: boolean;
  /** True only when backed by saved data — never assumed. */
  evidence: boolean;
  /** Owner review stored in project_due_diligence_items (note required). */
  stored: Row | null;
};

export function diligenceGroupLabel(id: DiligenceGroupId, text: InvestorCopy): string {
  const labels: Record<DiligenceGroupId, string> = {
    identity: text.ddGroupIdentity,
    ownership: text.ddGroupOwnership,
    legal: text.ddGroupLegal,
    financial_statements: text.ddGroupFinancialStatements,
    tax: text.ddGroupTax,
    contracts: text.ddGroupContracts,
    ip: text.ddGroupIp,
    liabilities: text.ddGroupLiabilities,
    risks: text.ddGroupRisks,
    funding: text.ddGroupFunding,
  };
  return labels[id];
}

/**
 * The checklist is derived from real data (documents, funding, risks) and
 * merged with per-item owner reviews. Evidence is never assumed: an item
 * with no matching data and no stored review renders as missing.
 */
export function buildDiligenceChecklist(input: {
  project: Row | null;
  funding: Row | null;
  documents: Row[];
  risks: Row[];
  stored: Row[];
}): DiligenceItem[] {
  const { project, funding, documents, risks, stored } = input;
  const byKey = new Map(stored.map(row => [`${row.group_key}:${row.item_key}`, row]));
  const hasDocument = (hints: string[]) => documents.some(row => documentMatchesHints(row, hints));

  const items: Array<Omit<DiligenceItem, 'stored'>> = [
    { group: 'identity', key: 'company_profile', required: true, evidence: Boolean(project && String(project.name ?? '').trim() && String(project.notes ?? '').trim()) },
    { group: 'ownership', key: 'ownership_structure', required: true, evidence: hasDocument(['ownership', 'shareholder', 'ملكية', 'مساهم']) },
    { group: 'legal', key: 'legal_registration', required: true, evidence: hasDocument(['legal', 'registration', 'license', 'licence', 'ترخيص', 'سجل']) },
    { group: 'financial_statements', key: 'financial_statements', required: true, evidence: hasDocument(['financial', 'statement', 'audit', 'مالي', 'قوائم']) },
    { group: 'tax', key: 'tax_regulatory', required: false, evidence: hasDocument(['tax', 'regulatory', 'ضريب', 'رقاب']) },
    { group: 'contracts', key: 'key_contracts', required: false, evidence: hasDocument(['contract', 'agreement', 'عقد']) },
    { group: 'ip', key: 'intellectual_property', required: false, evidence: hasDocument(['ip', 'trademark', 'patent', 'علامة', 'براءة']) },
    { group: 'liabilities', key: 'liabilities_disclosure', required: true, evidence: hasDocument(['liabilit', 'debt', 'التزام', 'دين']) },
    { group: 'risks', key: 'risk_register', required: true, evidence: risks.length > 0 },
    { group: 'funding', key: 'funding_structure', required: true, evidence: Boolean(funding && Number(funding.funding_needed) > 0) },
  ];

  return items.map(item => ({ ...item, stored: byKey.get(`${item.group}:${item.key}`) ?? null }));
}

export function diligenceItemLabel(item: Pick<DiligenceItem, 'group' | 'key'>, lang: Lang): string {
  const labels: Record<string, Record<Lang, string>> = {
    'identity:company_profile': { ar: 'ملف تعريف الشركة أو المشروع', en: 'Company or project profile', fr: 'Profil de l’entreprise ou du projet' },
    'ownership:ownership_structure': { ar: 'هيكل الملكية والمساهمين', en: 'Ownership and shareholder structure', fr: 'Structure de l’actionnariat' },
    'legal:legal_registration': { ar: 'التسجيل القانوني والتراخيص', en: 'Legal registration and licenses', fr: 'Immatriculation légale et licences' },
    'financial_statements:financial_statements': { ar: 'القوائم المالية', en: 'Financial statements', fr: 'États financiers' },
    'tax:tax_regulatory': { ar: 'المستندات الضريبية أو الرقابية', en: 'Tax or regulatory documents', fr: 'Documents fiscaux ou réglementaires' },
    'contracts:key_contracts': { ar: 'العقود الأساسية', en: 'Key contracts', fr: 'Contrats clés' },
    'ip:intellectual_property': { ar: 'الملكية الفكرية', en: 'Intellectual property', fr: 'Propriété intellectuelle' },
    'liabilities:liabilities_disclosure': { ar: 'الإفصاح عن الالتزامات', en: 'Liabilities disclosure', fr: 'Déclaration des passifs' },
    'risks:risk_register': { ar: 'سجل المخاطر مع خطط التخفيف', en: 'Risk register with mitigations', fr: 'Registre des risques avec atténuations' },
    'funding:funding_structure': { ar: 'هيكل التمويل المطلوب', en: 'Requested funding structure', fr: 'Structure du financement demandé' },
  };
  return labels[`${item.group}:${item.key}`]?.[lang] ?? item.key;
}

/* ── Financial extraction ────────────────────────────────────────────── */

export type FinancialSource = 'user' | 'forecast' | 'actual' | 'ai' | 'unavailable';

export type FinancialMetric = {
  id: string;
  value: number | null;
  currency: string | null;
  source: FinancialSource;
  updatedAt: string | null;
};

export function extractFinancials(financialModel: Row | null, funding: Row | null) {
  const revenueStreams = rowArray(financialModel?.revenue_streams);
  const costItems = rowArray(financialModel?.cost_items);
  const forecast = rowArray(financialModel?.forecast);
  const assumptions = recordValue(financialModel?.assumptions);
  const kpis = recordValue(financialModel?.kpis);
  const currency = String(funding?.currency ?? '').trim() || null;
  const updatedAt = String(financialModel?.updated_at ?? '').trim() || null;

  const sumOf = (rows: Row[], keys: string[]) => {
    let total = 0;
    let seen = false;
    for (const row of rows) {
      for (const key of keys) {
        const value = numberValue(row[key]);
        if (value !== null) {
          total += value;
          seen = true;
          break;
        }
      }
    }
    return seen ? total : null;
  };

  const plannedRevenue = sumOf(revenueStreams, ['monthly_amount', 'amount', 'value', 'monthly']);
  const plannedCosts = sumOf(costItems, ['monthly_amount', 'amount', 'value', 'monthly']);

  const metrics: FinancialMetric[] = [
    { id: 'planned_revenue', value: plannedRevenue, currency, source: plannedRevenue === null ? 'unavailable' : 'user', updatedAt },
    { id: 'planned_costs', value: plannedCosts, currency, source: plannedCosts === null ? 'unavailable' : 'user', updatedAt },
    {
      id: 'planned_net',
      value: plannedRevenue !== null && plannedCosts !== null ? plannedRevenue - plannedCosts : null,
      currency,
      source: plannedRevenue !== null && plannedCosts !== null ? 'user' : 'unavailable',
      updatedAt,
    },
    {
      id: 'funding_target',
      value: numberValue(funding?.funding_needed),
      currency,
      source: numberValue(funding?.funding_needed) === null ? 'unavailable' : 'user',
      updatedAt: String(funding?.updated_at ?? '').trim() || null,
    },
  ];

  return { revenueStreams, costItems, forecast, assumptions, kpis, metrics, currency, updatedAt };
}
