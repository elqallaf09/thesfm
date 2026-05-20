'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Bell as BellIcon,
  ChartPie,
  Download,
  Flag,
  Gauge,
  GraduationCap,
  HandHeart,
  Home,
  LineChart,
  Menu,
  Plus,
  Printer,
  ReceiptText,
  Send,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

type PageKind = 'expenses' | 'income' | 'invest' | 'goals' | 'reports' | 'ai';
type LangText = { ar: string; en: string };
type MoneyItem = { id: string; name: string; amount: number; created_at?: string | null };
type IncomeSource = MoneyItem & { label?: string | null; category?: string | null };
type GoalItem = { id: string; goal: string; amount: number; duration?: string | null; notes?: string | null };
type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

interface Snapshot {
  income: MoneyItem[];
  expenses: MoneyItem[];
  savings: MoneyItem[];
  investments: MoneyItem[];
  goals: GoalItem[];
  error: string | null;
}

interface SectionCard {
  title: LangText;
  body: LangText;
  value?: string;
  tone: string;
}

const emptySnapshot: Snapshot = {
  income: [],
  expenses: [],
  savings: [],
  investments: [],
  goals: [],
  error: null,
};

const navItems = [
  { href: '/', label: { ar: 'الرئيسية', en: 'Dashboard' }, icon: Home },
  { href: '/expenses', label: { ar: 'المصروفات', en: 'Expenses' }, icon: ReceiptText },
  { href: '/income', label: { ar: 'الدخل', en: 'Income' }, icon: Wallet },
  { href: '/invest', label: { ar: 'الاستثمار', en: 'Invest' }, icon: TrendingUp },
  { href: '/goals', label: { ar: 'الأهداف', en: 'Goals' }, icon: Target },
  { href: '/reports', label: { ar: 'التقارير', en: 'Reports' }, icon: ChartPie },
  { href: '/ai', label: { ar: 'الذكاء المالي', en: 'AI' }, icon: Bot },
  { href: '/charity', label: { ar: 'الأعمال الخيرية', en: 'Charity' }, icon: HandHeart },
  { href: '/notifications', label: { ar: 'الإشعارات', en: 'Notifications' }, icon: BellIcon },
  { href: '/education', label: { ar: 'التعليم المالي', en: 'Education' }, icon: GraduationCap },
  { href: '/settings', label: { ar: 'الإعدادات', en: 'Settings' }, icon: Settings },
];

const pageMeta: Record<PageKind, { title: LangText; subtitle: LangText; accent: string; icon: typeof ReceiptText }> = {
  expenses: {
    title: { ar: 'المصروفات', en: 'Expenses' },
    subtitle: { ar: 'راقب الصرف الشهري، التصنيفات، وآخر العمليات في مكان واحد.', en: 'Track monthly spend, categories, and recent expense activity in one place.' },
    accent: '#EF4444',
    icon: ReceiptText,
  },
  income: {
    title: { ar: 'الدخل', en: 'Income' },
    subtitle: { ar: 'نظرة واضحة على الراتب، الدخل الجانبي، ومصادر الدخل الشهرية.', en: 'A clean view of salary, side income, and monthly income sources.' },
    accent: '#22C55E',
    icon: Wallet,
  },
  invest: {
    title: { ar: 'الاستثمار', en: 'Investments' },
    subtitle: { ar: 'تابع المحفظة، فئات الاستثمار، المخاطر، والمساهمة الشهرية.', en: 'Follow portfolio value, investment categories, risk level, and monthly contribution.' },
    accent: '#3B82F6',
    icon: TrendingUp,
  },
  goals: {
    title: { ar: 'الأهداف المالية', en: 'Financial Goals' },
    subtitle: { ar: 'حوّل أهدافك إلى بطاقات تقدم بمبلغ مستهدف ومتبقي واضح.', en: 'Turn targets into progress cards with clear target and remaining amounts.' },
    accent: '#D8AE63',
    icon: Target,
  },
  reports: {
    title: { ar: 'التقارير', en: 'Reports' },
    subtitle: { ar: 'ملخص مالي قابل للطباعة للتدفقات، الادخار، الاستثمار، والتوازن الشهري.', en: 'Printable financial summaries for cash flow, savings, investments, and monthly balance.' },
    accent: '#8B5CF6',
    icon: ChartPie,
  },
  ai: {
    title: { ar: 'المساعد المالي الذكي', en: 'AI Financial Assistant' },
    subtitle: { ar: 'اقتراحات ذكية، رؤى فورية، وبطاقات عمل لتحسين قراراتك المالية.', en: 'Smart suggestions, instant insights, and action cards for better financial decisions.' },
    accent: '#06B6D4',
    icon: Bot,
  },
};

