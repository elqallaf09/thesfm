'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { formatCurrency } from '@/lib/format';
import { formatDate } from '@/lib/formatters';
import {
  analyzeDecision,
  type DecisionAnalysis,
  type DecisionInputs,
  type DecisionPriority,
  type DecisionSourceData,
  type DecisionType,
} from '@/lib/decisions/decisionAnalysis';

type Lang = 'ar' | 'en' | 'fr';

type DecisionRow = {
  id: string;
  decision_title?: string | null;
  decision_type: DecisionType;
  estimated_cost?: number | string | null;
  monthly_impact?: number | string | null;
  expected_benefit?: string | null;
  risk_level?: 'low' | 'medium' | 'high' | string | null;
  currency: string;
  target_date: string | null;
  notes?: string | null;
  risk_score?: number | string | null;
  is_recommended?: boolean | null;
  main_reason?: string | null;
  better_alternative?: string | null;
  action_plan?: unknown;
  priority?: DecisionPriority;
  inputs?: Record<string, unknown> | null;
  analysis?: DecisionAnalysis | null;
  status?: string;
  created_at: string;
  updated_at?: string | null;
};

const SOURCE_TABLES = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'savings', table: 'savings_items' },
  { key: 'investments', table: 'investment_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'projects', table: 'projects' },
  { key: 'financialModels', table: 'project_financial_models' },
  { key: 'zakatCalculations', table: 'zakat_calculations' },
  { key: 'zakatAssets', table: 'zakat_assets' },
  { key: 'charityCommitments', table: 'charity_commitments' },
];

