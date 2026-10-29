import { z } from 'zod';
import { analyzeDecision, type DecisionInputs, type DecisionSourceData } from '@/lib/decisions/decisionAnalysis';
import { versionedEconomicAnalysis, type EconomicDecisionLocale } from '@/lib/decisions/economicIntelligencePresentation';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { businessPermissions, type BusinessRole } from '@/lib/businessOperations';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

const SOURCE_TABLES = [
  ['income', 'monthly_income_sources'], ['expenses', 'expense_items'], ['debts', 'debts'],
  ['savings', 'savings_items'], ['investments', 'investment_items'], ['goals', 'financial_goals'],
  ['projects', 'projects'], ['financialModels', 'project_financial_models'],
  ['zakatCalculations', 'zakat_calculations'], ['zakatAssets', 'zakat_assets'],
  ['charityCommitments', 'charity_commitments'],
] as const;
type SourceKey = typeof SOURCE_TABLES[number][0];
type DecisionRow = Record<string, unknown>;

const decisionInputSchema = z.object({
  title: z.string().trim().min(1).max(250),
  decisionType: z.enum(['purchase', 'investment', 'project', 'debt_saving', 'charity_zakat', 'budget']),
  estimatedCost: z.number().finite().positive().max(1e15),
  monthlyImpact: z.number().finite().min(0).max(1e15).default(0),
  expectedBenefit: z.string().trim().max(250).default(''),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  targetDate: z.iso.date().nullable().optional(),
  notes: z.string().trim().max(4000).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  locale: z.enum(['ar', 'en', 'fr']).default('en'),
}).strict();
const deleteSchema = z.object({ id: z.uuid() }).strict();
const decisionColumns = 'id,decision_title,decision_type,estimated_cost,monthly_impact,expected_benefit,risk_level,target_date,notes,risk_score,is_recommended,main_reason,better_alternative,action_plan,priority,inputs,analysis,status,currency,created_at,updated_at';

const COPY = {
  ar: {
    good: 'الأثر الشهري مناسب للميزانية المتاحة.', review: 'يحتاج القرار إلى مراجعة لأن له أثرًا واضحًا في الدخل أو السيولة.', high: 'قد يقلل القرار صافي الدخل الشهري أو يضغط على المدخرات.', insufficient: 'أضف الدخل والمصروفات لتحليل أدق.', alternative: 'خفّض التكلفة أو أجّل القرار 30 يومًا حتى يتحسن الصافي الشهري.', checklist: ['راجع المصروفات غير الأساسية.', 'ضع سقفًا شهريًا للقرار.', 'احتفظ بسيولة للطوارئ قبل التنفيذ.', 'أعد التحليل بعد 30 يومًا.'],
  },
  en: {
    good: 'The monthly impact fits within the available budget.', review: 'The decision needs review because it has a clear income or liquidity impact.', high: 'The decision may reduce monthly net or pressure savings.', insufficient: 'Add income and expenses for a more accurate analysis.', alternative: 'Reduce the cost or delay the decision 30 days until monthly net improves.', checklist: ['Review non-essential expenses.', 'Set a monthly cap for the decision.', 'Keep emergency liquidity before acting.', 'Run the analysis again in 30 days.'],
  },
  fr: {
    good: "L'impact mensuel correspond au budget disponible.", review: "La décision doit être revue car elle a un impact clair sur le revenu ou la liquidité.", high: 'La décision peut réduire le solde mensuel ou peser sur l’épargne.', insufficient: 'Ajoutez les revenus et dépenses pour une analyse plus précise.', alternative: 'Réduisez le coût ou reportez la décision de 30 jours jusqu’à amélioration du solde mensuel.', checklist: ['Revoyez les dépenses non essentielles.', 'Fixez un plafond mensuel pour la décision.', "Gardez une liquidité d'urgence avant d’agir.", "Relancez l'analyse dans 30 jours."],
  },
} as const;

function reasonFor(status: string, locale: EconomicDecisionLocale) {
  const copy = COPY[locale];
  if (status === 'high_risk') return copy.high;
  if (status === 'needs_review') return copy.review;
  if (status === 'insufficient_data') return copy.insufficient;
  return copy.good;
}

function riskScore(score: number | null) {
  return score === null ? 0 : Math.max(0, Math.min(100, 100 - score));
}

async function businessAccess(request: Request) {
  const access = await mobileAccess(request);
  if (access.response) return access;
  const roleResult = await access.client.from('business_user_roles').select('role').eq('user_id', access.userId).maybeSingle();
  const role = roleResult.data?.role;
  if (roleResult.error) return { response: mobileResponse({ ok: false, code: 'ACCESS_UNAVAILABLE' }, 503) };
  if (!role || !['manager', 'accountant', 'employee'].includes(role)) return { response: mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403) };
  return { ...access, role: role as BusinessRole, permissions: businessPermissions(role as BusinessRole) };
}

type DecisionSourceClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (limit: number) => PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>;
      };
    };
  };
};
async function decisionSources(client: DecisionSourceClient, userId: string): Promise<DecisionSourceData | null> {
  const loaded = await Promise.all(SOURCE_TABLES.map(async ([key, table]) => {
    const result = await client.from(table).select('*').eq('user_id', userId).limit(1000);
    return { key, result };
  }));
  if (loaded.some(({ result }) => result.error)) return null;
  const records = Object.fromEntries(loaded.map(({ key, result }) => [key, (result.data ?? []) as DecisionRow[]])) as Record<SourceKey, DecisionRow[]>;
  return {
    income: personalIncomeRows(records.income), expenses: personalExpenseRows(records.expenses),
    debts: records.debts, savings: records.savings, investments: records.investments, goals: records.goals,
    projects: records.projects, financialModels: records.financialModels, zakatCalculations: records.zakatCalculations,
    zakatAssets: records.zakatAssets, charityCommitments: records.charityCommitments,
  };
}

/** Native Business decisions use real account rows server-side; source rows never become a mobile cache. */
export async function handleMobileBusinessDecisions(request: Request) {
  const access = await businessAccess(request);
  if (access.response) return access.response;
  const limited = rateLimitRequest(request, { max: 30, windowMs: 60_000, prefix: `mobile-decisions:${access.userId}` });
  if (limited) { limited.headers.set('Cache-Control', 'private, no-store'); return limited; }
  const canWrite = access.permissions.canWriteBusinessModules;
  const canDelete = access.permissions.canDeleteBusinessModules;

  if (request.method === 'GET') {
    if (!access.permissions.canViewBusinessModules) return mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403);
    const result = await access.client.from('user_decisions').select(decisionColumns).eq('user_id', access.userId).order('updated_at', { ascending: false }).limit(100);
    if (result.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
    return mobileResponse({ ok: true, decisions: result.data ?? [], canWrite, canDelete });
  }
  if (!['POST', 'DELETE'].includes(request.method)) return mobileResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  const raw = await request.text();
  if (raw.length > 16_384) return mobileResponse({ ok: false, code: 'BODY_TOO_LARGE' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return mobileResponse({ ok: false, code: 'INVALID_REQUEST' }, 400); }

  if (request.method === 'DELETE') {
    if (!canDelete) return mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return mobileResponse({ ok: false, code: 'INVALID_REQUEST' }, 400);
    const result = await access.client.from('user_decisions').delete().eq('user_id', access.userId).eq('id', parsed.data.id).select('id').maybeSingle();
    if (result.error) return mobileResponse({ ok: false, code: 'SAVE_UNAVAILABLE' }, 503);
    return result.data ? mobileResponse({ ok: true, id: result.data.id }) : mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  }

  if (!canWrite) return mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403);
  const parsed = decisionInputSchema.safeParse(body);
  if (!parsed.success) return mobileResponse({ ok: false, code: 'INVALID_DECISION' }, 400);
  const value = parsed.data;
  const sources = await decisionSources(access.client as unknown as DecisionSourceClient, access.userId);
  if (!sources) return mobileResponse({ ok: false, code: 'SOURCE_DATA_UNAVAILABLE' }, 503);
  const inputs: DecisionInputs = {
    title: value.title, decisionType: value.decisionType, amount: value.estimatedCost, currency: value.currency,
    targetDate: value.targetDate ?? undefined, priority: 'medium', notes: value.notes,
    recurringCost: value.monthlyImpact, riskLevel: value.riskLevel,
    debtAmount: value.decisionType === 'debt_saving' ? value.estimatedCost : undefined,
    monthlyPayment: value.decisionType === 'debt_saving' ? value.monthlyImpact : undefined,
    expectedMonthlyCost: value.decisionType === 'project' ? value.monthlyImpact : undefined,
    usesSavings: value.decisionType === 'project' || value.decisionType === 'investment',
  };
  const analysis = analyzeDecision(inputs, sources);
  const persistedAnalysis = analysis.economicContext
    ? { ...analysis, economic_intelligence: versionedEconomicAnalysis(analysis.economicContext, value.decisionType) }
    : analysis;
  const copy = COPY[value.locale];
  const payload = {
    user_id: access.userId, decision_title: value.title, decision_type: value.decisionType,
    estimated_cost: value.estimatedCost, monthly_impact: value.monthlyImpact, expected_benefit: value.expectedBenefit,
    risk_level: value.riskLevel, target_date: value.targetDate ?? null, notes: value.notes || null,
    risk_score: riskScore(analysis.score), is_recommended: analysis.status === 'initially_suitable',
    main_reason: reasonFor(analysis.status, value.locale), better_alternative: copy.alternative,
    action_plan: [...copy.checklist], priority: 'medium', inputs, analysis: persistedAnalysis,
    status: analysis.status, currency: value.currency, updated_at: new Date().toISOString(),
  };
  const result = await access.client.from('user_decisions').insert(payload).select(decisionColumns).maybeSingle();
  if (result.error || !result.data) return mobileResponse({ ok: false, code: 'SAVE_UNAVAILABLE' }, 503);
  return mobileResponse({ ok: true, decision: result.data, analysis }, 201);
}
