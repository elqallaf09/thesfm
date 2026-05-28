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
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { formatCurrency } from '@/lib/format';
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
  title: string;
  decision_type: DecisionType;
  amount: number;
  currency: string;
  target_date: string | null;
  priority: DecisionPriority;
  inputs: Record<string, unknown> | null;
  analysis: DecisionAnalysis | null;
  status: string;
  created_at: string;
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
    title: 'مركز القرارات المالية',
    subtitle: 'اختبر أثر القرار على السيولة والميزانية والمخاطر قبل تنفيذه، بناءً على بياناتك الحقيقية فقط.',
    eyebrow: 'تحليل قرارات',
    newDecision: 'قرار جديد',
    formTitle: 'بيانات القرار',
    titleLabel: 'عنوان القرار',
    titlePlaceholder: 'مثال: شراء سيارة',
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
    noDecisions: 'لا توجد قرارات محفوظة بعد.',
    delete: 'حذف',
    deleted: 'تم حذف القرار.',
    saved: 'تم حفظ تحليل القرار.',
    validation: 'أدخل عنوان القرار والتكلفة التقديرية.',
    yes: 'نعم',
    no: 'لا',
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
    title: 'Financial Decisions Center',
    subtitle: 'Test the impact of a decision on liquidity, budget, and risk before acting, using only your real data.',
    eyebrow: 'Decision analysis',
    newDecision: 'New decision',
    formTitle: 'Decision details',
    titleLabel: 'Decision title',
    titlePlaceholder: 'Example: Buy a car',
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
    noDecisions: 'No saved decisions yet.',
    delete: 'Delete',
    deleted: 'Decision deleted.',
    saved: 'Decision analysis saved.',
    validation: 'Enter a decision title and estimated cost.',
    yes: 'Yes',
    no: 'No',
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
    title: 'Centre des décisions financières',
    subtitle: 'Testez l’impact d’une décision sur la liquidité, le budget et le risque avant d’agir, avec vos données réelles uniquement.',
    eyebrow: 'Analyse de décision',
    newDecision: 'Nouvelle décision',
    formTitle: 'Détails de la décision',
    titleLabel: 'Titre de la décision',
    titlePlaceholder: 'Exemple : acheter une voiture',
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
    noDecisions: 'Aucune décision enregistrée.',
    delete: 'Supprimer',
    deleted: 'Décision supprimée.',
    saved: 'Analyse de décision enregistrée.',
    validation: 'Saisissez un titre et un coût estimé.',
    yes: 'Oui',
    no: 'Non',
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