const TEXT = {
  ar: {
    title: 'هل القرار مناسب؟',
    subtitle: 'حلّل قراراً مالياً قبل تنفيذه، مثل شراء سيارة، أخذ قرض، فتح مشروع، تغيير السكن، شراء جهاز غالي، الاستثمار في فرصة، أو زيادة مصروف شهري.',
    eyebrow: 'تحليل قرارات',
    newDecision: 'قرار جديد',
    formTitle: 'بيانات القرار',
    titleLabel: 'عنوان القرار',
    titlePlaceholder: 'مثال: شراء سيارة، أخذ قرض، فتح مشروع',
    type: 'نوع القرار',
    cost: 'التكلفة التقديرية',
    monthlyImpact: 'الأثر الشهري',
    benefit: 'الفائدة المتوقعة',
    riskLevel: 'مستوى المخاطرة',
    targetDate: 'التاريخ المستهدف',
    notes: 'ملاحظات',
    analyzeSave: 'تحليل وحفظ القرار',
    riskScore: 'درجة المخاطرة',
    liquidityImpact: 'التأثير على السيولة',
    monthlyBudgetImpact: 'التأثير على الميزانية الشهرية',
    suitableNow: 'هل القرار مناسب الآن؟',
    mainReason: 'السبب الرئيسي',
    saferAlternative: 'بديل أكثر أماناً',
    checklist: 'قائمة تجهيز 30 يوم',
    previous: 'قرارات سابقة',
    noDecisions: 'لا توجد قرارات سابقة بعد',
    noDecisionsBody: 'ابدأ بتحليل أول قرار مالي لك.',
    delete: 'حذف',
    deleted: 'تم حذف القرار.',
    saved: 'تم حفظ القرار بنجاح',
    saveFailed: 'تعذر حفظ القرار حالياً، الرجاء المحاولة مرة أخرى.',
    validation: 'أدخل عنوان القرار والتكلفة التقديرية.',
    yes: 'نعم',
    no: 'لا',
    wait: 'انتظر',
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض',
    insufficient: 'أضف الدخل والمصروفات للحصول على تحليل أدق.',
    loading: 'جارٍ تحميل مركز القرارات...',
    disclaimer: 'التحليل إرشاد تعليمي وليس استشارة مالية أو قانونية مرخصة.',
    alternativeText: 'خفّض التكلفة أو أجّل القرار 30 يوماً حتى يتحسن صافي الميزانية.',
    reasonGood: 'الأثر الشهري ضمن حدود الميزانية المتاحة.',
    reasonReview: 'القرار يحتاج مراجعة لأن أثره على الدخل أو السيولة واضح.',
    reasonHigh: 'القرار قد يخفض صافي الميزانية أو يضغط على المدخرات.',
  },
  en: {
    title: 'Is This Decision Suitable?',
    subtitle: 'Analyze a financial action before committing, such as buying a car, taking a loan, starting a project, moving homes, buying an expensive device, investing in an opportunity, or adding a monthly expense.',
    eyebrow: 'Decision analysis',
    newDecision: 'New decision',
    formTitle: 'Decision details',
    titleLabel: 'Decision title',
    titlePlaceholder: 'Example: Buy a car, take a loan, start a project',
    type: 'Decision type',
    cost: 'Estimated cost',
    monthlyImpact: 'Monthly impact',
    benefit: 'Expected benefit',
    riskLevel: 'Risk level',
    targetDate: 'Target date',
    notes: 'Notes',
    analyzeSave: 'Analyze and save decision',
    riskScore: 'Risk score',
    liquidityImpact: 'Liquidity impact',
    monthlyBudgetImpact: 'Monthly budget impact',
    suitableNow: 'Suitable now?',
    mainReason: 'Main reason',
    saferAlternative: 'Safer alternative',
    checklist: '30-day preparation checklist',
    previous: 'Previous decisions',
    noDecisions: 'No previous decisions yet',
    noDecisionsBody: 'Start by analyzing your first financial decision.',
    delete: 'Delete',
    deleted: 'Decision deleted.',
    saved: 'Decision analysis saved.',
    saveFailed: 'Could not save the decision right now. Please try again.',
    validation: 'Enter a decision title and estimated cost.',
    yes: 'Yes',
    no: 'No',
    wait: 'Wait',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    insufficient: 'Add income and expenses for a more accurate analysis.',
    loading: 'Loading decisions center...',
    disclaimer: 'This analysis is educational guidance, not licensed financial or legal advice.',
    alternativeText: 'Reduce the cost or delay the decision 30 days until monthly net improves.',
    reasonGood: 'The monthly impact fits within the available budget.',
    reasonReview: 'The decision needs review because it has a clear income or liquidity impact.',
    reasonHigh: 'The decision may reduce monthly net or pressure savings.',
  },
  fr: {
    title: 'Cette décision est-elle adaptée ?',
    subtitle: 'Analysez une action financière avant de vous engager : acheter une voiture, prendre un prêt, lancer un projet, déménager, acheter un appareil coûteux, investir ou ajouter une dépense mensuelle.',
    eyebrow: 'Analyse de décision',
    newDecision: 'Nouvelle décision',
    formTitle: 'Détails de la décision',
    titleLabel: 'Titre de la décision',
    titlePlaceholder: 'Exemple : acheter une voiture, prendre un prêt, lancer un projet',
    type: 'Type de décision',
    cost: 'Coût estimé',
    monthlyImpact: 'Impact mensuel',
    benefit: 'Bénéfice attendu',
    riskLevel: 'Niveau de risque',
    targetDate: 'Date cible',
    notes: 'Notes',
    analyzeSave: 'Analyser et enregistrer',
    riskScore: 'Score de risque',
    liquidityImpact: 'Impact sur la liquidité',
    monthlyBudgetImpact: 'Impact budget mensuel',
    suitableNow: 'Adapté maintenant ?',
    mainReason: 'Raison principale',
    saferAlternative: 'Alternative plus sûre',
    checklist: 'Checklist de préparation 30 jours',
    previous: 'Décisions précédentes',
    noDecisions: 'Aucune décision précédente',
    noDecisionsBody: 'Commencez par analyser votre première décision financière.',
    delete: 'Supprimer',
    deleted: 'Décision supprimée.',
    saved: 'Analyse de décision enregistrée.',
    saveFailed: 'Impossible d’enregistrer la décision pour le moment. Veuillez réessayer.',
    validation: 'Saisissez un titre et un coût estimé.',
    yes: 'Oui',
    no: 'Non',
    wait: 'Attendre',
    high: 'Élevé',
    medium: 'Moyen',
    low: 'Faible',
    insufficient: 'Ajoutez revenus et dépenses pour une analyse plus précise.',
    loading: 'Chargement du centre des décisions...',
    disclaimer: 'Cette analyse est éducative, pas un conseil financier ou juridique agréé.',
    alternativeText: 'Réduisez le coût ou retardez la décision de 30 jours jusqu’à amélioration du solde mensuel.',
    reasonGood: 'L’impact mensuel reste compatible avec le budget disponible.',
    reasonReview: 'La décision demande une revue car son impact sur revenus ou liquidité est net.',
    reasonHigh: 'La décision peut réduire le solde mensuel ou peser sur l’épargne.',
  },
} as const;

