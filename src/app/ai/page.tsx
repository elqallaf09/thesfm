'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  Brain,
  CalendarClock,
  Download,
  Goal,
  LineChart as LineChartIcon,
  MessageCircle,
  PiggyBank,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { useCurrency } from '@/lib/useCurrency';

type MoneyRow = { id: string; name: string; amount: number; createdAt?: string };
type IncomeRow = { id: string; label: string; category: string; amount: number };
type GoalRow = {
  id: string;
  name: string;
  target: number;
  current: number;
  monthly: number;
  deadline?: string;
};
type Severity = 'good' | 'warning' | 'danger';
type Lang = 'ar' | 'en' | 'fr';
type AiText = Record<Lang, string>;
type FinancialTotals = {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  charity: number;
  goalTarget: number;
  goalCurrent: number;
  expenseRatio: number;
  savingRatio: number;
  investRatio: number;
  goalRatio: number;
  surplus: number;
};

const palette = ['var(--sfm-soft-cyan)', 'var(--sfm-muted)', 'var(--sfm-muted)', '#22C55E', '#3B82F6', '#BFB5A8'];

const copy = {
  badge: { ar: 'مستشار مالي يعمل على بياناتك', en: 'Advisor powered by your data', fr: 'Conseiller basé sur vos données' },
  title: { ar: 'تقريرك المالي الذكي', en: 'AI Financial Report', fr: 'Rapport financier intelligent' },
  subtitle: { ar: 'تحليل عملي بالأرقام للدخل، المصروفات، الادخار، الاستثمار، والأهداف.', en: 'Number-based analysis across income, expenses, savings, investments, and goals.', fr: 'Analyse chiffrée des revenus, dépenses, épargne, investissements et objectifs.' },
  analyze: { ar: 'حلل وضعي المالي الآن', en: 'Analyze my financial situation', fr: 'Analyser ma situation financière' },
  monthlyPlan: { ar: 'اعطني خطة شهرية', en: 'Give me a monthly plan', fr: 'Me donner un plan mensuel' },
  predict: { ar: 'توقع الشهر القادم', en: 'Predict next month', fr: 'Prévoir le mois prochain' },
  addData: { ar: 'أضف الدخل والمصروفات أولاً حتى يظهر التحليل الذكي بالأرقام.', en: 'Add income and expenses first to unlock number-based AI analysis.', fr: "Ajoutez d'abord revenus et dépenses pour activer l'analyse chiffrée." },
  scoreBreakdown: { ar: 'تفصيل الدرجة الذكية', en: 'Smart Score Breakdown', fr: 'Détail du score intelligent' },
  smartAlerts: { ar: 'أهم التنبيهات الذكية', en: 'Smart Alerts', fr: 'Alertes intelligentes' },
  actionPlan: { ar: 'خطة الذكاء الاصطناعي لهذا الشهر', en: 'AI Action Plan for This Month', fr: "Plan d'action IA pour ce mois" },
  planSummary: { ar: 'بتطبيق هذه الخطة، تقدر توفر تقريباً {amount} هذا الشهر.', en: 'By applying this plan, you can save about {amount} this month.', fr: 'En appliquant ce plan, vous pouvez économiser environ {amount} ce mois-ci.' },
  advisor: { ar: 'اسأل المستشار المالي الذكي', en: 'Ask the AI Financial Advisor', fr: 'Demander au conseiller financier IA' },
  chatPlaceholder: { ar: 'اكتب سؤالك المالي...', en: 'Type your financial question...', fr: 'Écrivez votre question financière...' },
  send: { ar: 'إرسال', en: 'Send', fr: 'Envoyer' },
  health: { ar: 'مؤشرات الصحة المالية', en: 'Financial Health Indicators', fr: 'Indicateurs de santé financière' },
  comparison: { ar: 'مقارنة الأشهر', en: 'Monthly Comparison', fr: 'Comparaison mensuelle' },
  notEnough: { ar: 'لا توجد بيانات كافية للمقارنة. أضف بيانات شهرين على الأقل لعرض المقارنة.', en: 'Not enough data for comparison. Add at least two months of data.', fr: 'Données insuffisantes. Ajoutez au moins deux mois de données.' },
  nextMonth: { ar: 'توقع الشهر القادم', en: 'Next Month Prediction', fr: 'Prévision du mois prochain' },
  goals: { ar: 'تحليل الأهداف بالذكاء الاصطناعي', en: 'AI Goal Achievement Analysis', fr: "Analyse IA des objectifs" },
  charts: { ar: 'رسوم داعمة للتحليل', en: 'Supporting Charts', fr: "Graphiques d'appui" },
  quickActions: { ar: 'إجراءات سريعة', en: 'Quick Actions', fr: 'Actions rapides' },
  exportPdf: { ar: 'تصدير تقرير الذكاء الاصطناعي PDF', en: 'Export AI Report PDF', fr: 'Exporter le rapport IA en PDF' },
  exportReady: { ar: 'سيتم فتح نافذة الطباعة لحفظ التقرير كـ PDF.', en: 'The print dialog will open so you can save the report as PDF.', fr: "La fenêtre d'impression va s'ouvrir pour enregistrer le rapport en PDF." },
  refresh: { ar: 'تحديث التحليل', en: 'Refresh analysis', fr: "Actualiser l'analyse" },
  income: { ar: 'الدخل', en: 'Income', fr: 'Revenus' },
  expenses: { ar: 'المصروفات', en: 'Expenses', fr: 'Dépenses' },
  savings: { ar: 'الادخار', en: 'Savings', fr: 'Épargne' },
  investments: { ar: 'الاستثمار', en: 'Investment', fr: 'Investissement' },
  goalsLabel: { ar: 'الأهداف', en: 'Goals', fr: 'Objectifs' },
  commitment: { ar: 'الالتزام بالخطة', en: 'Plan commitment', fr: 'Respect du plan' },
  good: { ar: 'جيد', en: 'Good', fr: 'Bon' },
  warning: { ar: 'تنبيه', en: 'Alert', fr: 'Alerte' },
  danger: { ar: 'خطر', en: 'Risk', fr: 'Risque' },
  excellent: { ar: 'ممتاز', en: 'Excellent', fr: 'Excellent' },
  average: { ar: 'متوسط', en: 'Average', fr: 'Moyen' },
  needs: { ar: 'يحتاج تحسين', en: 'Needs improvement', fr: 'À améliorer' },
  current: { ar: 'الحالي', en: 'Current', fr: 'Actuel' },
  recommended: { ar: 'المقترح', en: 'Recommended', fr: 'Recommandé' },
  save: { ar: 'التوفير', en: 'Save', fr: 'Économie' },
  expectedIncome: { ar: 'الدخل المتوقع', en: 'Expected income', fr: 'Revenus attendus' },
  expectedExpenses: { ar: 'المصروفات المتوقعة', en: 'Expected expenses', fr: 'Dépenses attendues' },
  expectedSavings: { ar: 'الادخار المتوقع', en: 'Expected savings', fr: 'Épargne attendue' },
  expectedInvestment: { ar: 'الاستثمار المتوقع', en: 'Expected investment', fr: 'Investissement attendu' },
  expectedScore: { ar: 'الدرجة المتوقعة', en: 'Expected score', fr: 'Score attendu' },
  addExpense: { ar: 'إضافة مصروف', en: 'Add expense', fr: 'Ajouter une dépense' },
  addIncome: { ar: 'إضافة دخل', en: 'Add income', fr: 'Ajouter un revenu' },
  addInvestment: { ar: 'إضافة استثمار', en: 'Add investment', fr: 'Ajouter un investissement' },
  addGoal: { ar: 'إضافة هدف', en: 'Add goal', fr: 'Ajouter un objectif' },
  noGoals: { ar: 'لا توجد أهداف مالية بعد. أضف هدفاً حتى يحلل المستشار واقعيته.', en: 'No financial goals yet. Add a goal so the advisor can evaluate it.', fr: "Aucun objectif financier. Ajoutez-en un pour l'évaluer." },
  noCharts: { ar: 'أضف بيانات مالية لعرض الرسوم التحليلية.', en: 'Add financial data to show analytical charts.', fr: 'Ajoutez des données financières pour afficher les graphiques.' },
};

