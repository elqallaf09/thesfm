import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';

type Lang = 'ar' | 'en' | 'fr';
type SuggestedAction = 'approve' | 'review' | 'reduce' | 'move_category' | 'attach_document';
type AmountLevel = 'low' | 'normal' | 'high' | 'unknown';

type ExpensePayload = {
  title?: string;
  amount?: number;
  currency?: string;
  date?: string;
  category?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  hasReceipt?: boolean;
  expenseId?: string | null;
};

type ExpenseAnalysis = {
  source: 'ai' | 'rules';
  summary: string;
  necessity: string;
  category: string;
  budgetImpact: string;
  amountLevel: AmountLevel;
  fundingReadinessImpact: string;
  suggestedAction: SuggestedAction;
  warnings: string[];
  budget: {
    plannedBudget: number | null;
    existingExpenses: number;
    expenseAmount: number;
    remainingAfterExpense: number | null;
    percentageUsed: number | null;
    categoryWarning: string | null;
  };
};

const TEXT = {
  ar: {
    unauthorized: 'غير مصرح.',
    projectNotFound: 'لم يتم العثور على المشروع.',
    invalidExpense: 'أدخل مبلغاً صحيحاً قبل تحليل المصروف.',
    noBudget: 'لا توجد ميزانية محددة لهذا المشروع، أضف ميزانية للحصول على تحليل أدق.',
    highAmount: 'المبلغ مرتفع مقارنة بميزانية المشروع.',
    normalAmount: 'المبلغ ضمن نطاق قابل للمراجعة مقارنة بميزانية المشروع.',
    lowAmount: 'المبلغ منخفض نسبياً مقارنة بميزانية المشروع.',
    overBudget: 'هذا المصروف يجعل إجمالي المصروفات يتجاوز ميزانية المشروع.',
    attachReceipt: 'إرفاق إيصال أو فاتورة يدعم جاهزية التمويل والتوثيق.',
    summary: 'تحليل مبدئي للمصروف بناءً على بيانات المشروع الحالية.',
    necessaryUnknown: 'لا يمكن تأكيد ضرورة المصروف من البيانات الحالية، راجعه حسب خطة التنفيذ.',
    budgetImpact: 'تم حساب أثر المصروف على الميزانية المتاحة للمشروع.',
    readinessNeutral: 'يحتاج المصروف إلى توثيق ومراجعة حتى لا يضعف جاهزية التمويل.',
  },
  en: {
    unauthorized: 'Unauthorized.',
    projectNotFound: 'Project not found.',
    invalidExpense: 'Enter a valid amount before analyzing the expense.',
    noBudget: 'No budget is defined for this project. Add a budget for more accurate analysis.',
    highAmount: 'The amount is high compared with the project budget.',
    normalAmount: 'The amount is within a reviewable range compared with the project budget.',
    lowAmount: 'The amount is relatively low compared with the project budget.',
    overBudget: 'This expense pushes total expenses above the project budget.',
    attachReceipt: 'Attaching a receipt or invoice improves funding readiness and documentation.',
    summary: 'Initial expense analysis based on the current project data.',
    necessaryUnknown: 'The necessity of this expense cannot be confirmed from current data; review it against the execution plan.',
    budgetImpact: 'The expense impact was calculated against the available project budget.',
    readinessNeutral: 'This expense needs documentation and review so it does not weaken funding readiness.',
  },
  fr: {
    unauthorized: 'Non autorisé.',
    projectNotFound: 'Projet introuvable.',
    invalidExpense: 'Saisissez un montant valide avant d’analyser la dépense.',
    noBudget: 'Aucun budget n’est défini pour ce projet. Ajoutez un budget pour une analyse plus précise.',
    highAmount: 'Le montant est élevé par rapport au budget du projet.',
    normalAmount: 'Le montant reste dans une zone à vérifier par rapport au budget du projet.',
    lowAmount: 'Le montant est relativement faible par rapport au budget du projet.',
    overBudget: 'Cette dépense fait dépasser le budget du projet.',
    attachReceipt: 'Joindre un reçu ou une facture améliore la préparation au financement et la documentation.',
    summary: 'Analyse initiale de la dépense basée sur les données actuelles du projet.',
    necessaryUnknown: 'La nécessité de cette dépense ne peut pas être confirmée avec les données actuelles; vérifiez-la avec le plan d’exécution.',
    budgetImpact: 'L’impact de la dépense a été calculé par rapport au budget disponible du projet.',
    readinessNeutral: 'Cette dépense doit être documentée et vérifiée pour ne pas affaiblir la préparation au financement.',
  },
} as const;

function getSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function getProvider() {
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (gatewayToken) {
    return createAnthropic({
      apiKey: gatewayToken,
      baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic',
    });
  }
  return anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;
}

function aiProviderConfigured() {
  return Boolean(process.env.AI_GATEWAY_TOKEN || process.env.ANTHROPIC_API_KEY);
}

function toNum(value: unknown) {
  const number = Number(String(value ?? 0).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function parseRecord(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeLang(value: unknown): Lang {
  return value === 'ar' || value === 'fr' || value === 'en' ? value : 'en';
}

function normalizeAction(value: unknown): SuggestedAction {
  if (value === 'approve' || value === 'review' || value === 'reduce' || value === 'move_category' || value === 'attach_document') return value;
  return 'review';
}

function normalizeAmountLevel(value: unknown): AmountLevel {
  if (value === 'low' || value === 'normal' || value === 'high' || value === 'unknown') return value;
  return 'unknown';
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildBudget(project: any, expenses: any[], expense: ExpensePayload) {
  const notes = parseRecord(project?.notes);
  const plannedBudget = toNum(notes.capital ?? notes.capital_amount ?? notes.requiredCapital ?? project?.budget);
  const expenseAmount = toNum(expense.amount);
  const existingExpenses = expenses
    .filter(row => !expense.expenseId || row.id !== expense.expenseId)
    .reduce((sum, row) => sum + toNum(row.amount), 0);
  const budget = plannedBudget > 0 ? plannedBudget : null;
  const remainingAfterExpense = budget === null ? null : budget - existingExpenses - expenseAmount;
  const percentageUsed = budget === null ? null : ((existingExpenses + expenseAmount) / budget) * 100;
  return {
    plannedBudget: budget,
    existingExpenses,
    expenseAmount,
    remainingAfterExpense,
    percentageUsed,
    categoryWarning: null as string | null,
  };
}

function buildRulesAnalysis(lang: Lang, project: any, expenses: any[], expense: ExpensePayload): ExpenseAnalysis {
  const t = TEXT[lang];
  const budget = buildBudget(project, expenses, expense);
  const ratio = budget.plannedBudget ? budget.expenseAmount / budget.plannedBudget : null;
  const amountLevel: AmountLevel = ratio === null ? 'unknown' : ratio >= 0.15 ? 'high' : ratio >= 0.03 ? 'normal' : 'low';
  const warnings: string[] = [];
  if (!budget.plannedBudget) warnings.push(t.noBudget);
  if (!expense.hasReceipt) warnings.push(t.attachReceipt);
  if (budget.remainingAfterExpense !== null && budget.remainingAfterExpense < 0) warnings.push(t.overBudget);
  const suggestedAction: SuggestedAction = !expense.hasReceipt
    ? 'attach_document'
    : budget.remainingAfterExpense !== null && budget.remainingAfterExpense < 0
      ? 'reduce'
      : amountLevel === 'high'
        ? 'review'
        : 'approve';
  const amountText = amountLevel === 'high' ? t.highAmount : amountLevel === 'normal' ? t.normalAmount : amountLevel === 'low' ? t.lowAmount : t.noBudget;
  return {
    source: 'rules',
    summary: t.summary,
    necessity: t.necessaryUnknown,
    category: String(expense.category || 'general'),
    budgetImpact: budget.plannedBudget ? `${t.budgetImpact} ${amountText}` : t.noBudget,
    amountLevel,
    fundingReadinessImpact: expense.hasReceipt ? t.readinessNeutral : t.attachReceipt,
    suggestedAction,
    warnings,
    budget,
  };
}

function normalizeAiAnalysis(value: any, fallback: ExpenseAnalysis): ExpenseAnalysis {
  if (!value || typeof value !== 'object') return fallback;
  return {
    ...fallback,
    source: 'ai',
    summary: typeof value.summary === 'string' && value.summary.trim() ? value.summary.trim() : fallback.summary,
    necessity: typeof value.necessity === 'string' && value.necessity.trim() ? value.necessity.trim() : fallback.necessity,
    category: typeof value.category === 'string' && value.category.trim() ? value.category.trim() : fallback.category,
    budgetImpact: typeof value.budgetImpact === 'string' && value.budgetImpact.trim() ? value.budgetImpact.trim() : fallback.budgetImpact,
    amountLevel: normalizeAmountLevel(value.amountLevel) || fallback.amountLevel,
    fundingReadinessImpact: typeof value.fundingReadinessImpact === 'string' && value.fundingReadinessImpact.trim() ? value.fundingReadinessImpact.trim() : fallback.fundingReadinessImpact,
    suggestedAction: normalizeAction(value.suggestedAction),
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((item: unknown) => typeof item === 'string' && item.trim()).slice(0, 5) : fallback.warnings,
  };
}

async function runAi(project: any, expenses: any[], expense: ExpensePayload, fallback: ExpenseAnalysis, lang: Lang) {
  const provider = getProvider();
  if (!provider) return fallback;
  const prompt = [
    `Language: ${lang}.`,
    'Analyze this project expense for THE SFM as strict JSON only.',
    'Do not invent missing facts. Do not give financial advice guarantees. Use only provided data.',
    'Return schema: {"summary":"string","necessity":"string","category":"string","budgetImpact":"string","amountLevel":"low|normal|high|unknown","fundingReadinessImpact":"string","suggestedAction":"approve|review|reduce|move_category|attach_document","warnings":["string"]}.',
    `Expense: ${JSON.stringify(expense)}`,
    `Project: ${JSON.stringify({ id: project?.id, name: project?.name, budget: project?.budget, notes: project?.notes })}`,
    `Budget: ${JSON.stringify(fallback.budget)}`,
    `Existing expense count: ${expenses.length}`,
  ].join('\n');
  try {
    const { text } = await generateText({
      model: provider('claude-haiku-4-5-20251001'),
      system: 'You are a project expense analyst for THE SFM. Return structured JSON only and never fabricate receipt or budget values.',
      prompt,
      maxTokens: 900,
    });
    return normalizeAiAnalysis(extractJson(text), fallback);
  } catch (error) {
    console.error('Project expense AI analysis failed', {
      errorName: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : 'expense_ai_failed',
    });
    return fallback;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ ok: false, message: TEXT.ar.unauthorized }, { status: 401 });

  const supabase = getSupabase(token);
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 500 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ ok: false, message: TEXT.ar.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { lang?: Lang; expense?: ExpensePayload };
  const lang = normalizeLang(body.lang);
  const t = TEXT[lang];
  const expense = body.expense ?? {};
  if (toNum(expense.amount) <= 0) return NextResponse.json({ ok: false, message: t.invalidExpense }, { status: 400 });

  const { id } = await params;
  const [projectRes, expensesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle(),
    supabase.from('project_expenses').select('id,amount,currency,category').eq('user_id', user.id).eq('project_id', id),
  ]);

  if (projectRes.error) return NextResponse.json({ ok: false, message: t.projectNotFound }, { status: 500 });
  if (!projectRes.data) return NextResponse.json({ ok: false, message: t.projectNotFound }, { status: 404 });

  const expenses = expensesRes.error ? [] : expensesRes.data ?? [];
  const fallback = buildRulesAnalysis(lang, projectRes.data, expenses, expense);
  if (aiProviderConfigured()) {
    const usage = await consumeAiUsage({
      userId: user.id,
      feature: 'project_expense_analysis',
      metadata: {
        route: '/api/projects/[id]/expense-analysis',
        projectId: id,
        expenseId: expense.expenseId ?? null,
      },
    });
    if (!usage.allowed) return aiUsageLimitResponse(usage);
  }

  const analysis = await runAi(projectRes.data, expenses, expense, fallback, lang);
  return NextResponse.json({ ok: true, analysis });
}