const TYPE_LABELS: Record<DecisionType, Record<Lang, string>> = {
  purchase: { ar: 'شراء كبير', en: 'Large purchase', fr: 'Achat important' },
  investment: { ar: 'استثمار', en: 'Investment', fr: 'Investissement' },
  project: { ar: 'مشروع', en: 'Business/project', fr: 'Projet' },
  debt_saving: { ar: 'قرض أو سداد دين', en: 'Loan or debt payoff', fr: 'Prêt ou dette' },
  charity_zakat: { ar: 'زكاة أو خير', en: 'Zakat or charity', fr: 'Zakat ou charité' },
  budget: { ar: 'قرار ميزانية', en: 'Budget decision', fr: 'Décision budget' },
};

const CHECKLIST = {
  ar: ['راجع المصروفات غير الأساسية.', 'حدّد سقفاً شهرياً للقرار.', 'احتفظ بسيولة طوارئ قبل التنفيذ.', 'أعد التحليل بعد 30 يوماً.'],
  en: ['Review non-essential expenses.', 'Set a monthly cap for the decision.', 'Keep emergency liquidity before acting.', 'Run the analysis again in 30 days.'],
  fr: ['Revoyez les dépenses non essentielles.', 'Fixez un plafond mensuel pour la décision.', 'Gardez une liquidité d’urgence avant d’agir.', 'Relancez l’analyse dans 30 jours.'],
} as const;

const emptyForm = {
  title: '',
  decisionType: 'purchase' as DecisionType,
  amount: '',
  monthlyImpact: '',
  expectedBenefit: '',
  riskLevel: 'medium' as 'low' | 'medium' | 'high',
  targetDate: '',
  notes: '',
};

function numeric(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function validDateOrNull(value?: string | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ''));
}

function riskScore(analysis: DecisionAnalysis | null) {
  if (!analysis?.score && analysis?.score !== 0) return null;
  return Math.max(0, Math.min(100, 100 - analysis.score));
}

function rowTitle(row: DecisionRow) {
  return String(row.decision_title ?? '').trim();
}

function rowRiskScore(row: DecisionRow) {
  const savedScore = Number(row.risk_score);
  if (Number.isFinite(savedScore) && savedScore > 0) return Math.max(0, Math.min(100, savedScore));
  return riskScore(row.analysis ?? null);
}

function rowAnalysis(row: DecisionRow): DecisionAnalysis | null {
  if (row.analysis) return row.analysis;
  const score = Number(row.risk_score);
  if (!Number.isFinite(score)) return null;
  const recommended = row.is_recommended === true;
  return {
    source: 'rules',
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyNet: null,
    savingsTotal: 0,
    investmentsTotal: 0,
    decisionRatio: null,
    netAfterDecision: null,
    savingsAfterDecision: null,
    score: Math.max(0, Math.min(100, 100 - score)),
    status: recommended ? 'initially_suitable' : score >= 70 ? 'high_risk' : score >= 40 ? 'needs_review' : 'insufficient_data',
    missingData: [],
    riskFlags: [],
    scenarios: [],
  };
}