const questions = {
  ar: ['شلون أوفر 200 د.ك هذا الشهر؟', 'شنو أكثر تصنيف أصرف عليه؟', 'هل استثماري مناسب لدخلي؟', 'متى أوصل لهدفي؟', 'اعطني خطة 70/20/10'],
  en: ['How can I save 200 this month?', 'Which category do I spend on most?', 'Is my investment suitable for my income?', 'When will I reach my goal?', 'Give me a 70/20/10 plan'],
  fr: ['Comment économiser 200 ce mois-ci ?', 'Quelle catégorie coûte le plus ?', 'Mon investissement convient-il à mes revenus ?', 'Quand atteindrai-je mon objectif ?', 'Donnez-moi un plan 70/20/10'],
};

function tx(text: AiText, lang: Lang) {
  return text[lang] || text.ar;
}

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function parseNotes(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function monthsUntil(date?: string) {
  if (!date) return 0;
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return 0;
  const now = new Date();
  return Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth());
}

function scoreStatus(score: number): keyof typeof copy {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'average';
  if (score >= 35) return 'needs';
  return 'danger';
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function AiPage() {
  const router = useRouter();
  const { user, isGuest, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const { currency } = useCurrency();
  const locale = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [expenses, setExpenses] = useState<MoneyRow[]>([]);
  const [savings, setSavings] = useState<MoneyRow[]>([]);
  const [investments, setInvestments] = useState<MoneyRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');

  const L = useCallback((key: keyof typeof copy) => tx(copy[key], lang), [lang]);
  const money = useCallback((value: number) => formatCurrency(value, currency, locale), [currency, locale]);

  useEffect(() => {
    if (!loading && !user && !isGuest) router.push('/login');
  }, [isGuest, loading, router, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (loading) return;
      setIsLoading(true);

      if (isGuest || !user) {
        const read = <T,>(key: string, fallback: T): T => {
          try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) as T : fallback;
          } catch {
            return fallback;
          }
        };
        const guestIncome = read<IncomeRow[]>('sfm_guest_income', []);
        const guestExpenses = read<MoneyRow[]>('sfm_guest_expenses', []);
        const guestSavings = read<MoneyRow[]>('sfm_guest_savings', []);
        const guestInvest = read<MoneyRow[]>('sfm_guest_invest', []);
        const guestGoals = read<GoalRow[]>('sfm_guest_goals', []);
        if (!cancelled) {
          setIncome(guestIncome.map(row => ({ ...row, amount: amount(row.amount) })));
          setExpenses(guestExpenses.map(row => ({ ...row, amount: amount(row.amount), createdAt: row.createdAt })));
          setSavings(guestSavings.map(row => ({ ...row, amount: amount(row.amount) })));
          setInvestments(guestInvest.map(row => ({ ...row, amount: amount(row.amount) })));
          setGoals(guestGoals);
          setIsLoading(false);
        }
        return;
      }

      const [incomeRes, expenseRes, savingRes, investRes, goalRes] = await Promise.all([
        supabase.from('monthly_income_sources').select('*').eq('user_id', user.id),
        supabase.from('expense_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('savings_items').select('*').eq('user_id', user.id),
        supabase.from('investment_items').select('*').eq('user_id', user.id),
        supabase.from('financial_goals').select('*').eq('user_id', user.id),
      ]);

      if (cancelled) return;
      setIncome((incomeRes.data ?? []).map(row => ({
        id: text(row.id),
        label: text(row.label || row.name),
        category: text(row.category),
        amount: amount(row.amount),
      })));
      setExpenses((expenseRes.data ?? []).map(row => ({
        id: text(row.id),
        name: text(row.name),
        amount: amount(row.amount),
        createdAt: text(row.created_at),
      })));
      setSavings((savingRes.data ?? []).map(row => ({ id: text(row.id), name: text(row.name), amount: amount(row.amount) })));
      setInvestments((investRes.data ?? []).map(row => ({ id: text(row.id), name: text(row.name), amount: amount(row.current_value || row.amount) })));
      setGoals((goalRes.data ?? []).map(row => {
        const notes = parseNotes(row.notes);
        return {
          id: text(row.id),
          name: text(row.name || row.goal),
          target: amount(row.target_amount || row.amount),
          current: amount(row.current_amount || notes.currentAmount),
          monthly: amount(row.monthly_contribution || notes.monthlyContribution),
          deadline: text(row.deadline || notes.deadline),
        };
      }));
      setIsLoading(false);
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [isGuest, loading, user]);

  const totals = useMemo(() => {
    const totalIncome = income.reduce((sum, row) => sum + row.amount, 0);
    const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);
    const totalSavings = savings.reduce((sum, row) => sum + row.amount, 0);
    const totalInvestments = investments.reduce((sum, row) => sum + row.amount, 0);
    const charity = expenses.filter(row => row.name.startsWith('خيرية:')).reduce((sum, row) => sum + row.amount, 0);
    const goalTarget = goals.reduce((sum, row) => sum + row.target, 0);
    const goalCurrent = goals.reduce((sum, row) => sum + row.current, 0);
    const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 0;
    const savingRatio = totalIncome > 0 ? totalSavings / totalIncome : 0;
    const investRatio = totalIncome > 0 ? totalInvestments / totalIncome : 0;
    const goalRatio = goalTarget > 0 ? goalCurrent / goalTarget : 0;
    const surplus = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, totalSavings, totalInvestments, charity, goalTarget, goalCurrent, expenseRatio, savingRatio, investRatio, goalRatio, surplus };
  }, [expenses, goals, income, investments, savings]);

  const categoryTotals = useMemo(() => {
    const groups: Record<string, number> = {};
    expenses.forEach(item => {
      const name = item.name;
      let category = lang === 'ar' ? 'أخرى' : lang === 'fr' ? 'Autre' : 'Other';
      if (name.startsWith('خيرية:')) category = lang === 'ar' ? 'خيرية' : lang === 'fr' ? 'Charité' : 'Charity';
      else if (/مطعم|طعام|أكل|food|restaurant/i.test(name)) category = lang === 'ar' ? 'المطاعم والطعام' : lang === 'fr' ? 'Restaurants et alimentation' : 'Food and restaurants';
      else if (/تسوق|ملابس|shopping/i.test(name)) category = lang === 'ar' ? 'التسوق' : lang === 'fr' ? 'Achats' : 'Shopping';
      else if (/سكن|إيجار|منزل|rent|home/i.test(name)) category = lang === 'ar' ? 'السكن' : lang === 'fr' ? 'Logement' : 'Housing';
      else if (/سيارة|بنزين|مواصلات|transport|fuel/i.test(name)) category = lang === 'ar' ? 'المواصلات' : lang === 'fr' ? 'Transport' : 'Transport';
      groups[category] = (groups[category] || 0) + item.amount;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, value], index) => ({ name, value, color: palette[index % palette.length] }));
  }, [expenses, lang]);

  const scoreParts = useMemo(() => {
    const expenseScore = totals.totalIncome > 0 ? clamp(100 - Math.max(0, totals.expenseRatio - 0.55) * 180) : 0;
    const savingScore = totals.totalIncome > 0 ? clamp((totals.savingRatio / 0.2) * 100) : 0;
    const investmentScore = totals.totalIncome > 0 ? clamp((totals.investRatio / 0.25) * 100) : (totals.totalInvestments > 0 ? 65 : 0);
    const goalScore = goals.length > 0 ? clamp(totals.goalRatio * 100) : 0;
    const commitmentScore = clamp((expenseScore * 0.45) + (savingScore * 0.25) + (investmentScore * 0.2) + (goalScore * 0.1));
    return [
      { key: 'expenses', title: L('expenses'), score: expenseScore, reason: ratioReason('expenses', totals.expenseRatio, totals.totalExpenses, totals.totalIncome, lang, money) },
      { key: 'savings', title: L('savings'), score: savingScore, reason: ratioReason('savings', totals.savingRatio, totals.totalSavings, totals.totalIncome, lang, money) },
      { key: 'investments', title: L('investments'), score: investmentScore, reason: ratioReason('investments', totals.investRatio, totals.totalInvestments, totals.totalIncome, lang, money) },
      { key: 'goals', title: L('goalsLabel'), score: goalScore, reason: goalReason(goals.length, totals.goalRatio, totals.goalCurrent, totals.goalTarget, lang, money) },
      { key: 'commitment', title: L('commitment'), score: commitmentScore, reason: commitmentReason(totals.surplus, totals.totalIncome, lang, money) },
    ];
  }, [L, goals.length, lang, money, totals]);

  const score = useMemo(() => clamp(scoreParts.reduce((sum, part) => sum + part.score, 0) / scoreParts.length), [scoreParts]);
  const hasCoreData = totals.totalIncome > 0 || totals.totalExpenses > 0 || totals.totalInvestments > 0 || totals.totalSavings > 0;
  const topExpense = categoryTotals[0];
  const recommendedExpenseLimit = totals.totalIncome > 0 ? totals.totalIncome * 0.65 : totals.totalExpenses * 0.9;
  const reduceAmount = Math.max(0, totals.totalExpenses - recommendedExpenseLimit);
  const recommendedSavings = totals.totalIncome > 0 ? Math.max(totals.totalIncome * 0.2, totals.totalSavings) : totals.totalSavings;
  const recommendedInvestment = totals.totalIncome > 0 ? Math.max(totals.totalIncome * 0.1, Math.min(totals.totalInvestments, totals.totalIncome * 0.25)) : totals.totalInvestments;
  const predictedExpenses = totals.totalExpenses * (totals.expenseRatio > 0.75 ? 1.06 : 1.02);
  const predictedSavings = Math.max(0, totals.totalIncome - predictedExpenses);
  const predictedScore = clamp(score + (reduceAmount > 0 ? 8 : 2));

  const aiSummary = useMemo(() => {
    if (!hasCoreData) return L('addData');
    const cut = money(Math.round(reduceAmount || totals.totalExpenses * 0.08));
    const top = topExpense ? `${topExpense.name} (${money(topExpense.value)})` : money(totals.totalExpenses);
    if (lang === 'en') return `Your financial position is ${tx(copy[scoreStatus(score)], lang).toLowerCase()}. Monthly income is ${money(totals.totalIncome)}, expenses are ${money(totals.totalExpenses)}, and the highest pressure is ${top}. Reducing expenses by ${cut} can raise your savings ratio and improve next month's score.`;
    if (lang === 'fr') return `Votre situation financière est ${tx(copy[scoreStatus(score)], lang).toLowerCase()}. Les revenus mensuels sont de ${money(totals.totalIncome)}, les dépenses de ${money(totals.totalExpenses)}, et la pression principale est ${top}. Réduire les dépenses de ${cut} peut améliorer l'épargne et le score du mois prochain.`;
    return `وضعك المالي ${tx(copy[scoreStatus(score)], lang)}. دخلك ${money(totals.totalIncome)} ومصروفاتك ${money(totals.totalExpenses)}، وأكثر ضغط عندك هو ${top}. إذا خفضت ${cut} هذا الشهر، تقدر ترفع نسبة الادخار وتحسن درجة الشهر القادم.`;
  }, [L, hasCoreData, lang, money, reduceAmount, score, topExpense, totals]);

  const insights = useMemo(() => buildInsights(lang, money, totals, topExpense, score, goals.length), [goals.length, lang, money, score, topExpense, totals]);
  const planItems = useMemo(() => buildPlan(lang, money, topExpense, totals, recommendedSavings, recommendedInvestment), [lang, money, recommendedInvestment, recommendedSavings, topExpense, totals]);
  const monthlyData = useMemo(() => buildMonthlyData(lang, totals, predictedExpenses, predictedSavings, recommendedInvestment), [lang, predictedExpenses, predictedSavings, recommendedInvestment, totals]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function answerQuestion(raw: string) {
    const question = raw.trim();
    if (!question) return;
    setChatInput('');
    setChatAnswer(buildChatAnswer(question, lang, money, totals, topExpense, goals[0]));
  }

  function exportReport() {
    showToast(L('exportReady'));
    window.setTimeout(() => window.print(), 250);
  }

  if (loading || isLoading) {
    return (
      <div className="ai-page" dir={dir}>
        <Sidebar />
        <main className="ai-main"><div className="ai-card ai-loading">...</div></main>
      </div>
    );
  }

  return (
    <div className="ai-page" dir={dir}>
      <Sidebar />
      <main className="ai-main">
        <header className="ai-topbar">
          <div>
            <span>{L('badge')}</span>
            <h1>{L('title')}</h1>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="ai-hero">
          <div className="ai-hero-text">
            <div className="ai-badge"><Sparkles size={15} />{L('badge')}</div>
            <h2>{L('title')}</h2>
            <p>{aiSummary}</p>
            <div className="ai-hero-actions">
              <button onClick={() => showToast(aiSummary)}><Brain size={16} />{L('analyze')}</button>
              <button onClick={() => document.getElementById('ai-plan')?.scrollIntoView({ behavior: 'smooth' })}><CalendarClock size={16} />{L('monthlyPlan')}</button>
              <button onClick={() => document.getElementById('ai-prediction')?.scrollIntoView({ behavior: 'smooth' })}><TrendingUp size={16} />{L('predict')}</button>
            </div>
          </div>
          <div className="ai-score-ring" style={{ background: `conic-gradient(var(--sfm-soft-cyan) ${score * 3.6}deg, rgba(255,255,255,.14) 0deg)` }}>
            <div>
              <strong>{score}</strong>
              <span>/100</span>
              <b>{tx(copy[scoreStatus(score)], lang)}</b>
            </div>
          </div>
        </section>

        {!hasCoreData && (
          <EmptyState title={L('title')} text={L('addData')} />
        )}

        <section className="ai-grid ai-score-breakdown">
          <div className="ai-card span-5">
            <SectionTitle icon={<ShieldAlert size={19} />} title={L('scoreBreakdown')} />
            {scoreParts.map(part => <HealthBar key={part.key} title={part.title} score={part.score} reason={part.reason} />)}
          </div>
          <div className="ai-card span-7">
            <SectionTitle icon={<Brain size={19} />} title={L('smartAlerts')} />
            <div className="ai-insights">
              {insights.map(item => <InsightCard key={item.title} item={item} lang={lang} />)}
            </div>
          </div>
        </section>

        <section className="ai-grid" id="ai-plan">
          <div className="ai-card span-7">
            <SectionTitle icon={<CalendarClock size={19} />} title={L('actionPlan')} />
            <div className="ai-plan-grid">
              {planItems.map(item => (
                <div className="ai-plan-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <div><span>{L('current')}</span><strong>{item.current}</strong></div>
                  <div><span>{L('recommended')}</span><strong>{item.recommended}</strong></div>
                  <div><span>{L('save')}</span><strong>{item.save}</strong></div>
                </div>
              ))}
            </div>
            <p className="ai-plan-summary">{L('planSummary').replace('{amount}', money(Math.round(reduceAmount + Math.max(0, recommendedSavings - totals.totalSavings))))}</p>
          </div>
          <div className="ai-card span-5">
            <SectionTitle icon={<MessageCircle size={19} />} title={L('advisor')} />
            <div className="ai-chips">
              {questions[lang].map(q => <button key={q} onClick={() => answerQuestion(q)}>{q}</button>)}
            </div>
            <div className="ai-chat-row">
              <input value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder={L('chatPlaceholder')} onKeyDown={event => { if (event.key === 'Enter') answerQuestion(chatInput); }} />
              <button onClick={() => answerQuestion(chatInput)}><Send size={16} />{L('send')}</button>
            </div>
            {chatAnswer && <div className="ai-answer"><Bot size={18} /><p>{chatAnswer}</p></div>}
          </div>
        </section>

        <section className="ai-card">
          <SectionTitle icon={<BarChart3 size={19} />} title={L('health')} />
          <div className="ai-health-grid">
            {scoreParts.slice(0, 4).map(part => <HealthBar key={`health-${part.key}`} title={part.title} score={part.score} reason={part.reason} compact />)}
          </div>
        </section>

        <section className="ai-grid">
          <div className="ai-card span-6">
            <SectionTitle icon={<LineChartIcon size={19} />} title={L('comparison')} />
            <EmptyState title={L('comparison')} text={L('notEnough')} compact />
          </div>
          <div className="ai-card span-6" id="ai-prediction">
            <SectionTitle icon={<TrendingUp size={19} />} title={L('nextMonth')} />
            <div className="ai-prediction-grid">
              <Metric label={L('expectedIncome')} value={money(totals.totalIncome)} />
              <Metric label={L('expectedExpenses')} value={money(Math.round(predictedExpenses))} />
              <Metric label={L('expectedSavings')} value={money(Math.round(predictedSavings))} />
              <Metric label={L('expectedInvestment')} value={money(Math.round(recommendedInvestment))} />
              <Metric label={L('expectedScore')} value={`${predictedScore}/100`} />
            </div>
            <p className="ai-plan-summary">{predictionText(lang, money, predictedExpenses, recommendedExpenseLimit)}</p>
          </div>
        </section>

        <section className="ai-card">
          <SectionTitle icon={<Target size={19} />} title={L('goals')} />
          {goals.length === 0 ? <EmptyState title={L('goals')} text={L('noGoals')} compact /> : (
            <div className="ai-goals-grid">
              {goals.map(goal => <GoalAnalysis key={goal.id} goal={goal} income={totals.totalIncome} lang={lang} money={money} />)}
            </div>
          )}
        </section>

        <section className="ai-card">
          <SectionTitle icon={<BarChart3 size={19} />} title={L('charts')} />
          {!hasCoreData ? <EmptyState title={L('charts')} text={L('noCharts')} compact /> : (
            <div className="ai-chart-grid">
              <ChartBox title={L('expenses')}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>
                      {categoryTotals.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartBox>
              <ChartBox title={`${L('income')} / ${L('expenses')}`}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => money(Number(value))} />
                    <Area dataKey="income" stroke="#22C55E" fill="#22C55E33" />
                    <Area dataKey="expenses" stroke="#EF4444" fill="#EF444433" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartBox>
              <ChartBox title={L('goalsLabel')}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={goals.map(goal => ({ name: goal.name, value: goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0 }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => `${Number(value)}%`} />
                    <Bar dataKey="value" fill="var(--sfm-soft-cyan)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>
          )}
        </section>

        <section className="ai-card">
          <SectionTitle icon={<Plus size={19} />} title={L('quickActions')} />
          <div className="ai-actions">
            <Link href="/expenses/add"><Wallet size={16} />{L('addExpense')}</Link>
            <Link href="/income/add"><ArrowUpRight size={16} />{L('addIncome')}</Link>
            <Link href="/invest"><TrendingUp size={16} />{L('addInvestment')}</Link>
            <Link href="/goals/add"><Goal size={16} />{L('addGoal')}</Link>
            <button onClick={exportReport}><Download size={16} />{L('exportPdf')}</button>
            <button onClick={() => window.location.reload()}><RefreshCw size={16} />{L('refresh')}</button>
          </div>
        </section>

        {toast && <div className="ai-toast">{toast}</div>}
      </main>

      <style jsx global>{`
        .ai-page{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);display:flex;font-family:Tajawal,Arial,sans-serif}.ai-main{flex:1;max-width:1320px;width:100%;margin:0 auto;padding:22px;margin-inline-start:230px}.ai-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.ai-topbar span{font-size:12px;color:var(--sfm-muted);font-weight:900}.ai-topbar h1{margin:4px 0 0;font-size:26px;font-weight:900;color:var(--sfm-foreground)}
        .ai-hero{background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 62%,var(--sfm-soft-cyan) 150%);border:1px solid rgba(167,243,240,.22);border-radius:28px;padding:30px;color:var(--sfm-card);display:grid;grid-template-columns:1fr 220px;gap:22px;align-items:center;box-shadow:0 20px 55px rgba(3,18,37,.16);margin-bottom:16px}.ai-badge{display:inline-flex;align-items:center;gap:8px;color:var(--sfm-soft-cyan);background:rgba(167,243,240,.12);border:1px solid rgba(167,243,240,.18);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin-bottom:14px}.ai-hero h2{font-size:38px;margin:0 0 10px;font-weight:900}.ai-hero p{max-width:790px;color:rgba(255,255,255,.78);line-height:1.9;font-size:15px;margin:0 0 20px}.ai-hero-actions{display:flex;flex-wrap:wrap;gap:9px}.ai-hero-actions button,.ai-actions a,.ai-actions button,.ai-chat-row button{border:0;border-radius:14px;height:43px;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;text-decoration:none;transition:.2s}.ai-hero-actions button:first-child,.ai-chat-row button{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.ai-hero-actions button:not(:first-child){background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:#fff}.ai-score-ring{width:190px;height:190px;border-radius:50%;display:grid;place-items:center;justify-self:end}.ai-score-ring>div{width:142px;height:142px;border-radius:50%;background:linear-gradient(145deg,var(--sfm-deep-navy),var(--sfm-primary-dark));display:grid;place-items:center;text-align:center;border:1px solid rgba(167,243,240,.22)}.ai-score-ring strong{font-size:42px;color:var(--sfm-soft-cyan);line-height:1}.ai-score-ring span,.ai-score-ring b{display:block;color:#fff;font-size:12px}
        .ai-card{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:22px;box-shadow:0 4px 22px rgba(3,18,37,.06);padding:18px;margin-bottom:14px}.ai-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}.span-5{grid-column:span 5}.span-6{grid-column:span 6}.span-7{grid-column:span 7}.ai-section-title{display:flex;align-items:center;gap:9px;color:var(--sfm-muted);margin-bottom:14px}.ai-section-title h2{font-size:17px;color:var(--sfm-foreground);margin:0;font-weight:900}
        .ai-health{display:grid;gap:7px;margin-bottom:12px}.ai-health-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.ai-health strong{font-size:13px}.ai-health span{font-size:12px;color:var(--sfm-muted);font-weight:900}.ai-bar{height:10px;background:rgba(29,140,255,.10);border-radius:999px;overflow:hidden}.ai-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-muted),var(--sfm-soft-cyan))}.ai-health p{margin:0;color:var(--sfm-muted);font-size:12px;line-height:1.6;font-weight:800}.ai-health-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .ai-insights,.ai-plan-grid,.ai-goals-grid,.ai-chart-grid,.ai-prediction-grid{display:grid;gap:12px}.ai-insights{grid-template-columns:repeat(2,1fr)}.ai-insight-card{border-radius:18px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.13);padding:14px}.ai-insight-top{display:flex;justify-content:space-between;gap:10px}.ai-insight-card h3{margin:0;font-size:15px}.ai-pill{border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}.ai-pill.good{background:#DCFCE7;color:#166534}.ai-pill.warning{background:#FEF3C7;color:#92400E}.ai-pill.danger{background:#FEE2E2;color:#B91C1C}.ai-insight-card b{display:block;color:var(--sfm-soft-cyan);margin:10px 0 5px}.ai-insight-card p{margin:0 0 8px;color:var(--sfm-muted);font-size:13px;line-height:1.7}.ai-action{color:var(--sfm-foreground)!important;font-weight:900}
        .ai-plan-grid{grid-template-columns:repeat(4,1fr)}.ai-plan-card,.ai-metric,.ai-goal-card,.ai-chart-box{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:18px;padding:14px}.ai-plan-card h3{margin:0 0 10px}.ai-plan-card div{display:flex;justify-content:space-between;font-size:12px;margin-top:6px}.ai-plan-card span,.ai-metric span{color:var(--sfm-muted);font-weight:900}.ai-plan-card strong,.ai-metric strong{color:var(--sfm-foreground)}.ai-plan-summary{background:rgba(167,243,240,.1);border:1px solid rgba(167,243,240,.15);border-radius:15px;padding:12px;margin:14px 0 0;color:var(--sfm-muted);font-weight:900;line-height:1.7}
        .ai-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}.ai-chips button{border:1px solid rgba(167,243,240,.15);background:var(--sfm-light-card);color:var(--sfm-muted);border-radius:999px;padding:8px 11px;font:800 12px Tajawal,Arial,sans-serif;cursor:pointer}.ai-chat-row{display:grid;grid-template-columns:1fr auto;gap:8px}.ai-chat-row input{height:46px;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 12px;outline:0;font:800 13px Tajawal,Arial,sans-serif}.ai-answer{margin-top:12px;display:flex;gap:9px;background:var(--sfm-foreground);color:var(--sfm-light-card);border-radius:16px;padding:12px}.ai-answer svg{color:var(--sfm-soft-cyan);flex:0 0 auto}.ai-answer p{margin:0;line-height:1.8;font-size:13px}
        .ai-prediction-grid{grid-template-columns:repeat(5,1fr)}.ai-metric{display:grid;gap:6px}.ai-metric strong{font-size:16px}.ai-goals-grid{grid-template-columns:repeat(2,1fr)}.ai-goal-card h3{margin:0 0 10px}.ai-goal-card p{margin:6px 0;color:var(--sfm-muted);font-size:13px;line-height:1.7}.ai-chart-grid{grid-template-columns:repeat(3,1fr)}.ai-chart-box h3{margin:0 0 8px;font-size:14px}.ai-actions{display:flex;flex-wrap:wrap;gap:9px}.ai-actions a,.ai-actions button{background:var(--sfm-light-card);color:var(--sfm-muted);border:1px solid rgba(167,243,240,.16)}.ai-actions a:hover,.ai-actions button:hover,.ai-chips button:hover{background:rgba(167,243,240,.14)}
        .ai-empty{text-align:center;padding:28px 16px;color:var(--sfm-muted)}.ai-empty h3{margin:0 0 8px;color:var(--sfm-foreground)}.ai-empty p{margin:0;line-height:1.7}.ai-toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:var(--sfm-foreground);color:var(--sfm-soft-cyan);border:1px solid rgba(167,243,240,.28);border-radius:16px;padding:13px 16px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(3,18,37,.2)}.ai-loading{height:180px;display:grid;place-items:center;color:var(--sfm-muted);font-size:32px}
        @media(max-width:1180px){.ai-main{margin-inline-start:0}.ai-hero{grid-template-columns:1fr}.ai-score-ring{justify-self:start}.span-5,.span-6,.span-7{grid-column:span 12}.ai-plan-grid,.ai-chart-grid,.ai-prediction-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.ai-main{padding:14px}.ai-hero{padding:22px}.ai-hero h2{font-size:30px}.ai-score-ring{width:160px;height:160px}.ai-insights,.ai-plan-grid,.ai-health-grid,.ai-goals-grid,.ai-chart-grid,.ai-prediction-grid{grid-template-columns:1fr}.ai-chat-row{grid-template-columns:1fr}.ai-hero-actions button,.ai-actions a,.ai-actions button{width:100%}}
      `}</style>
    </div>
  );
}

function ratioReason(kind: string, ratio: number, value: number, income: number, lang: Lang, money: (n: number) => string) {
  const pct = income > 0 ? Math.round(ratio * 100) : 0;
  if (kind === 'expenses') {
    if (lang === 'en') return income > 0 ? `Expenses are ${money(value)}, equal to ${pct}% of income.` : 'Add income to calculate expense pressure.';
    if (lang === 'fr') return income > 0 ? `Les dépenses sont de ${money(value)}, soit ${pct} % des revenus.` : 'Ajoutez les revenus pour calculer la pression des dépenses.';
    return income > 0 ? `المصروفات ${money(value)} وتمثل ${pct}% من الدخل.` : 'أضف الدخل حتى نحسب ضغط المصروفات.';
  }
  if (kind === 'savings') {
    if (lang === 'en') return `Current savings are ${money(value)} (${pct}% of income).`;
    if (lang === 'fr') return `L'épargne actuelle est de ${money(value)} (${pct} % des revenus).`;
    return `الادخار الحالي ${money(value)} (${pct}% من الدخل).`;
  }
  if (lang === 'en') return `Current investment is ${money(value)} (${pct}% of income).`;
  if (lang === 'fr') return `L'investissement actuel est de ${money(value)} (${pct} % des revenus).`;
  return `الاستثمار الحالي ${money(value)} (${pct}% من الدخل).`;
}

function goalReason(count: number, ratio: number, current: number, target: number, lang: Lang, money: (n: number) => string) {
  if (count === 0) return lang === 'en' ? 'No goals added yet.' : lang === 'fr' ? 'Aucun objectif ajouté.' : 'لا توجد أهداف مضافة.';
  const pct = Math.round(ratio * 100);
  if (lang === 'en') return `Goal progress is ${money(current)} out of ${money(target)} (${pct}%).`;
  if (lang === 'fr') return `Progression des objectifs: ${money(current)} sur ${money(target)} (${pct} %).`;
  return `تقدم الأهداف ${money(current)} من أصل ${money(target)} (${pct}%).`;
}

function commitmentReason(surplus: number, income: number, lang: Lang, money: (n: number) => string) {
  if (lang === 'en') return income > 0 ? `Monthly surplus after expenses is ${money(surplus)}.` : 'Add income to calculate plan commitment.';
  if (lang === 'fr') return income > 0 ? `L'excédent mensuel après dépenses est ${money(surplus)}.` : "Ajoutez les revenus pour calculer l'engagement.";
  return income > 0 ? `الفائض الشهري بعد المصروفات ${money(surplus)}.` : 'أضف الدخل حتى نحسب الالتزام بالخطة.';
}

function buildInsights(lang: Lang, money: (n: number) => string, totals: FinancialTotals, topExpense: { name: string; value: number } | undefined, score: number, goalCount: number) {
  const insights = [];
  const expensePct = totals.totalIncome > 0 ? Math.round(totals.expenseRatio * 100) : 0;
  const reduce = Math.max(0, totals.totalExpenses - totals.totalIncome * 0.65);
  insights.push({
    title: lang === 'en' ? 'Expense pressure' : lang === 'fr' ? 'Pression des dépenses' : 'المصروفات مرتفعة',
    severity: expensePct > 80 ? 'danger' as const : expensePct > 65 ? 'warning' as const : 'good' as const,
    number: totals.totalIncome > 0 ? `${expensePct}%` : money(totals.totalExpenses),
    reason: lang === 'en' ? `Monthly expenses are ${money(totals.totalExpenses)}, representing ${expensePct}% of income.` : lang === 'fr' ? `Les dépenses mensuelles sont de ${money(totals.totalExpenses)}, soit ${expensePct} % des revenus.` : `مصروفاتك هذا الشهر ${money(totals.totalExpenses)} وتمثل ${expensePct}% من دخلك.`,
    action: lang === 'en' ? `Reduce expenses by ${money(Math.round(reduce || totals.totalExpenses * 0.08))} this month.` : lang === 'fr' ? `Réduisez les dépenses de ${money(Math.round(reduce || totals.totalExpenses * 0.08))} ce mois-ci.` : `خفض المصروفات ${money(Math.round(reduce || totals.totalExpenses * 0.08))} هذا الشهر.`,
  });
  insights.push({
    title: lang === 'en' ? 'Top spending category' : lang === 'fr' ? 'Catégorie la plus coûteuse' : 'أعلى تصنيف صرف',
    severity: topExpense && topExpense.value > totals.totalExpenses * 0.35 ? 'warning' as const : 'good' as const,
    number: topExpense ? money(topExpense.value) : money(0),
    reason: topExpense ? (lang === 'en' ? `${topExpense.name} is the highest category at ${money(topExpense.value)}.` : lang === 'fr' ? `${topExpense.name} est la catégorie la plus élevée avec ${money(topExpense.value)}.` : `${topExpense.name} هو أعلى تصنيف صرف بقيمة ${money(topExpense.value)}.`) : (lang === 'en' ? 'No expense categories yet.' : lang === 'fr' ? 'Aucune catégorie de dépenses.' : 'لا توجد تصنيفات مصروفات بعد.'),
    action: topExpense ? (lang === 'en' ? `Set a limit of ${money(Math.round(topExpense.value * 0.8))} for this category.` : lang === 'fr' ? `Fixez une limite de ${money(Math.round(topExpense.value * 0.8))} pour cette catégorie.` : `ضع حد ${money(Math.round(topExpense.value * 0.8))} لهذا التصنيف.`) : (lang === 'en' ? 'Add expenses to identify the biggest category.' : lang === 'fr' ? 'Ajoutez des dépenses pour identifier la catégorie principale.' : 'أضف مصروفات لتحديد أعلى تصنيف.'),
  });
  insights.push({
    title: lang === 'en' ? 'Investment position' : lang === 'fr' ? "Position d'investissement" : 'وضع الاستثمار',
    severity: totals.totalInvestments > 0 ? 'good' as const : 'warning' as const,
    number: money(totals.totalInvestments),
    reason: lang === 'en' ? `Current investments total ${money(totals.totalInvestments)}.` : lang === 'fr' ? `Les investissements actuels totalisent ${money(totals.totalInvestments)}.` : `استثماراتك الحالية ${money(totals.totalInvestments)}.`,
    action: totals.totalIncome > 0 ? (lang === 'en' ? `Aim for monthly investment of ${money(Math.round(totals.totalIncome * 0.1))}.` : lang === 'fr' ? `Visez un investissement mensuel de ${money(Math.round(totals.totalIncome * 0.1))}.` : `استهدف استثمار شهري ${money(Math.round(totals.totalIncome * 0.1))}.`) : (lang === 'en' ? 'Add income to evaluate suitable investment level.' : lang === 'fr' ? 'Ajoutez les revenus pour évaluer le niveau adapté.' : 'أضف الدخل حتى نقيّم مستوى الاستثمار المناسب.'),
  });
  insights.push({
    title: lang === 'en' ? 'Financial score outlook' : lang === 'fr' ? 'Perspective du score financier' : 'اتجاه الدرجة المالية',
    severity: score >= 70 ? 'good' as const : score >= 45 ? 'warning' as const : 'danger' as const,
    number: `${score}/100`,
    reason: lang === 'en' ? `Your current AI score is ${score}/100 based on ${goalCount} goals and your monthly ratios.` : lang === 'fr' ? `Votre score IA actuel est ${score}/100 selon ${goalCount} objectifs et vos ratios mensuels.` : `درجتك الذكية الحالية ${score}/100 بناءً على ${goalCount} أهداف ونسبك الشهرية.`,
    action: lang === 'en' ? `Improve it by reducing expenses and moving ${money(Math.round(totals.totalIncome * 0.1))} toward savings.` : lang === 'fr' ? `Améliorez-le en réduisant les dépenses et en transférant ${money(Math.round(totals.totalIncome * 0.1))} vers l'épargne.` : `حسنها بتقليل المصروفات وتحويل ${money(Math.round(totals.totalIncome * 0.1))} للادخار.`,
  });
  return insights;
}

function buildPlan(lang: Lang, money: (n: number) => string, topExpense: { name: string; value: number } | undefined, totals: FinancialTotals, recommendedSavings: number, recommendedInvestment: number) {
  const topCurrent = topExpense?.value ?? totals.totalExpenses;
  const topRecommended = Math.max(0, topCurrent * 0.75);
  return [
    {
      title: topExpense ? (lang === 'en' ? `Reduce ${topExpense.name}` : lang === 'fr' ? `Réduire ${topExpense.name}` : `خفّض ${topExpense.name}`) : (lang === 'en' ? 'Reduce expenses' : lang === 'fr' ? 'Réduire les dépenses' : 'خفّض المصروفات'),
      current: money(topCurrent),
      recommended: money(Math.round(topRecommended)),
      save: money(Math.round(topCurrent - topRecommended)),
    },
    {
      title: lang === 'en' ? 'Increase savings' : lang === 'fr' ? "Augmenter l'épargne" : 'زد الادخار',
      current: money(totals.totalSavings),
      recommended: money(Math.round(recommendedSavings)),
      save: money(Math.max(0, Math.round(recommendedSavings - totals.totalSavings))),
    },
    {
      title: lang === 'en' ? 'Keep investing' : lang === 'fr' ? "Maintenir l'investissement" : 'حافظ على الاستثمار',
      current: money(totals.totalInvestments),
      recommended: money(Math.round(recommendedInvestment)),
      save: money(0),
    },
    {
      title: lang === 'en' ? 'Spending limit' : lang === 'fr' ? 'Limite de dépenses' : 'حد المصروفات',
      current: money(totals.totalExpenses),
      recommended: money(Math.round(totals.totalIncome * 0.65)),
      save: money(Math.max(0, Math.round(totals.totalExpenses - totals.totalIncome * 0.65))),
    },
  ];
}

function buildMonthlyData(lang: Lang, totals: FinancialTotals, predictedExpenses: number, predictedSavings: number, recommendedInvestment: number) {
  const current = lang === 'en' ? 'This month' : lang === 'fr' ? 'Ce mois' : 'هذا الشهر';
  const next = lang === 'en' ? 'Next month' : lang === 'fr' ? 'Mois prochain' : 'الشهر القادم';
  return [
    { name: current, income: totals.totalIncome, expenses: totals.totalExpenses, savings: totals.totalSavings, investment: totals.totalInvestments },
    { name: next, income: totals.totalIncome, expenses: Math.round(predictedExpenses), savings: Math.round(predictedSavings), investment: Math.round(recommendedInvestment) },
  ];
}

function buildChatAnswer(question: string, lang: Lang, money: (n: number) => string, totals: FinancialTotals, topExpense: { name: string; value: number } | undefined, goal?: GoalRow) {
  const q = question.toLowerCase();
  if (q.includes('200') || q.includes('وفر') || q.includes('save') || q.includes('économ')) {
    const topCut = topExpense ? Math.min(200, Math.round(topExpense.value * 0.25)) : Math.min(200, Math.round(totals.totalExpenses * 0.1));
    if (lang === 'en') return `To save ${money(200)}, reduce ${topExpense?.name || 'expenses'} by ${money(topCut)} and move ${money(200 - topCut)} from flexible spending to savings. Your current expenses are ${money(totals.totalExpenses)}.`;
    if (lang === 'fr') return `Pour économiser ${money(200)}, réduisez ${topExpense?.name || 'les dépenses'} de ${money(topCut)} et transférez ${money(200 - topCut)} vers l'épargne. Vos dépenses actuelles sont ${money(totals.totalExpenses)}.`;
    return `عشان توفر ${money(200)}، خفّض ${topExpense?.name || 'المصروفات'} بقيمة ${money(topCut)} وحوّل ${money(200 - topCut)} من الصرف المرن إلى الادخار. مصروفاتك الحالية ${money(totals.totalExpenses)}.`;
  }
  if (q.includes('70') || q.includes('20') || q.includes('10')) {
    if (lang === 'en') return `70/20/10 plan from income ${money(totals.totalIncome)}: expenses ${money(totals.totalIncome * 0.7)}, savings ${money(totals.totalIncome * 0.2)}, investments ${money(totals.totalIncome * 0.1)}. Current expenses are ${money(totals.totalExpenses)}.`;
    if (lang === 'fr') return `Plan 70/20/10 sur ${money(totals.totalIncome)}: dépenses ${money(totals.totalIncome * 0.7)}, épargne ${money(totals.totalIncome * 0.2)}, investissement ${money(totals.totalIncome * 0.1)}. Dépenses actuelles: ${money(totals.totalExpenses)}.`;
    return `خطة 70/20/10 على دخل ${money(totals.totalIncome)}: مصروفات ${money(totals.totalIncome * 0.7)}، ادخار ${money(totals.totalIncome * 0.2)}، استثمار ${money(totals.totalIncome * 0.1)}. مصروفاتك الحالية ${money(totals.totalExpenses)}.`;
  }
  if (q.includes('هدف') || q.includes('goal') || q.includes('objectif')) {
    if (!goal) return lang === 'en' ? 'Add a financial goal first so I can calculate the remaining amount and monthly requirement.' : lang === 'fr' ? "Ajoutez d'abord un objectif pour calculer le reste et l'effort mensuel." : 'أضف هدف مالي أولاً حتى أحسب المتبقي والمبلغ الشهري المطلوب.';
    const remaining = Math.max(0, goal.target - goal.current);
    const months = monthsUntil(goal.deadline);
    const required = months > 0 ? remaining / months : 0;
    if (lang === 'en') return `${goal.name}: remaining ${money(remaining)}. ${months > 0 ? `You need ${money(Math.round(required))} monthly for ${months} months.` : `At ${money(goal.monthly)} monthly, estimated completion is ${goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : 0} months.`}`;
    if (lang === 'fr') return `${goal.name}: il reste ${money(remaining)}. ${months > 0 ? `Il faut ${money(Math.round(required))} par mois pendant ${months} mois.` : `Avec ${money(goal.monthly)} par mois, durée estimée: ${goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : 0} mois.`}`;
    return `${goal.name}: المتبقي ${money(remaining)}. ${months > 0 ? `تحتاج ${money(Math.round(required))} شهرياً لمدة ${months} شهر.` : `على مساهمة ${money(goal.monthly)} شهرياً، المدة المتوقعة ${goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : 0} شهر.`}`;
  }
  if (lang === 'en') return `Based on your data: income ${money(totals.totalIncome)}, expenses ${money(totals.totalExpenses)}, savings ${money(totals.totalSavings)}, investments ${money(totals.totalInvestments)}. Start by limiting expenses to ${money(totals.totalIncome * 0.65)}.`;
  if (lang === 'fr') return `Selon vos données: revenus ${money(totals.totalIncome)}, dépenses ${money(totals.totalExpenses)}, épargne ${money(totals.totalSavings)}, investissements ${money(totals.totalInvestments)}. Commencez par limiter les dépenses à ${money(totals.totalIncome * 0.65)}.`;
  return `حسب بياناتك: الدخل ${money(totals.totalIncome)}، المصروفات ${money(totals.totalExpenses)}، الادخار ${money(totals.totalSavings)}، الاستثمار ${money(totals.totalInvestments)}. ابدأ بوضع حد مصروفات ${money(totals.totalIncome * 0.65)}.`;
}

function predictionText(lang: Lang, money: (n: number) => string, predictedExpenses: number, limit: number) {
  if (lang === 'en') return `If the same pattern continues, next month's expenses may reach ${money(Math.round(predictedExpenses))}. To avoid that, set a limit of ${money(Math.round(limit))}.`;
  if (lang === 'fr') return `Si le même rythme continue, les dépenses du mois prochain pourraient atteindre ${money(Math.round(predictedExpenses))}. Pour l'éviter, fixez une limite de ${money(Math.round(limit))}.`;
  return `إذا استمريت بنفس النمط، مصروفات الشهر القادم قد تصل إلى ${money(Math.round(predictedExpenses))}. لتفادي ذلك، ضع حد ${money(Math.round(limit))} للمصروفات.`;
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="ai-section-title">{icon}<h2>{title}</h2></div>;
}

function HealthBar({ title, score, reason, compact }: { title: string; score: number; reason: string; compact?: boolean }) {
  return (
    <div className="ai-health">
      <div className="ai-health-head"><strong>{title}</strong><span>{score}%</span></div>
      <div className="ai-bar"><i style={{ width: `${score}%` }} /></div>
      {!compact && <p>{reason}</p>}
    </div>
  );
}

function InsightCard({ item, lang }: { item: { title: string; severity: Severity; number: string; reason: string; action: string }; lang: Lang }) {
  return (
    <article className="ai-insight-card">
      <div className="ai-insight-top">
        <h3>{item.title}</h3>
        <span className={`ai-pill ${item.severity}`}>{tx(copy[item.severity], lang)}</span>
      </div>
      <b>{item.number}</b>
      <p>{item.reason}</p>
      <p className="ai-action">{item.action}</p>
    </article>
  );
}

function EmptyState({ title, text, compact }: { title: string; text: string; compact?: boolean }) {
  return <div className="ai-empty" style={{ padding: compact ? '18px 10px' : undefined }}><h3>{title}</h3><p>{text}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="ai-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function GoalAnalysis({ goal, income, lang, money }: { goal: GoalRow; income: number; lang: Lang; money: (n: number) => string }) {
  const remaining = Math.max(0, goal.target - goal.current);
  const months = monthsUntil(goal.deadline);
  const required = months > 0 ? remaining / months : 0;
  const realistic = income > 0 && required <= income * 0.25;
  const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
  const textLine = lang === 'en'
    ? `${goal.name} requires ${money(goal.target)}. Remaining ${money(remaining)}. ${months > 0 ? `To reach it in ${months} months you need ${money(Math.round(required))} monthly.` : `With ${money(goal.monthly)} monthly, estimated completion is ${goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : 0} months.`}`
    : lang === 'fr'
      ? `${goal.name} nécessite ${money(goal.target)}. Reste ${money(remaining)}. ${months > 0 ? `Pour l'atteindre en ${months} mois, il faut ${money(Math.round(required))} par mois.` : `Avec ${money(goal.monthly)} par mois, durée estimée: ${goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : 0} mois.`}`
      : `هدف ${goal.name} يحتاج ${money(goal.target)}. المتبقي ${money(remaining)}. ${months > 0 ? `للوصول خلال ${months} شهر تحتاج ${money(Math.round(required))} شهرياً.` : `على مساهمة ${money(goal.monthly)} شهرياً، المدة المتوقعة ${goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : 0} شهر.`}`;
  const suggestion = realistic
    ? (lang === 'en' ? `Realistic: required saving is within 25% of income. Progress is ${pct}%.` : lang === 'fr' ? `Réaliste: l'effort reste sous 25 % des revenus. Progression ${pct} %.` : `واقعي: الادخار المطلوب ضمن 25% من الدخل. التقدم ${pct}%.`)
    : (lang === 'en' ? 'Not realistic with current income. Extend timeline, lower target, or increase monthly income.' : lang === 'fr' ? "Peu réaliste avec les revenus actuels. Prolongez l'échéance, réduisez la cible ou augmentez les revenus." : 'غير واقعي مقارنة بالدخل الحالي. مدّد المدة، خفّض الهدف، أو زِد الدخل الشهري.');
  return <article className="ai-goal-card"><h3>{goal.name}</h3><p>{textLine}</p><p className="ai-action">{suggestion}</p></article>;
}

function ChartBox({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ai-chart-box"><h3>{title}</h3>{children}</div>;
}