const sampleExpenses: MoneyItem[] = [
  { id: 'sample-exp-1', name: 'السكن', amount: 420 },
  { id: 'sample-exp-2', name: 'الطعام', amount: 185 },
  { id: 'sample-exp-3', name: 'المواصلات', amount: 95 },
];

const sampleIncome: MoneyItem[] = [
  { id: 'sample-inc-1', name: 'Salary', amount: 1450 },
  { id: 'sample-inc-2', name: 'Side income', amount: 280 },
  { id: 'sample-inc-3', name: 'Business income', amount: 420 },
];

const sampleInvestments: MoneyItem[] = [
  { id: 'sample-inv-1', name: 'ETF Portfolio', amount: 850 },
  { id: 'sample-inv-2', name: 'Gold', amount: 320 },
  { id: 'sample-inv-3', name: 'Cash contribution', amount: 180 },
];

const sampleSavings: MoneyItem[] = [
  { id: 'sample-sav-1', name: 'Emergency fund', amount: 700 },
  { id: 'sample-sav-2', name: 'Travel fund', amount: 250 },
];

const sampleGoals: GoalItem[] = [
  { id: 'sample-goal-1', goal: 'شراء سيارة', amount: 8000, duration: '18' },
  { id: 'sample-goal-2', goal: 'دفعة منزل', amount: 25000, duration: '48' },
  { id: 'sample-goal-3', goal: 'صندوق الطوارئ', amount: 3000, duration: '8' },
];

function pick(text: LangText, isAr: boolean) {
  return isAr ? text.ar : text.en;
}