function riskScore(analysis: DecisionAnalysis | null) {
  if (!analysis?.score && analysis?.score !== 0) return null;
  return Math.max(0, Math.min(100, 100 - analysis.score));
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
      db.from('user_decisions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
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
      const requested = searchParams.get('decision');
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
      expectedReturn: numeric(form.expectedBenefit),
      riskLevel: form.riskLevel,
    };
    return analyzeDecision(inputs, sourceData);
  }, [currency, form, sourceData]);

  const selectedDecision = decisions.find(item => item.id === selectedId) ?? null;
  const visibleAnalysis = selectedDecision?.analysis ?? draftAnalysis;

  async function saveDecision() {
    if (!user || !sourceData) return;
    if (!form.title.trim() || numeric(form.amount) <= 0) {
      setError(text.validation);
      return;
    }
    setSaving(true);
    setError('');
    const inputs: DecisionInputs = {
      title: form.title.trim(),
      decisionType: form.decisionType,
      amount: numeric(form.amount),
      currency,
      targetDate: form.targetDate || undefined,
      priority: 'medium',
      notes: form.notes,
      recurringCost: numeric(form.monthlyImpact),
      expectedReturn: numeric(form.expectedBenefit),
      riskLevel: form.riskLevel,
    };
    const analysis = analyzeDecision(inputs, sourceData);
    const { error: saveError } = await (supabase as any).from('user_decisions').insert({
      user_id: user.id,
      title: inputs.title,
      decision_type: inputs.decisionType,
      amount: inputs.amount,
      currency,
      target_date: inputs.targetDate ?? null,
      priority: inputs.priority,
      inputs,
      analysis,
      status: 'analyzed',
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message || 'save_error');
      return;
    }
    setForm(emptyForm);
    setMessage(text.saved);
    await load();
  }

  async function deleteDecision(id: string) {
    const { error: deleteError } = await (supabase as any).from('user_decisions').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message || 'delete_error');
      return;
    }
    setMessage(text.deleted);
    await load();
  }

  const tone = statusTone(visibleAnalysis);
  const score = riskScore(visibleAnalysis);
  const suitable = visibleAnalysis?.status === 'initially_suitable';
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
        <Sidebar />
        <DashboardPageShell ariaLabel={text.title}>
          <div className="decision-loading"><Loader2 className="spin" size={22} />{text.loading}</div>
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div className="decisions-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="decisions-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>
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
                <input inputMode="decimal" value={form.expectedBenefit} onChange={event => setForm(prev => ({ ...prev, expectedBenefit: event.target.value }))} />
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
              <Metric label={text.suitableNow} value={suitable ? text.yes : text.no} />
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
          {decisions.length === 0 ? <div className="decision-empty"><CalendarDays size={24} />{text.noDecisions}</div> : (
            <div className="decision-list">
              {decisions.map(item => {
                const itemScore = riskScore(item.analysis);
                const active = item.id === selectedId;
                return (
                  <article key={item.id} className={`decision-row ${active ? 'active' : ''}`}>
                    <button type="button" onClick={() => setSelectedId(item.id)}>
                      <strong>{item.title}</strong>
                      <span>{TYPE_LABELS[item.decision_type]?.[lang as Lang] ?? item.decision_type} · {money(Number(item.amount || 0))}</span>
                    </button>
                    <em>{itemScore === null ? '--' : `${itemScore}%`}</em>
                    <button type="button" className="delete" onClick={() => deleteDecision(item.id)} aria-label={`${text.delete}: ${item.title}`}>
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
        .decisions-page{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif}.decisions-content{display:grid;gap:16px}.decision-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:16px;align-items:start}.decision-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:22px;padding:18px;box-shadow:0 14px 34px rgba(3,18,37,.07);min-width:0}.decision-card-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:var(--sfm-primary)}.decision-card-head h2{margin:0;color:var(--sfm-midnight);font-size:19px}.decision-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.decision-form-grid label{display:grid;gap:7px;min-width:0}.decision-form-grid .wide{grid-column:1/-1}.decision-form-grid span{color:var(--sfm-muted);font-weight:900}.decision-form-grid input,.decision-form-grid select,.decision-form-grid textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:850;outline:none}.decision-form-grid input:focus,.decision-form-grid select:focus,.decision-form-grid textarea:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15)}.decision-primary{margin-top:14px;min-height:44px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer}.decision-primary:disabled{opacity:.65;cursor:not-allowed}.risk-meter{height:150px;border-radius:22px;background:radial-gradient(circle at 50% 35%,rgba(167,243,240,.25),transparent 40%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark));display:grid;place-items:center;text-align:center;color:#fff;margin-bottom:12px}.risk-meter strong{display:block;color:var(--sfm-soft-cyan);font-size:42px}.risk-meter span{display:block;font-weight:900}.decision-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.decision-metric{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.decision-metric span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900}.decision-metric strong{display:block;margin-top:6px;color:var(--sfm-primary-dark);font-size:16px;overflow-wrap:anywhere}.decision-reason{margin-top:12px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.decision-reason b{display:block;color:var(--sfm-midnight);margin-bottom:6px}.decision-reason p{margin:0;color:var(--sfm-muted);line-height:1.7;font-weight:850}.decision-reason ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}.decision-reason li{display:flex;align-items:flex-start;gap:7px;color:var(--sfm-muted);font-weight:850}.decision-reason li svg{color:#047857;flex:0 0 auto;margin-top:2px}.decision-disclaimer{margin:12px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.7}.decision-message{border:1px solid rgba(34,197,94,.18);background:#ECFDF5;color:#047857;border-radius:16px;padding:12px 14px;font-weight:900}.decision-message.error{border-color:rgba(239,68,68,.2);background:#FEF2F2;color:#B91C1C}.decision-empty{min-height:130px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);font-weight:900;border:1px dashed rgba(29,140,255,.22);border-radius:16px;background:var(--sfm-light-card)}.decision-list{display:grid;gap:9px}.decision-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;border:1px solid rgba(29,140,255,.12);border-radius:16px;background:var(--sfm-light-card);padding:8px}.decision-row.active{border-color:rgba(24,212,212,.38);box-shadow:0 0 0 3px rgba(24,212,212,.12)}.decision-row button{border:0;background:transparent;color:var(--sfm-midnight);font-family:inherit;text-align:start;cursor:pointer}.decision-row button strong,.decision-row button span{display:block}.decision-row button span{color:var(--sfm-muted);font-size:12px;font-weight:900;margin-top:4px}.decision-row em{font-style:normal;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:6px 9px;font-size:12px;font-weight:950}.decision-row .delete{width:34px;height:34px;display:grid;place-items:center;color:#B91C1C;border-radius:11px}.decision-row .delete:hover{background:#FEF2F2}.decision-loading{min-height:260px;display:grid;place-items:center;color:var(--sfm-muted);font-weight:900}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.analysis.good{border-color:rgba(34,197,94,.22)}.analysis.warning{border-color:rgba(245,158,11,.25)}.analysis.danger{border-color:rgba(239,68,68,.25)}@media(max-width:1180px){.decision-layout{grid-template-columns:1fr}.decision-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.decision-card{padding:16px}.decision-form-grid,.decision-metrics{grid-template-columns:1fr}.decision-primary{width:100%}.decision-row{grid-template-columns:1fr auto}.decision-row .delete{grid-column:2}.risk-meter{height:130px}}
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="decision-metric"><span>{label}</span><strong>{value}</strong></div>;
}