function decisionCost(row: DecisionRow) {
  const cost = Number(row.estimated_cost);
  return Number.isFinite(cost) ? cost : 0;
}

function statusTone(analysis: DecisionAnalysis | null) {
  if (!analysis || analysis.status === 'insufficient_data') return 'warning';
  if (analysis.status === 'high_risk') return 'danger';
  if (analysis.status === 'needs_review') return 'warning';
  return 'good';
}

export default function DecisionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const { currency } = useCurrency();
  const text = TEXT[(lang as Lang) || 'ar'];
  const locale = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  const money = useCallback((value: number) => formatCurrency(value, currency, locale), [currency, locale]);
  const [form, setForm] = useState(emptyForm);
  const [sourceData, setSourceData] = useState<DecisionSourceData | null>(null);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/decisions');
  }, [authLoading, router, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const db = supabase as any;
    const [sources, saved] = await Promise.all([
      loadUserDataTables(db, user.id, SOURCE_TABLES),
      db.from('user_decisions').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    ]);

    const records = sources.records as Record<string, any[]>;
    setSourceData({
      income: personalIncomeRows(records.income ?? []),
      expenses: personalExpenseRows(records.expenses ?? []),
      savings: records.savings ?? [],
      investments: records.investments ?? [],
      goals: records.goals ?? [],
      projects: records.projects ?? [],
      financialModels: records.financialModels ?? [],
      zakatCalculations: records.zakatCalculations ?? [],
      zakatAssets: records.zakatAssets ?? [],
      charityCommitments: records.charityCommitments ?? [],
    });

    if (saved.error) {
      setError(saved.error.message || 'load_error');
      setDecisions([]);
    } else {
      const rows = (saved.data ?? []) as DecisionRow[];
      setDecisions(rows);
      const requested = searchParams?.get('decision');
      setSelectedId(requested && rows.some(row => row.id === requested) ? requested : rows[0]?.id ?? '');
    }
    setLoading(false);
  }, [searchParams, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const draftAnalysis = useMemo(() => {
    if (!sourceData) return null;
    const inputs: DecisionInputs = {
      title: form.title.trim(),
      decisionType: form.decisionType,
      amount: numeric(form.amount),
      currency,
      targetDate: form.targetDate || undefined,
      priority: 'medium',
      notes: form.notes,
      recurringCost: numeric(form.monthlyImpact),
      expectedReturn: 0,
      riskLevel: form.riskLevel,
    };
    return analyzeDecision(inputs, sourceData);
  }, [currency, form, sourceData]);

  const selectedDecision = decisions.find(item => item.id === selectedId) ?? null;
  const visibleAnalysis = selectedDecision ? rowAnalysis(selectedDecision) : draftAnalysis;

  async function saveDecision() {
    if (saving) return;
    if (!user?.id || !sourceData) {
      setError(text.saveFailed);
      if (process.env.NODE_ENV !== 'production') {
        console.error('[FinancialDecisions] Save failed', {
          message: 'Missing authenticated user or source data',
          userId: user?.id,
          hasSourceData: Boolean(sourceData),
        });
      }
      return;
    }
    if (!form.title.trim() || numeric(form.amount) <= 0) {
      setError(text.validation);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    let payload: {
      user_id: string;
      decision_title: string;
      decision_type: string;
      estimated_cost: number;
      monthly_impact: number;
      expected_benefit: string;
      risk_level: string;
      target_date: string | null;
      notes: string | null;
      risk_score: number;
      is_recommended: boolean;
      main_reason: string;
      better_alternative: string;
      action_plan: string[];
      currency: string;
      updated_at: string;
    } | null = null;
    try {
      if (!user?.id) throw new Error('Missing authenticated user');
      if (!isUuid(user.id)) throw new Error('Authenticated user id is not a valid UUID');
      const selectedCurrency = currency || 'KWD';
      const decisionForm = form as typeof form & Record<string, unknown>;
      const inputs: DecisionInputs = {
        title: form.title.trim(),
        decisionType: form.decisionType,
        amount: numeric(form.amount),
        currency: selectedCurrency,
        targetDate: validDateOrNull(form.targetDate) || undefined,
        priority: 'medium',
        notes: form.notes,
        recurringCost: numeric(form.monthlyImpact),
        expectedReturn: 0,
        riskLevel: form.riskLevel,
      };
      const analysis = analyzeDecision(inputs, sourceData);
      const savedRiskScore = riskScore(analysis) ?? 0;
      const recommended = analysis.status === 'initially_suitable';
      const mainReason = analysis.status === 'high_risk'
        ? text.reasonHigh
        : analysis.status === 'needs_review'
          ? text.reasonReview
          : analysis.status === 'insufficient_data'
            ? text.insufficient
            : text.reasonGood;

      payload = {
        user_id: user.id,
        decision_title: String(decisionForm.title || decisionForm.decision_title || '').trim(),
        decision_type: String(decisionForm.decisionType || decisionForm.decision_type || '').trim(),
        estimated_cost: finiteNumber(decisionForm.estimatedCost ?? decisionForm.estimated_cost ?? numeric(form.amount)),
        monthly_impact: finiteNumber(decisionForm.monthlyImpact ?? decisionForm.monthly_impact),
        expected_benefit: String(decisionForm.expectedBenefit ?? decisionForm.expected_benefit ?? ''),
        risk_level: String(decisionForm.riskLevel || decisionForm.risk_level || '').trim(),
        target_date: validDateOrNull(String(decisionForm.targetDate || decisionForm.target_date || '')),
        notes: decisionForm.notes ? String(decisionForm.notes) : null,
        risk_score: finiteNumber(savedRiskScore),
        is_recommended: Boolean(recommended),
        main_reason: mainReason || '',
        better_alternative: text.alternativeText || '',
        action_plan: [...(CHECKLIST[locale] || [])],
        currency: selectedCurrency,
        updated_at: new Date().toISOString(),
      };

      if (!payload.decision_title || !payload.decision_type) {
        throw new Error('Decision title and type are required');
      }

      const { data: savedDecision, error: saveError } = await supabase
        .from('user_decisions')
        .insert(payload)
        .select()
        .single();

      if (saveError) {
        console.error('[FinancialDecisions] Supabase insert response', {
          code: saveError.code,
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint,
          payload,
        });
        throw saveError;
      }

      setForm(emptyForm);
      setMessage(text.saved);
      if (savedDecision) {
        setDecisions(prev => [savedDecision as DecisionRow, ...prev.filter(row => row.id !== savedDecision.id)]);
        setSelectedId(savedDecision.id);
      } else {
        await load();
      }
    } catch (error: any) {
      console.error('[FinancialDecisions] Save failed', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        payload,
      });
      setError(text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDecision(id: string) {
    if (!user) return;
    const { error: deleteError } = await supabase.from('user_decisions').delete().eq('id', id).eq('user_id', user.id);
    if (deleteError) {
      setError(deleteError.message || 'delete_error');
      return;
    }
    setMessage(text.deleted);
    await load();
  }

  const tone = statusTone(visibleAnalysis);
  const score = riskScore(visibleAnalysis);
  const recommendation = visibleAnalysis?.status === 'initially_suitable'
    ? text.yes
    : visibleAnalysis?.status === 'high_risk'
      ? text.no
      : text.wait;
  const reason = !visibleAnalysis || visibleAnalysis.status === 'insufficient_data'
    ? text.insufficient
    : visibleAnalysis.status === 'high_risk'
      ? text.reasonHigh
      : visibleAnalysis.status === 'needs_review'
        ? text.reasonReview
        : text.reasonGood;
  const monthlyImpact = visibleAnalysis?.netAfterDecision === null || visibleAnalysis?.netAfterDecision === undefined
    ? text.insufficient
    : money(visibleAnalysis.netAfterDecision);
  const liquidity = visibleAnalysis?.savingsAfterDecision === null || visibleAnalysis?.savingsAfterDecision === undefined
    ? text.insufficient
    : money(visibleAnalysis.savingsAfterDecision);

  if (authLoading || loading) {
    return (
      <div className="decisions-page" dir={dir}>
        <DashboardPageShell ariaLabel={text.title}>
          <div className="decision-loading"><Loader2 className="spin" size={22} />{text.loading}</div>
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div className="decisions-page" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} contentClassName="decisions-content">
        <PageHero eyebrow={text.eyebrow} title={text.title} subtitle={text.subtitle} icon={<Landmark size={28} />} />

        {(message || error) && <div className={`decision-message ${error ? 'error' : ''}`}>{error || message}</div>}

        <section className="decision-layout">
          <article className="decision-card">
            <div className="decision-card-head">
              <Plus size={19} />
              <h2>{text.formTitle}</h2>
            </div>
            <div className="decision-form-grid">
              <label>
                <span>{text.titleLabel}</span>
                <input value={form.title} placeholder={text.titlePlaceholder} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} />
              </label>
              <label>
                <span>{text.type}</span>
                <select value={form.decisionType} onChange={event => setForm(prev => ({ ...prev, decisionType: event.target.value as DecisionType }))}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label[lang as Lang]}</option>)}
                </select>
              </label>
              <label>
                <span>{text.cost}</span>
                <input inputMode="decimal" value={form.amount} onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))} />
              </label>
              <label>
                <span>{text.monthlyImpact}</span>
                <input inputMode="decimal" value={form.monthlyImpact} onChange={event => setForm(prev => ({ ...prev, monthlyImpact: event.target.value }))} />
              </label>
              <label>
                <span>{text.benefit}</span>
                <div className="decision-benefit-shell">
                  <input className="decision-benefit-input" inputMode="decimal" value={form.expectedBenefit} onChange={event => setForm(prev => ({ ...prev, expectedBenefit: event.target.value }))} />
                  <span className="decision-benefit-suffix">%</span>
                </div>
              </label>
              <label>
                <span>{text.riskLevel}</span>
                <select value={form.riskLevel} onChange={event => setForm(prev => ({ ...prev, riskLevel: event.target.value as 'low' | 'medium' | 'high' }))}>
                  <option value="low">{text.low}</option>
                  <option value="medium">{text.medium}</option>
                  <option value="high">{text.high}</option>
                </select>
              </label>
              <label>
                <span>{text.targetDate}</span>
                <input type="date" value={form.targetDate} onChange={event => setForm(prev => ({ ...prev, targetDate: event.target.value }))} />
              </label>
              <label className="wide">
                <span>{text.notes}</span>
                <textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} rows={4} />
              </label>
            </div>
            <button className="decision-primary" type="button" onClick={saveDecision} disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              {text.analyzeSave}
            </button>
          </article>

          <article className={`decision-card analysis ${tone}`}>
            <div className="decision-card-head">
              <ShieldAlert size={19} />
              <h2>{text.riskScore}</h2>
            </div>
            <div className="risk-meter">
              <strong>{score === null ? '--' : `${score}%`}</strong>
              <span>{text.riskScore}</span>
            </div>
            <div className="decision-metrics">
              <Metric label={text.liquidityImpact} value={liquidity} />
              <Metric label={text.monthlyBudgetImpact} value={monthlyImpact} />
              <Metric label={text.suitableNow} value={recommendation} />
            </div>
            <div className="decision-reason">
              <b>{text.mainReason}</b>
              <p>{reason}</p>
            </div>
            <div className="decision-reason">
              <b>{text.saferAlternative}</b>
              <p>{text.alternativeText}</p>
            </div>
            <div className="decision-reason">
              <b>{text.checklist}</b>
              <ul>{CHECKLIST[lang as Lang].map(item => <li key={item}><CheckCircle2 size={14} />{item}</li>)}</ul>
            </div>
            <p className="decision-disclaimer">{text.disclaimer}</p>
          </article>
        </section>

        <section className="decision-card">
          <div className="decision-card-head">
            <ClipboardCheck size={19} />
            <h2>{text.previous}</h2>
          </div>
          {decisions.length === 0 ? (
            <div className="decision-empty">
              <CalendarDays size={24} />
              <strong>{text.noDecisions}</strong>
              <span>{text.noDecisionsBody}</span>
            </div>
          ) : (
            <div className="decision-list">
              {decisions.map(item => {
                const itemScore = rowRiskScore(item);
                const active = item.id === selectedId;
                const title = rowTitle(item);
                const createdAt = item.created_at ? formatDate(item.created_at, locale) : '';
                const targetDate = item.target_date ? formatDate(item.target_date, locale) : '';
                const benefit = String(item.expected_benefit ?? '').trim();
                const riskLabel = item.risk_level === 'low'
                  ? text.low
                  : item.risk_level === 'high'
                    ? text.high
                    : item.risk_level === 'medium'
                      ? text.medium
                      : item.risk_level || text.medium;
                return (
                  <article key={item.id} className={`decision-row ${active ? 'active' : ''}`}>
                    <button type="button" onClick={() => setSelectedId(item.id)}>
                      <strong>{title}</strong>
                      <span>{TYPE_LABELS[item.decision_type]?.[locale] ?? item.decision_type} · {money(decisionCost(item))}</span>
                      <span>
                        {text.monthlyImpact}: {money(Number(item.monthly_impact || 0))}
                        {' · '}
                        {text.riskLevel}: {riskLabel}
                      </span>
                      <span>
                        {benefit ? `${text.benefit}: ${benefit} · ` : ''}
                        {targetDate ? `${text.targetDate}: ${targetDate} · ` : ''}
                        {createdAt}
                      </span>
                    </button>
                    <em>{itemScore === null ? '--' : `${itemScore}%`}</em>
                    <button type="button" className="delete" onClick={() => deleteDecision(item.id)} aria-label={`${text.delete}: ${title}`}>
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </DashboardPageShell>

      <style jsx global>{`
        .decisions-page{width:100%;min-width:0;color:var(--foreground);font-family:var(--font-ui)}.decisions-content{display:grid;gap:16px}.decision-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:16px;align-items:start}.decision-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;box-shadow:var(--shadow-card);min-width:0}.decision-card-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:var(--primary)}.decision-card-head h2{margin:0;color:var(--foreground);font-size:19px;font-weight:600}.decision-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.decision-form-grid label{display:grid;gap:7px;min-width:0}.decision-form-grid .wide{grid-column:1/-1}.decision-form-grid>label>span{color:var(--foreground-muted);font-weight:500}.decision-form-grid input,.decision-form-grid select,.decision-form-grid textarea{width:100%;min-width:0;border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground);border-radius:var(--radius-control);padding:11px 12px;font-family:var(--font-ui);font-weight:400;outline:none}.decision-form-grid input[inputmode="decimal"]{font-family:var(--font-data)}.decision-form-grid input:focus-visible,.decision-form-grid select:focus-visible,.decision-form-grid textarea:focus-visible{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}.decision-benefit-shell{display:flex;align-items:center;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);overflow:hidden}.decision-benefit-shell:focus-within{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}.decision-form-grid .decision-benefit-input{flex:1;border:0;background:transparent;padding:11px 12px;box-shadow:none}.decision-form-grid .decision-benefit-suffix{min-height:44px;display:flex;align-items:center;padding:0 12px;border-inline-start:1px solid var(--border);color:var(--foreground-muted);font-family:var(--font-data);font-weight:500}.decision-primary{margin-top:14px;min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-ui);font-weight:600;cursor:pointer}.decision-primary:hover:not(:disabled){border-color:var(--primary-hover);background:var(--primary-hover)}.decision-primary:disabled{opacity:.65;cursor:not-allowed}.risk-meter{height:150px;border:1px solid var(--primary);border-radius:var(--radius-panel);background:var(--primary-soft);display:grid;place-items:center;text-align:center;color:var(--foreground);margin-bottom:12px}.risk-meter strong{display:block;color:var(--primary);font-family:var(--font-data);font-size:42px;font-weight:600}.risk-meter span{display:block;color:var(--foreground-secondary);font-weight:500}.decision-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.decision-metric{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px}.decision-metric span{display:block;color:var(--foreground-muted);font-size:12px;font-weight:500}.decision-metric strong{display:block;margin-top:6px;color:var(--foreground);font-family:var(--font-data);font-size:16px;font-weight:600;overflow-wrap:anywhere}.decision-reason{margin-top:12px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px}.decision-reason b{display:block;color:var(--foreground);margin-bottom:6px;font-weight:600}.decision-reason p{margin:0;color:var(--foreground-muted);line-height:1.7;font-weight:400}.decision-reason ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}.decision-reason li{display:flex;align-items:flex-start;gap:7px;color:var(--foreground-muted);font-weight:400}.decision-reason li svg{color:var(--success);flex:0 0 auto;margin-top:2px}.decision-disclaimer{margin:12px 0 0;color:var(--foreground-muted);font-size:12px;font-weight:400;line-height:1.7}.decision-message{border:1px solid var(--success);background:var(--success-soft);color:var(--success);border-radius:var(--radius-card);padding:12px 14px;font-weight:500}.decision-message.error{border-color:var(--danger);background:var(--danger-soft);color:var(--danger)}.decision-empty{min-height:130px;display:grid;place-items:center;text-align:center;color:var(--foreground-muted);font-weight:500;border:1px dashed var(--border-strong);border-radius:var(--radius-card);background:var(--surface-muted)}.decision-list{display:grid;gap:9px}.decision-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);padding:8px}.decision-row.active{border-color:var(--primary);box-shadow:var(--focus-shadow)}.decision-row button{border:0;background:transparent;color:var(--foreground);font-family:var(--font-ui);text-align:start;cursor:pointer}.decision-row button strong,.decision-row button span{display:block}.decision-row button strong{font-weight:600}.decision-row button span{color:var(--foreground-muted);font-size:12px;font-weight:400;margin-top:4px}.decision-row em{font-style:normal;border-radius:var(--radius-pill);background:var(--primary-soft);color:var(--primary-hover);padding:6px 9px;font-family:var(--font-data);font-size:12px;font-weight:600}.decision-row .delete{width:34px;height:34px;display:grid;place-items:center;color:var(--danger);border-radius:var(--radius-control)}.decision-row .delete:hover{background:var(--danger-soft)}.decision-primary:focus-visible,.decision-row button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}.decision-loading{min-height:260px;display:grid;place-items:center;color:var(--foreground-muted);font-weight:500}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.analysis.good{border-color:var(--success)}.analysis.warning{border-color:var(--warning)}.analysis.danger{border-color:var(--danger)}@media(max-width:1180px){.decision-layout{grid-template-columns:1fr}.decision-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.decision-card{padding:16px}.decision-form-grid,.decision-metrics{grid-template-columns:1fr}.decision-primary{width:100%}.decision-row{grid-template-columns:1fr auto}.decision-row .delete{grid-column:2}.risk-meter{height:130px}}@media(prefers-reduced-motion:reduce){.spin{animation:none}}
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="decision-metric"><span>{label}</span><strong>{value}</strong></div>;
}