function money(value: number, isAr: boolean) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${isAr ? 'د.ك' : 'KWD'}`;
}

function sum(items: MoneyItem[]) {
  return items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

function progress(current: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

async function safeQuery<T>(query: QueryResult<T>) {
  try {
    const { data, error } = await query;
    if (error) return { data: [] as T[], error: error.message };
    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: [] as T[], error: err instanceof Error ? err.message : 'Unknown data error' };
  }
}

export function RouteDashboardPage({ kind }: { kind: PageKind }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isAr, dir } = useLanguage();
  const meta = pageMeta[kind];
  const Icon = meta.icon;

  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [dataLoading, setDataLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatValue, setChatValue] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, router, user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      const [income, expenses, savings, investments, goals] = await Promise.all([
        safeQuery<IncomeSource>(supabase.from('monthly_income_sources').select('id, label, category, amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<IncomeSource>),
        safeQuery<MoneyItem>(supabase.from('expense_items').select('id, name, amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<MoneyItem>),
        safeQuery<MoneyItem>(supabase.from('savings_items').select('id, name, amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<MoneyItem>),
        safeQuery<MoneyItem>(supabase.from('investment_items').select('id, name, amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<MoneyItem>),
        safeQuery<GoalItem>(supabase.from('financial_goals').select('id, goal, amount, duration, notes, created_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<GoalItem>),
      ]);

      if (cancelled) return;

      setSnapshot({
        income: income.data.map(item => ({ ...item, name: item.label || item.category || item.name || 'Income' })),
        expenses: expenses.data,
        savings: savings.data,
        investments: investments.data,
        goals: goals.data,
        error: [income.error, expenses.error, savings.error, investments.error, goals.error].filter(Boolean)[0] ?? null,
      });
      setDataLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const data = useMemo(() => {
    const income = snapshot.income.length ? snapshot.income : sampleIncome;
    const expenses = snapshot.expenses.length ? snapshot.expenses : sampleExpenses;
    const savings = snapshot.savings.length ? snapshot.savings : sampleSavings;
    const investments = snapshot.investments.length ? snapshot.investments : sampleInvestments;
    const goals = snapshot.goals.length ? snapshot.goals : sampleGoals;
    const totalIncome = sum(income);
    const totalExpenses = sum(expenses);
    const totalSavings = sum(savings);
    const totalInvestments = sum(investments);
    const charityTotal = expenses.filter(item => item.name.startsWith('خيرية:')).reduce((total, item) => total + item.amount, 0);

    return {
      income,
      expenses,
      savings,
      investments,
      goals,
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      charityTotal,
      balance: totalIncome - totalExpenses,
    };
  }, [snapshot]);

  const cards = useMemo<SectionCard[]>(() => buildCards(kind, data, isAr), [data, isAr, kind]);
  const rows = useMemo(() => buildRows(kind, data, isAr), [data, isAr, kind]);
  const insights = useMemo(() => buildInsights(kind, data, isAr), [data, isAr, kind]);

  if (loading) {
    return (
      <div className="sfm-shell" dir={dir}>
        <div className="sfm-spinner" />
        <style>{baseStyles}</style>
      </div>
    );
  }

  return (
    <div className="sfm-shell" dir={dir}>
      <aside className="sfm-sidebar">
        <div className="brand" onClick={() => router.push('/')}>
          <div className="brand-mark">S</div>
          <div>
            <strong>THE SFM</strong>
            <span>{isAr ? 'المدير المالي الذكي' : 'Smart Finance Manager'}</span>
          </div>
        </div>
        <nav>
          {navItems.map(item => {
            const NavIcon = item.icon;
            const active = item.href === `/${kind}`;
            return (
              <button key={item.href} className={active ? 'active' : ''} onClick={() => router.push(item.href)}>
                <NavIcon size={17} />
                <span>{pick(item.label, isAr)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="sfm-main">
        <header className="sfm-header">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="title-wrap">
            <div className="title-icon" style={{ '--accent': meta.accent } as CSSProperties}>
              <Icon size={22} />
            </div>
            <div>
              <p>{isAr ? 'THE SFM / لوحة التحكم' : 'THE SFM / Dashboard'}</p>
              <h1>{pick(meta.title, isAr)}</h1>
            </div>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        {menuOpen && (
          <div className="mobile-panel">
            <div className="mobile-head">
              <strong>THE SFM</strong>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
                <X size={19} />
              </button>
            </div>
            {navItems.map(item => {
              const NavIcon = item.icon;
              return (
                <button key={item.href} onClick={() => { setMenuOpen(false); router.push(item.href); }}>
                  <NavIcon size={18} />
                  {pick(item.label, isAr)}
                </button>
              );
            })}
          </div>
        )}

        <section className="hero">
          <div>
            <span className="eyebrow">{isAr ? 'مسار نشط' : 'Active route'}</span>
            <h2>{pick(meta.title, isAr)}</h2>
            <p>{pick(meta.subtitle, isAr)}</p>
          </div>
          <div className="hero-actions">
            {buildPrimaryActions(kind, isAr, router, () => {
              const input = document.getElementById('ai-chat-input');
              input?.focus();
            }).map(action => (
              <button key={action.label} className={action.variant === 'print' ? 'ghost-btn' : 'primary-btn'} onClick={action.onClick}>
                <action.icon size={17} />
                {action.label}
              </button>
            ))}
          </div>
        </section>

        {snapshot.error && (
          <div className="notice">
            {isAr ? 'تعذر تحميل بعض البيانات، لذلك نعرض واجهة آمنة بدون تعطيل الصفحة.' : 'Some data could not load, so the page is showing a safe fallback instead.'}
          </div>
        )}

        <section className="kpi-grid">
          {cards.map(card => (
            <article key={pick(card.title, isAr)} className="kpi-card">
              <span style={{ background: card.tone }} />
              <p>{pick(card.title, isAr)}</p>
              <strong>{card.value}</strong>
              <small>{pick(card.body, isAr)}</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div>
                <p>{isAr ? 'تفاصيل الصفحة' : 'Page details'}</p>
                <h3>{sectionTitle(kind, isAr)}</h3>
              </div>
              {dataLoading && <span className="loading-pill">{isAr ? 'جاري التحميل' : 'Loading'}</span>}
            </div>
            <div className="row-list">
              {rows.map(row => (
                <div className="data-row" key={row.title}>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.subtitle}</span>
                  </div>
                  <b>{row.value}</b>
                </div>
              ))}
            </div>
          </div>

          <aside className="panel">
            <div className="panel-head compact">
              <div>
                <p>{isAr ? 'رؤى ذكية' : 'Smart insights'}</p>
                <h3>{isAr ? 'اقتراحات الآن' : 'Suggestions now'}</h3>
              </div>
              <Gauge size={21} />
            </div>
            <div className="insight-list">
              {insights.map(item => (
                <div key={item.title}>
                  <Flag size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {kind === 'ai' ? (
          <section className="ai-panel">
            <div>
              <h3>{isAr ? 'اسأل المساعد المالي' : 'Ask the financial assistant'}</h3>
              <p>{isAr ? 'اكتب سؤالك عن الميزانية، الدخل، أو الاستثمار. الواجهة جاهزة للتوصيل بخدمة الذكاء الموجودة.' : 'Ask about budgets, income, or investing. The interface is ready for the existing AI service.'}</p>
            </div>
            <div className="chat-box">
              <input
                id="ai-chat-input"
                value={chatValue}
                onChange={event => setChatValue(event.target.value)}
                placeholder={isAr ? 'مثال: كيف أخفض مصاريفي هذا الشهر؟' : 'Example: How can I reduce expenses this month?'}
              />
              <button aria-label="Send message">
                <Send size={18} />
              </button>
            </div>
          </section>
        ) : (
          <section className="summary-band">
            <LineChart size={20} />
            <div>
              <strong>{summaryTitle(kind, isAr)}</strong>
              <p>{summaryText(kind, data, isAr)}</p>
            </div>
          </section>
        )}
      </main>

      <style>{baseStyles}</style>
    </div>
  );
}

function buildCards(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean): SectionCard[] {
  const common = {
    income: money(data.totalIncome, isAr),
    expenses: money(data.totalExpenses, isAr),
    savings: money(data.totalSavings, isAr),
    investments: money(data.totalInvestments, isAr),
    balance: money(data.balance, isAr),
  };

  if (kind === 'expenses') return [
    { title: { ar: 'إجمالي المصروفات', en: 'Total expenses' }, body: { ar: 'يشمل كل عمليات المصروفات المسجلة.', en: 'Includes all recorded expense items.' }, value: common.expenses, tone: '#EF4444' },
    { title: { ar: 'الأعمال الخيرية', en: 'Charity spend' }, body: { ar: 'مرتبطة بالمصروفات الشهرية عند تسجيلها.', en: 'Included in monthly expenses when recorded.' }, value: money(data.charityTotal, isAr), tone: '#D8AE63' },
    { title: { ar: 'عدد التصنيفات', en: 'Categories' }, body: { ar: 'تصنيفات نشطة من آخر السجلات.', en: 'Active categories from recent records.' }, value: String(data.expenses.length), tone: '#3B82F6' },
  ];
  if (kind === 'income') return [
    { title: { ar: 'إجمالي الدخل', en: 'Total income' }, body: { ar: 'راتب، دخل جانبي، وأعمال.', en: 'Salary, side income, and business.' }, value: common.income, tone: '#22C55E' },
    { title: { ar: 'مصادر الدخل', en: 'Income sources' }, body: { ar: 'مصادر شهرية مسجلة أو بيانات نموذجية.', en: 'Recorded monthly sources or safe fallback data.' }, value: String(data.income.length), tone: '#D8AE63' },
    { title: { ar: 'الصافي المتوقع', en: 'Expected net' }, body: { ar: 'الدخل ناقص المصروفات الحالية.', en: 'Income minus current expenses.' }, value: common.balance, tone: '#111111' },
  ];
  if (kind === 'invest') return [
    { title: { ar: 'قيمة المحفظة', en: 'Portfolio value' }, body: { ar: 'إجمالي الاستثمارات المسجلة.', en: 'Total recorded investments.' }, value: common.investments, tone: '#3B82F6' },
    { title: { ar: 'المساهمة الشهرية', en: 'Monthly contribution' }, body: { ar: 'تقدير 15% من الدخل الحالي.', en: 'Estimated as 15% of current income.' }, value: money(data.totalIncome * 0.15, isAr), tone: '#22C55E' },
    { title: { ar: 'مستوى المخاطر', en: 'Risk level' }, body: { ar: 'متوازن بناءً على التوزيع الحالي.', en: 'Balanced based on current allocation.' }, value: isAr ? 'متوسط' : 'Medium', tone: '#D8AE63' },
  ];
  if (kind === 'goals') return [
    { title: { ar: 'الأهداف النشطة', en: 'Active goals' }, body: { ar: 'أهداف مالية قيد المتابعة.', en: 'Financial goals being tracked.' }, value: String(data.goals.length), tone: '#D8AE63' },
    { title: { ar: 'إجمالي المستهدف', en: 'Target total' }, body: { ar: 'مجموع مبالغ الأهداف.', en: 'Combined target amounts.' }, value: money(data.goals.reduce((total, goal) => total + goal.amount, 0), isAr), tone: '#3B82F6' },
    { title: { ar: 'مدخرات حالية', en: 'Current savings' }, body: { ar: 'تستخدم لقياس تقدم الأهداف.', en: 'Used to estimate goal progress.' }, value: common.savings, tone: '#22C55E' },
  ];
  if (kind === 'reports') return [
    { title: { ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses' }, body: { ar: 'مؤشر التوازن المالي الحالي.', en: 'Current financial balance signal.' }, value: common.balance, tone: '#111111' },
    { title: { ar: 'تقرير الادخار', en: 'Savings report' }, body: { ar: 'رصيد الادخار المسجل.', en: 'Recorded savings balance.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'تقرير الاستثمار', en: 'Investment report' }, body: { ar: 'إجمالي قيمة الاستثمارات.', en: 'Total investment value.' }, value: common.investments, tone: '#3B82F6' },
  ];
  return [
    { title: { ar: 'الصحة المالية', en: 'Financial health' }, body: { ar: 'تقدير سريع من الدخل والمصروفات.', en: 'Quick estimate from income and expenses.' }, value: `${progress(data.balance, data.totalIncome)}%`, tone: '#06B6D4' },
    { title: { ar: 'فرصة ادخار', en: 'Savings opportunity' }, body: { ar: 'الفرق المتاح بعد المصروفات.', en: 'Potential surplus after expenses.' }, value: common.balance, tone: '#22C55E' },
    { title: { ar: 'تنبيه ذكي', en: 'Smart alert' }, body: { ar: 'الصفحة جاهزة للرؤى والإجراءات.', en: 'Page is ready for insights and actions.' }, value: isAr ? 'نشط' : 'Active', tone: '#D8AE63' },
  ];
}

function buildDataShape() {
  return {
    income: [] as MoneyItem[],
    expenses: [] as MoneyItem[],
    savings: [] as MoneyItem[],
    investments: [] as MoneyItem[],
    goals: [] as GoalItem[],
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalInvestments: 0,
    charityTotal: 0,
    balance: 0,
  };
}

function buildRows(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean) {
  if (kind === 'goals') {
    const saved = data.totalSavings;
    return data.goals.map(goal => {
      const done = progress(saved, goal.amount);
      return {
        title: goal.goal,
        subtitle: isAr ? `تقدم ${done}%، المتبقي ${money(Math.max(goal.amount - saved, 0), isAr)}` : `${done}% complete, remaining ${money(Math.max(goal.amount - saved, 0), isAr)}`,
        value: money(goal.amount, isAr),
      };
    });
  }

  if (kind === 'reports') {
    return [
      { title: isAr ? 'الدخل مقابل المصروفات' : 'Income vs expenses', subtitle: isAr ? 'ملخص التدفق النقدي الحالي' : 'Current cash flow summary', value: money(data.balance, isAr) },
      { title: isAr ? 'تقرير الادخار' : 'Savings report', subtitle: isAr ? 'رصيد الادخار المسجل' : 'Recorded savings balance', value: money(data.totalSavings, isAr) },
      { title: isAr ? 'تقرير الاستثمار' : 'Investment report', subtitle: isAr ? 'قيمة المحفظة الحالية' : 'Current portfolio value', value: money(data.totalInvestments, isAr) },
    ];
  }

  if (kind === 'ai') {
    return [
      { title: isAr ? 'خفض المصروفات' : 'Reduce expenses', subtitle: isAr ? 'راجع أعلى 3 بنود صرف هذا الشهر.' : 'Review the top 3 spending items this month.', value: money(data.totalExpenses, isAr) },
      { title: isAr ? 'زيادة الادخار' : 'Increase savings', subtitle: isAr ? 'حوّل جزءًا من الصافي إلى هدف واضح.' : 'Move part of your surplus into a clear goal.', value: money(Math.max(data.balance * 0.2, 0), isAr) },
      { title: isAr ? 'استثمار منتظم' : 'Recurring investing', subtitle: isAr ? 'مساهمة شهرية صغيرة تحافظ على الاستمرارية.' : 'A small monthly contribution keeps momentum.', value: money(data.totalIncome * 0.1, isAr) },
    ];
  }

  const source = kind === 'income' ? data.income : kind === 'invest' ? data.investments : data.expenses;
  return source.slice(0, 6).map(item => ({
    title: item.name.replace(/^خيرية:\d{4}-\d{2}:/, ''),
    subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : (isAr ? 'سجل مالي' : 'Financial record'),
    value: money(item.amount, isAr),
  }));
}

function buildInsights(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean) {
  const ratio = data.totalIncome ? Math.round((data.totalExpenses / data.totalIncome) * 100) : 0;
  const base = [
    {
      title: isAr ? 'نسبة الصرف' : 'Spend ratio',
      body: isAr ? `مصروفاتك تساوي ${ratio}% من الدخل.` : `Expenses equal ${ratio}% of income.`,
    },
    {
      title: isAr ? 'مساحة الصافي' : 'Net runway',
      body: isAr ? `الصافي الحالي ${money(data.balance, isAr)}.` : `Current net balance is ${money(data.balance, isAr)}.`,
    },
  ];
  return [
    ...base,
    {
      title: isAr ? 'خطوة مقترحة' : 'Suggested action',
      body: suggestion(kind, isAr),
    },
  ];
}

function suggestion(kind: PageKind, isAr: boolean) {
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ابدأ بأكبر تصنيف مصروفات وخفّضه 5%.', en: 'Start with your largest expense category and reduce it by 5%.' },
    income: { ar: 'قسّم الدخل إلى راتب، دخل جانبي، وأعمال لقراءة أوضح.', en: 'Split income into salary, side income, and business for cleaner tracking.' },
    invest: { ar: 'حافظ على مساهمة شهرية ثابتة قبل زيادة المخاطر.', en: 'Keep a steady monthly contribution before increasing risk.' },
    goals: { ar: 'اربط كل هدف بمبلغ شهري صغير قابل للاستمرار.', en: 'Attach every goal to a small sustainable monthly amount.' },
    reports: { ar: 'اطبع التقرير قبل نهاية الشهر لمراجعة قراراتك.', en: 'Print the report before month-end to review decisions.' },
    ai: { ar: 'اسأل المساعد عن أفضل قرار واحد لهذا الأسبوع.', en: 'Ask the assistant for one best action this week.' },
  };
  return pick(text[kind], isAr);
}

function sectionTitle(kind: PageKind, isAr: boolean) {
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'آخر المصروفات والتصنيفات', en: 'Recent expenses and categories' },
    income: { ar: 'مصادر الدخل والتوزيع', en: 'Income sources and distribution' },
    invest: { ar: 'بطاقات المحفظة وفئات الاستثمار', en: 'Portfolio cards and investment categories' },
    goals: { ar: 'بطاقات تقدم الأهداف', en: 'Goal progress cards' },
    reports: { ar: 'ملخص التقارير المالية', en: 'Financial report summary' },
    ai: { ar: 'بطاقات العمل الذكية', en: 'Smart action cards' },
  };
  return pick(text[kind], isAr);
}

function summaryTitle(kind: PageKind, isAr: boolean) {
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ملخص المصروفات الشهري', en: 'Monthly expense summary' },
    income: { ar: 'ملخص توزيع الدخل', en: 'Income distribution summary' },
    invest: { ar: 'ملخص المساهمة الاستثمارية', en: 'Investment contribution summary' },
    goals: { ar: 'ملخص تقدم الادخار', en: 'Savings progress summary' },
    reports: { ar: 'جاهز للتصدير والطباعة', en: 'Ready to export and print' },
    ai: { ar: 'واجهة المساعد', en: 'Assistant interface' },
  };
  return pick(text[kind], isAr);
}

function summaryText(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean) {
  const values: Record<PageKind, LangText> = {
    expenses: { ar: `إجمالي المصروفات الحالي ${money(data.totalExpenses, isAr)} مع ${data.expenses.length} سجل.`, en: `Current expenses total ${money(data.totalExpenses, isAr)} across ${data.expenses.length} records.` },
    income: { ar: `الدخل الشهري الحالي ${money(data.totalIncome, isAr)} موزع على ${data.income.length} مصادر.`, en: `Monthly income is ${money(data.totalIncome, isAr)} across ${data.income.length} sources.` },
    invest: { ar: `قيمة المحفظة ${money(data.totalInvestments, isAr)} مع مساهمة مقترحة ${money(data.totalIncome * 0.15, isAr)}.`, en: `Portfolio value is ${money(data.totalInvestments, isAr)} with suggested contribution ${money(data.totalIncome * 0.15, isAr)}.` },
    goals: { ar: `مدخراتك الحالية ${money(data.totalSavings, isAr)} تقيس تقدم ${data.goals.length} أهداف.`, en: `Current savings of ${money(data.totalSavings, isAr)} measure progress across ${data.goals.length} goals.` },
    reports: { ar: 'استخدم أزرار الطباعة والتصدير لحفظ نسخة من ملخصك المالي.', en: 'Use print and export actions to save a copy of your financial summary.' },
    ai: { ar: 'اكتب سؤالك للحصول على مساعدة مالية موجهة حسب بياناتك.', en: 'Type a prompt to get financial guidance shaped by your data.' },
  };
  return pick(values[kind], isAr);
}

function buildPrimaryActions(kind: PageKind, isAr: boolean, router: ReturnType<typeof useRouter>, focusAi: () => void) {
  if (kind === 'reports') {
    return [
      { label: isAr ? 'طباعة' : 'Print', icon: Printer, variant: 'print' as const, onClick: () => window.print() },
      { label: isAr ? 'تصدير' : 'Export', icon: Download, variant: 'default' as const, onClick: () => window.print() },
    ];
  }
  if (kind === 'ai') {
    return [
      { label: isAr ? 'اسأل الآن' : 'Ask now', icon: Send, variant: 'default' as const, onClick: focusAi },
    ];
  }

  const routes: Record<Exclude<PageKind, 'reports' | 'ai'>, { label: LangText; href: string }> = {
    expenses: { label: { ar: 'إضافة مصروف', en: 'Add expense' }, href: '/expenses/add' },
    income: { label: { ar: 'إضافة دخل', en: 'Add income' }, href: '/income/add' },
    invest: { label: { ar: 'إضافة استثمار', en: 'Add investment' }, href: '/invest' },
    goals: { label: { ar: 'إضافة هدف', en: 'Add goal' }, href: '/projects' },
  };

  const action = routes[kind];
  return [
    { label: pick(action.label, isAr), icon: Plus, variant: 'default' as const, onClick: () => router.push(action.href) },
  ];
}

const baseStyles = `
  .sfm-shell{min-height:100vh;background:#F7F3EA;color:#111;display:flex;font-family:Tajawal,Arial,sans-serif}
  .sfm-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.2);border-top-color:#D8AE63;animation:spin 1s linear infinite;margin:auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sfm-sidebar{width:250px;background:#111;border-left:1px solid rgba(216,174,99,.22);padding:22px 16px;position:sticky;top:0;height:100vh;color:#FFFDFC;flex-shrink:0}
  [dir="ltr"] .sfm-sidebar{border-left:0;border-right:1px solid rgba(216,174,99,.22)}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;cursor:pointer}
  .brand-mark{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);display:grid;place-items:center;color:#111;font-weight:900}
  .brand strong{display:block;font-size:15px}.brand span{display:block;font-size:11px;color:rgba(255,255,255,.48);margin-top:2px}
  nav{display:grid;gap:7px}nav button,.mobile-panel button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:rgba(255,255,255,.62);padding:11px 12px;border-radius:12px;cursor:pointer;font:700 13px Tajawal,Arial,sans-serif;text-align:start}
  nav button:hover,nav button.active{background:rgba(216,174,99,.13);color:#D8AE63}
  .sfm-main{flex:1;padding:22px;max-width:1280px;margin:0 auto;width:100%}
  .sfm-header{height:62px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
  .title-wrap{display:flex;align-items:center;gap:13px}.title-wrap p{font-size:11px;color:#9A6C3C;font-weight:700;margin:0 0 3px}.title-wrap h1{font-size:24px;margin:0;font-weight:900}
  .title-icon{width:44px;height:44px;border-radius:14px;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent);display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 22%,transparent)}
  .icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;display:grid;place-items:center;cursor:pointer}.menu-btn{display:none}
  .hero{background:linear-gradient(135deg,#111 0%,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:0 18px 45px rgba(45,26,10,.16);margin-bottom:18px}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(216,174,99,.15);color:#D8AE63;font-size:11px;font-weight:800;margin-bottom:12px}.hero h2{font-size:34px;line-height:1.05;margin:0 0 9px}.hero p{max-width:640px;margin:0;color:rgba(255,255,255,.68);line-height:1.8;font-size:14px}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}.primary-btn,.ghost-btn{height:42px;border-radius:13px;border:0;padding:0 15px;font:800 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap}.primary-btn{background:#D8AE63;color:#111}.ghost-btn{background:rgba(255,255,255,.08);color:#FFFDFC;border:1px solid rgba(255,255,255,.12)}
  .notice{padding:12px 15px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:14px;margin-bottom:14px;font-size:13px;font-weight:700}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.kpi-card,.panel{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;box-shadow:0 4px 22px rgba(90,67,51,.06)}
  .kpi-card{padding:18px;position:relative;overflow:hidden}.kpi-card>span{position:absolute;inset-inline-start:0;top:0;width:4px;height:100%}.kpi-card p{font-size:12px;color:#9A6C3C;font-weight:800;margin:0 0 7px}.kpi-card strong{font-size:23px;font-weight:900;display:block}.kpi-card small{display:block;margin-top:8px;color:#7C6A5D;font-size:12px;line-height:1.6}
  .content-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(280px,.8fr);gap:18px}.panel{padding:20px}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.panel-head p{margin:0 0 4px;font-size:11px;color:#9A6C3C;font-weight:800}.panel-head h3{margin:0;font-size:18px}.loading-pill{font-size:11px;font-weight:800;color:#D8AE63;background:rgba(216,174,99,.11);border-radius:999px;padding:5px 10px}
  .row-list{display:grid;gap:10px}.data-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(216,174,99,.08)}.data-row:last-child{border-bottom:0}.data-row strong{display:block;font-size:14px}.data-row span{display:block;color:#8B7A6D;font-size:12px;margin-top:4px}.data-row b{font-size:14px;color:#D8AE63;white-space:nowrap}
  .insight-list{display:grid;gap:12px}.insight-list>div{display:flex;gap:10px;padding:12px;border-radius:14px;background:rgba(216,174,99,.07)}.insight-list svg{color:#D8AE63;flex-shrink:0}.insight-list strong{display:block;font-size:13px}.insight-list span{display:block;font-size:12px;color:#7C6A5D;line-height:1.6;margin-top:3px}
  .summary-band,.ai-panel{margin-top:18px;background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;padding:18px 20px;display:flex;align-items:center;gap:14px}.summary-band svg{color:#D8AE63}.summary-band strong,.ai-panel h3{font-size:16px}.summary-band p,.ai-panel p{margin:4px 0 0;color:#7C6A5D;line-height:1.7;font-size:13px}
  .ai-panel{align-items:stretch;justify-content:space-between}.chat-box{display:flex;gap:10px;min-width:min(460px,100%)}.chat-box input{height:46px;border:1.5px solid rgba(216,174,99,.22);border-radius:14px;padding:0 14px;background:#F7F3EA;min-width:0;flex:1;font:600 14px Tajawal,Arial,sans-serif;color:#111}.chat-box button{width:46px;border-radius:14px;border:0;background:#111;color:#D8AE63;display:grid;place-items:center}
  .mobile-panel{position:fixed;inset:12px;z-index:50;background:#111;border-radius:22px;padding:16px;color:#FFFDFC;box-shadow:0 24px 80px rgba(0,0,0,.35)}.mobile-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  @media(max-width:920px){.sfm-sidebar{display:none}.menu-btn{display:grid}.sfm-main{padding:16px}.hero{display:block}.hero-actions{margin-top:18px}.content-grid{grid-template-columns:1fr}.ai-panel{display:grid}.chat-box{min-width:0}}
  @media(max-width:640px){.kpi-grid{grid-template-columns:1fr}.sfm-header{height:auto}.title-wrap h1{font-size:20px}.hero{padding:22px}.hero h2{font-size:27px}.data-row{align-items:flex-start;flex-direction:column}.summary-band{align-items:flex-start}.primary-btn,.ghost-btn{width:100%;justify-content:center}}
`;
