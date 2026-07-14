'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, BarChart3, Building2, Clock3, Eye, Globe2, Languages, LockKeyhole, LogIn, LogOut, MonitorSmartphone, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { COMPANY_CATEGORY_CONFIGS, isCompanyCategory } from '@/lib/companyListings';
import { TR } from '@/lib/translations';

type TranslationKey = keyof typeof TR;

type AdminData = {
  hasData: boolean;
  source?: string;
  stats: Record<string, number>;
  pages: Array<{ pageName: string; route: string; views: number; visitors: number; percentage: number }>;
  topPages?: Array<{ pageName: string; route: string; views: number; visitors: number; percentage: number }>;
  topSections?: Array<{ name: string; count: number; percentage: number }>;
  importantEvents: Array<{ event: string; count: number; uniqueUsers: number }>;
  devices: Array<{ name: string; count: number; percentage: number }>;
  languages: Array<{ name: string; count: number; percentage: number }>;
  recent: AdminActivityRow[];
  recentActivity?: AdminActivityRow[];
  tracking?: { enabled: boolean; recent: boolean; label: 'active' | 'no_recent_events' | 'disabled'; lastEventAt?: string | null };
};

type AdminActivityRow = {
  id: string;
  eventType: string;
  pagePath: string | null;
  sectionName?: string | null;
  module: string | null;
  device: string | null;
  language: string | null;
  createdAt: string;
};

type AdminCompanyListing = {
  id: string;
  company_name: string | null;
  category: string | null;
  country: string | null;
  city: string | null;
  status: string | null;
  created_at: string | null;
};

const rangeOptions: Array<[string, TranslationKey]> = [
  ['today', 'admin_today'],
  ['7d', 'admin_last_7_days'],
  ['30d', 'admin_last_30_days'],
  ['month', 'admin_this_month'],
  ['year', 'admin_this_year'],
  ['custom', 'admin_custom_range'],
];

const moduleOptions: Array<[string, TranslationKey]> = [
  ['all', 'admin_all'],
  ['home', 'admin_module_home'],
  ['ebooks', 'admin_module_ebooks'],
  ['income', 'admin_module_income'],
  ['expenses', 'admin_module_expenses'],
  ['savings', 'admin_module_savings'],
  ['goals', 'admin_module_goals'],
  ['debts', 'admin_module_debts'],
  ['projects', 'admin_module_projects'],
  ['reports', 'admin_module_reports'],
  ['financial_theories', 'admin_module_financial_theories'],
  ['market', 'admin_module_market'],
  ['charity', 'admin_module_charity'],
  ['business', 'admin_module_business'],
  ['investment_offers', 'admin_module_investment_offers'],
  ['profile', 'admin_module_profile'],
];

const eventOptions: Array<[string, TranslationKey]> = [
  ['all', 'admin_all_events'],
  ['page_view', 'admin_page_views'],
  ['section_view', 'admin_section_views'],
  ['account_created', 'admin_account_created'],
  ['login', 'admin_logins'],
  ['add_income', 'admin_add_income'],
  ['add_expense', 'admin_add_expense'],
  ['create_project', 'admin_create_project'],
  ['export_report', 'admin_export_report'],
  ['use_calculator', 'admin_use_calculator'],
];

const eventLabelKeys: Record<string, TranslationKey> = {
  section_view: 'admin_section_views',
  account_created: 'admin_account_created',
  add_income: 'admin_add_income',
  add_expense: 'admin_add_expense',
  create_project: 'admin_create_project',
  export_report: 'admin_export_report',
  use_calculator: 'admin_use_calculator',
  open_market_analysis: 'admin_open_market_analysis',
  open_financial_theories: 'admin_open_financial_theories',
  page_view: 'admin_page_views',
  signup: 'admin_signups',
  login: 'admin_logins',
  logout: 'nav_logout',
};

const LOCAL_COPY = {
  ar: {
    analyticsOverview: 'نظرة عامة على المنصة',
    trafficAndUsage: 'الزيارات والاستخدام',
    adminOperations: 'عمليات الأدمن',
    detailedLogs: 'سجل الأحداث التفصيلي',
    searchActivity: 'بحث في الأحداث أو المسارات',
    searchPlaceholder: 'ابحث عن حدث، صفحة، جهاز، أو لغة',
    deviceFilter: 'الجهاز',
    allDevices: 'كل الأجهزة',
    showingRows: 'المعروض',
    ofRows: 'من',
    showMore: 'عرض المزيد',
    showLess: 'تقليل العرض',
    source: 'المصدر',
    noMatchingRows: 'لا توجد أحداث مطابقة للفلاتر الحالية.',
    clearTableFilters: 'مسح فلاتر الجدول',
    activitySummary: 'ملخص الأحداث',
    recentEventsDescription: 'أحدث العمليات المسجلة ضمن الفترة والفلاتر المحددة.',
    detailedLogsDescription: 'عرض مختصر قابل للتمرير حتى لا تتحول لوحة الأدمن إلى سجل خام طويل.',
    companyQueueDescription: 'طلبات الشركات التي تحتاج قراراً من الأدمن.',
    topPagesDescription: 'الصفحات الأعلى استخداماً حسب عدد المشاهدات.',
    notAvailable: 'غير متاح',
  },
  en: {
    analyticsOverview: 'Platform overview',
    trafficAndUsage: 'Traffic and usage',
    adminOperations: 'Admin operations',
    detailedLogs: 'Detailed logs',
    searchActivity: 'Search activity or routes',
    searchPlaceholder: 'Search by event, page, device, or language',
    deviceFilter: 'Device',
    allDevices: 'All devices',
    showingRows: 'Showing',
    ofRows: 'of',
    showMore: 'Show more',
    showLess: 'Show less',
    source: 'Source',
    noMatchingRows: 'No events match the current table filters.',
    clearTableFilters: 'Clear table filters',
    activitySummary: 'Event summary',
    recentEventsDescription: 'Latest operations recorded for the selected period and filters.',
    detailedLogsDescription: 'A compact scrollable view so the admin dashboard does not become one long raw log.',
    companyQueueDescription: 'Company requests that need an admin decision.',
    topPagesDescription: 'Most used pages by view count.',
    notAvailable: 'Unavailable',
  },
  fr: {
    analyticsOverview: 'Vue d’ensemble',
    trafficAndUsage: 'Trafic et utilisation',
    adminOperations: 'Opérations admin',
    detailedLogs: 'Journaux détaillés',
    searchActivity: 'Rechercher événements ou routes',
    searchPlaceholder: 'Rechercher par événement, page, appareil ou langue',
    deviceFilter: 'Appareil',
    allDevices: 'Tous les appareils',
    showingRows: 'Affichés',
    ofRows: 'sur',
    showMore: 'Afficher plus',
    showLess: 'Réduire',
    source: 'Source',
    noMatchingRows: 'Aucun événement ne correspond aux filtres du tableau.',
    clearTableFilters: 'Effacer les filtres',
    activitySummary: 'Résumé des événements',
    recentEventsDescription: 'Dernières opérations enregistrées pour la période et les filtres sélectionnés.',
    detailedLogsDescription: 'Vue compacte avec défilement pour éviter un long journal brut.',
    companyQueueDescription: 'Demandes de sociétés nécessitant une décision admin.',
    topPagesDescription: 'Pages les plus utilisées selon les vues.',
    notAvailable: 'Indisponible',
  },
} satisfies Record<string, Record<string, string>>;

const pageLabelKeys: Record<string, TranslationKey> = {
  Home: 'admin_module_home',
  Income: 'admin_module_income',
  Expenses: 'admin_module_expenses',
  Debts: 'admin_module_debts',
  Savings: 'admin_module_savings',
  Goals: 'admin_module_goals',
  Projects: 'admin_module_projects',
  Reports: 'admin_module_reports',
  'Financial Theories': 'admin_module_financial_theories',
  'E-Books': 'admin_module_ebooks',
  'Market Analysis': 'admin_module_market',
  'Financial AI': 'nav_ai',
  'Charity / Zakat': 'admin_module_charity',
  'Business Management': 'admin_module_business',
  'Investment Offers': 'admin_module_investment_offers',
  Profile: 'admin_module_profile',
  'Other pages': 'admin_module_other',
};

const sectionLabelKeys: Record<string, TranslationKey> = {
  home: 'admin_module_home',
  income: 'admin_module_income',
  expenses: 'admin_module_expenses',
  savings: 'admin_module_savings',
  financial_goals: 'admin_module_goals',
  goals: 'admin_module_goals',
  debts: 'admin_module_debts',
  investments: 'nav_invest',
  projects: 'admin_module_projects',
  reports: 'admin_module_reports',
  financial_theories: 'admin_module_financial_theories',
  ebooks: 'admin_module_ebooks',
  market_analysis: 'admin_module_market',
  market: 'admin_module_market',
  charity: 'admin_module_charity',
  zakat: 'nav_zakat',
  financial_ai: 'nav_ai',
  business: 'admin_module_business',
  profile: 'admin_module_profile',
};

function formatNumber(value: number, lang: string) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US').format(value || 0);
}

function dateValue(daysBack = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string, lang: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRelative(value: string | null | undefined, lang: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const absSeconds = Math.abs(diffSeconds);
  if (absSeconds < 60) return formatter.format(diffSeconds, 'second');
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  return formatter.format(Math.round(diffHours / 24), 'day');
}

function activitySearchText(item: AdminActivityRow) {
  return [
    item.eventType,
    item.pagePath,
    item.sectionName,
    item.module,
    item.device,
    item.language,
    item.createdAt,
  ].filter(Boolean).join(' ').toLowerCase();
}

function displayValue(value: string | null | undefined, fallback: string) {
  const cleaned = String(value ?? '').trim();
  return cleaned || fallback;
}

export default function AdminAnalyticsClient() {
  const { user, loading, signOut } = useAuth();
  const { lang, dir, t } = useLanguage();
  const router = useRouter();
  const [range, setRange] = useState('30d');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [from, setFrom] = useState(dateValue(29));
  const [to, setTo] = useState(dateValue());
  const [data, setData] = useState<AdminData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error' | 'forbidden' | 'code_required'>('loading');
  const [adminCode, setAdminCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [companyRequests, setCompanyRequests] = useState<AdminCompanyListing[]>([]);
  const [companyRequestsState, setCompanyRequestsState] = useState<'loading' | 'ready' | 'empty' | 'error' | 'forbidden' | 'code_required'>('loading');
  const [updatingCompanyId, setUpdatingCompanyId] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityDevice, setActivityDevice] = useState('all');
  const [activityVisibleCount, setActivityVisibleCount] = useState(15);
  const [companyVisibleCount, setCompanyVisibleCount] = useState(12);
  const [pageVisibleCount, setPageVisibleCount] = useState(10);
  const loginLabel = lang === 'en' ? 'Sign in' : lang === 'fr' ? 'Connexion' : 'تسجيل الدخول';

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/login?next=/sfm-admin-control');
  }, [router, signOut]);

  const adminControls = (
    <div className="admin-topbar">
      <div className="admin-user-chip">{user?.email ?? 'THE SFM Admin'}</div>
      <div className="admin-control-actions">
        <LanguageSwitcher variant="light" compact />
        <ThemeToggle />
        {user ? (
          <button type="button" className="admin-auth-button secondary" onClick={() => void handleSignOut()} disabled={loading}>
            <LogOut size={16} aria-hidden="true" />
            {t('nav_logout')}
          </button>
        ) : (
          <Link className="admin-auth-button" href="/login?next=/sfm-admin-control">
            <LogIn size={16} aria-hidden="true" />
            {loginLabel}
          </Link>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/sfm-admin-control');
  }, [loading, router, user]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ range, module: moduleFilter, event: eventFilter });
    if (range === 'custom') {
      params.set('from', from);
      params.set('to', to);
    }
    return params.toString();
  }, [eventFilter, from, moduleFilter, range, to]);

  const load = useCallback(async () => {
    if (!user) return;
    setState('loading');
    try {
      const response = await fetch(`/api/admin/analytics?${query}`, { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/login?next=/sfm-admin-control');
        return;
      }
      if (response.status === 403) {
        setState('forbidden');
        return;
      }
      if (response.status === 428) {
        setState('code_required');
        return;
      }
      if (!response.ok) {
        setState('error');
        return;
      }
      const payload = await response.json() as AdminData;
      setData(payload);
      setState(payload.hasData ? 'ready' : 'empty');
    } catch {
      setState('error');
    }
  }, [query, router, user]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [load, loading, user]);

  const loadCompanyRequests = useCallback(async () => {
    if (!user) return;
    setCompanyRequestsState('loading');
    try {
      const response = await fetch('/api/company-listings/admin', { cache: 'no-store' });
      if (response.status === 428) {
        setCompanyRequestsState('code_required');
        return;
      }
      if (response.status === 403 || response.status === 401) {
        setCompanyRequestsState('forbidden');
        return;
      }
      if (!response.ok) {
        setCompanyRequestsState('error');
        return;
      }
      const payload = await response.json() as { ok?: boolean; items?: AdminCompanyListing[] };
      const items = payload.ok ? payload.items ?? [] : [];
      setCompanyRequests(items);
      setCompanyRequestsState(items.length ? 'ready' : 'empty');
    } catch {
      setCompanyRequestsState('error');
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user) void loadCompanyRequests();
  }, [loadCompanyRequests, loading, user]);

  useEffect(() => {
    setActivityVisibleCount(15);
    setPageVisibleCount(10);
  }, [eventFilter, moduleFilter, range, from, to]);

  const updateCompanyRequest = useCallback(async (id: string, status: 'approved' | 'rejected' | 'inactive') => {
    setUpdatingCompanyId(id);
    try {
      const response = await fetch('/api/company-listings/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) {
        setCompanyRequestsState('error');
        return;
      }
      setCompanyRequests(items => items.filter(item => item.id !== id));
    } catch {
      setCompanyRequestsState('error');
    } finally {
      setUpdatingCompanyId('');
    }
  }, []);

  const submitAdminCode = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingCode(true);
    setCodeError('');
    try {
      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: adminCode }),
      });
      if (response.ok) {
        setAdminCode('');
        await load();
        return;
      }
      if (response.status === 429) {
        setCodeError(t('admin_code_locked'));
      } else if (response.status === 500) {
        setCodeError(t('admin_code_missing_config'));
      } else {
        setCodeError(t('admin_code_invalid'));
      }
    } catch {
      setCodeError(t('admin_error'));
    } finally {
      setSubmittingCode(false);
    }
  }, [adminCode, load, t]);

  const stats = data?.stats ?? {};
  const trackingEnabled = data?.tracking?.enabled ?? true;
  const trackingRecent = data?.tracking?.recent ?? false;
  const trackingStatusKey: TranslationKey = !trackingEnabled
    ? 'admin_tracking_disabled'
    : trackingRecent
      ? 'admin_tracking_active'
      : 'admin_tracking_no_recent_events';
  const topPages = useMemo(() => data?.topPages ?? data?.pages ?? [], [data]);
  const topSections = useMemo(() => data?.topSections ?? [], [data]);
  const recent = useMemo(() => data?.recentActivity ?? data?.recent ?? [], [data]);
  const lastEventAt = data?.tracking?.lastEventAt ?? recent[0]?.createdAt ?? null;
  const hasAnalyticsRows = Boolean(data?.hasData && recent.length > 0);
  const statCards = [
    ['admin_total_visitors', stats.totalVisitors, Users],
    ['admin_visitors_today', stats.visitorsToday, Users],
    ['admin_visitors_week', stats.visitorsThisWeek ?? stats.visitorsWeek, Users],
    ['admin_visitors_month', stats.visitorsThisMonth ?? stats.visitorsMonth, Users],
    ['admin_total_page_views', stats.totalPageViews, Eye],
    ['admin_page_views_today', stats.pageViewsToday, Eye],
    ['admin_page_views_week', stats.pageViewsThisWeek ?? stats.pageViewsWeek, Eye],
    ['admin_page_views_month', stats.pageViewsThisMonth ?? stats.pageViewsMonth, Eye],
    ['admin_total_accounts', stats.totalAccounts ?? stats.totalUsers, ShieldCheck],
    ['admin_new_accounts_today', stats.accountsToday ?? stats.newUsersToday, ShieldCheck],
    ['admin_new_accounts_week', stats.accountsThisWeek ?? stats.newUsersWeek, ShieldCheck],
    ['admin_new_accounts_month', stats.accountsThisMonth ?? stats.newUsersMonth, ShieldCheck],
  ] as const;
  const copy = useMemo(() => LOCAL_COPY[lang] ?? LOCAL_COPY.en, [lang]);
  const deviceOptions = useMemo(
    () => Array.from(new Set(recent.map(item => item.device).filter((device): device is string => Boolean(device)))).sort(),
    [recent],
  );
  const filteredRecent = useMemo(() => {
    const needle = activitySearch.trim().toLowerCase();
    return recent.filter(item => {
      if (activityDevice !== 'all' && item.device !== activityDevice) return false;
      if (needle && !activitySearchText(item).includes(needle)) return false;
      return true;
    });
  }, [activityDevice, activitySearch, recent]);
  const visibleRecent = filteredRecent.slice(0, activityVisibleCount);
  const visibleCompanyRequests = companyRequests.slice(0, companyVisibleCount);
  const visibleTopPages = topPages.slice(0, pageVisibleCount);
  const importantEvents = data?.importantEvents ?? [];
  const primaryStatCards = statCards.slice(0, 4);
  const secondaryStatCards = statCards.slice(4);

  if (loading || (!user && state === 'loading')) {
    return <AdminShell dir={dir}>{adminControls}<StateCard icon={Clock3} text={t('admin_loading')} /></AdminShell>;
  }

  if (state === 'forbidden') {
    return <AdminShell dir={dir}>{adminControls}<StateCard icon={LockKeyhole} text={t('admin_unauthorized')} /></AdminShell>;
  }

  if (state === 'code_required') {
    return (
      <AdminShell dir={dir}>
        {adminControls}
        <section className="admin-code-card" aria-labelledby="admin-code-title">
          <div className="admin-code-icon" aria-hidden="true"><LockKeyhole size={24} /></div>
          <h1 id="admin-code-title">{t('admin_code_title')}</h1>
          <p>{t('admin_code_description')}</p>
          <form onSubmit={submitAdminCode}>
            <label>
              <span>{t('admin_code_label')}</span>
              <input
                type="password"
                value={adminCode}
                onChange={event => setAdminCode(event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            {codeError && <strong role="alert">{codeError}</strong>}
            <button type="submit" disabled={submittingCode || !adminCode.trim()}>
              {submittingCode ? t('admin_loading') : t('admin_code_submit')}
            </button>
          </form>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminDashboardShell
      ariaLabel={t('admin_dashboard_title')}
      contentClassName="admin-dashboard-content"
      contentStyle={{ maxWidth: 'none', width: '100%' }}
    >
      <div className="admin-dashboard" dir={dir}>
        {adminControls}
        <section className="admin-hero">
          <div>
            <span className="admin-eyebrow"><LockKeyhole size={16} aria-hidden="true" />THE SFM</span>
            <h1>{t('admin_dashboard_title')}</h1>
            <p>{t('admin_dashboard_subtitle')}</p>
          </div>
          <div className="admin-privacy-badge">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>{t('admin_no_private_financial_data')}</span>
          </div>
        </section>

        <section className="admin-filters" aria-label={t('admin_date_filter')}>
          <label>
            <span>{t('admin_date_filter')}</span>
            <select value={range} onChange={event => setRange(event.target.value)}>
              {rangeOptions.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select>
          </label>
          {range === 'custom' && (
            <>
              <label>
                <span>{t('admin_from')}</span>
                <input type="date" value={from} onChange={event => setFrom(event.target.value)} />
              </label>
              <label>
                <span>{t('admin_to')}</span>
                <input type="date" value={to} onChange={event => setTo(event.target.value)} />
              </label>
            </>
          )}
          <label>
            <span>{t('admin_module_filter')}</span>
            <select value={moduleFilter} onChange={event => setModuleFilter(event.target.value)}>
              {moduleOptions.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select>
          </label>
          <label>
            <span>{t('admin_event_filter')}</span>
            <select value={eventFilter} onChange={event => setEventFilter(event.target.value)}>
              {eventOptions.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select>
          </label>
        </section>

        {state === 'error' && <StateCard icon={Activity} text={t('admin_error')} />}
        {state === 'empty' && <StateCard icon={BarChart3} text={t('admin_no_data')} />}

        {data && (
          <section className="admin-overview-grid" aria-label={copy.analyticsOverview}>
            <article className={`admin-tracking-status ${!trackingEnabled ? 'disabled' : trackingRecent ? 'active' : 'stale'}`}>
              <div>
                <span>{t('admin_tracking_status')}</span>
                <strong>{t(trackingStatusKey)}</strong>
                <small>
                  {lastEventAt
                    ? `${t('admin_last_event')}: ${formatRelative(lastEventAt, lang, t('admin_last_event_pending'))}`
                    : t('admin_last_event_pending')}
                </small>
                <small>{copy.source}: {displayValue(data.source, copy.notAvailable)}</small>
              </div>
              <Activity size={24} aria-hidden="true" />
            </article>
            <div className="admin-stat-grid primary">
              {primaryStatCards.map(([label, value, Icon]) => (
                <article key={label} className="admin-stat-card primary-card">
                  <Icon size={20} aria-hidden="true" />
                  <span>{t(label)}</span>
                  <strong>{formatNumber(Number(value ?? 0), lang)}</strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {data && (
          <section className="admin-stat-grid secondary" aria-label={copy.trafficAndUsage}>
            {secondaryStatCards.map(([label, value, Icon]) => (
              <article key={label} className="admin-stat-card">
                <Icon size={18} aria-hidden="true" />
                <span>{t(label)}</span>
                <strong>{formatNumber(Number(value ?? 0), lang)}</strong>
              </article>
            ))}
          </section>
        )}

        <section className="admin-section-grid single">
          <Panel title={t('admin_company_requests')} icon={Building2}>
            <p className="admin-panel-copy">{copy.companyQueueDescription}</p>
            {companyRequestsState === 'loading' ? (
              <CompactEmpty title={t('admin_loading')} body={t('admin_company_requests_desc')} />
            ) : null}
            {companyRequestsState === 'error' ? (
              <CompactEmpty title={t('admin_error')} body={t('admin_company_requests_desc')} />
            ) : null}
            {companyRequestsState === 'empty' || (companyRequestsState === 'ready' && companyRequests.length === 0) ? (
              <CompactEmpty title={t('admin_company_no_requests')} body={t('admin_company_requests_desc')} />
            ) : null}
            {companyRequestsState === 'ready' && companyRequests.length > 0 ? (
              <div className="admin-table-wrap compact-scroll">
                <table>
                  <thead><tr><th>{t('company_listing_company_name')}</th><th>{t('company_listing_company_type')}</th><th>{t('company_listing_country')}</th><th>{t('company_listing_status')}</th><th>{t('admin_actions')}</th></tr></thead>
                  <tbody>
                    {visibleCompanyRequests.map(item => {
                      const categoryKey = isCompanyCategory(item.category) ? COMPANY_CATEGORY_CONFIGS[item.category].labelKey : 'company_listing_activity';
                      return (
                        <tr key={item.id}>
                          <td>{displayValue(item.company_name, copy.notAvailable)}</td>
                          <td>{t(categoryKey)}</td>
                          <td>{[item.country, item.city].filter(Boolean).join(' / ') || copy.notAvailable}</td>
                          <td>{t('company_listing_status_pending_review')}</td>
                          <td>
                            <div className="company-admin-actions">
                              <button type="button" onClick={() => void updateCompanyRequest(item.id, 'approved')} disabled={updatingCompanyId === item.id}>{t('admin_company_approve')}</button>
                              <button type="button" onClick={() => void updateCompanyRequest(item.id, 'rejected')} disabled={updatingCompanyId === item.id}>{t('admin_company_reject')}</button>
                              <button type="button" onClick={() => void updateCompanyRequest(item.id, 'inactive')} disabled={updatingCompanyId === item.id}>{t('admin_company_disable')}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePager
                  shown={visibleCompanyRequests.length}
                  total={companyRequests.length}
                  copy={copy}
                  onMore={() => setCompanyVisibleCount(count => count + 12)}
                  onLess={() => setCompanyVisibleCount(12)}
                />
              </div>
            ) : null}
          </Panel>
        </section>

        <section className="admin-section-grid">
          <Panel title={t('admin_most_used_pages')} icon={BarChart3}>
            <p className="admin-panel-copy">{copy.topPagesDescription}</p>
            {topPages.length > 0 ? (
              <div className="admin-table-wrap compact-scroll">
                <table>
                  <thead><tr><th>{t('admin_page_name')}</th><th>{t('admin_route')}</th><th>{t('admin_views')}</th><th>{t('admin_unique_visitors')}</th><th>{t('admin_percentage')}</th></tr></thead>
                  <tbody>
                    {visibleTopPages.map(page => (
                      <tr key={`${page.pageName}-${page.route}`}>
                        <td>{pageLabelKeys[page.pageName] ? t(pageLabelKeys[page.pageName]) : displayValue(page.pageName, copy.notAvailable)}</td>
                        <td dir="ltr">{displayValue(page.route, copy.notAvailable)}</td>
                        <td>{formatNumber(page.views, lang)}</td>
                        <td>{formatNumber(page.visitors, lang)}</td>
                        <td dir="ltr">{page.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager
                  shown={visibleTopPages.length}
                  total={topPages.length}
                  copy={copy}
                  onMore={() => setPageVisibleCount(count => count + 10)}
                  onLess={() => setPageVisibleCount(10)}
                />
              </div>
            ) : <CompactEmpty title={t('admin_no_visit_data_title')} body={t('admin_no_visit_data_body')} />}
          </Panel>

          <Panel title={t('admin_top_sections')} icon={Activity}>
            {topSections.length > 0 ? (
              <div className="admin-event-grid compact">
                {topSections.map(item => (
                  <article key={item.name}>
                    <span>{sectionLabelKeys[item.name] ? t(sectionLabelKeys[item.name]) : item.name}</span>
                    <strong>{formatNumber(item.count, lang)}</strong>
                    <small dir="ltr">{item.percentage}%</small>
                  </article>
                ))}
              </div>
            ) : <CompactEmpty title={t('admin_no_visit_data_title')} body={t('admin_no_visit_data_body')} />}
          </Panel>
        </section>

        <section className="admin-section-grid single">
          <Panel title={t('admin_important_events')} icon={Activity}>
            <p className="admin-panel-copy">{copy.activitySummary}</p>
            {importantEvents.length > 0 ? (
              <div className="admin-event-grid summary">
                {importantEvents.slice(0, 8).map(item => (
                  <article key={item.event}>
                    <span>{eventLabelKeys[item.event] ? t(eventLabelKeys[item.event]) : item.event}</span>
                    <strong>{formatNumber(item.count, lang)}</strong>
                    <small>{formatNumber(item.uniqueUsers, lang)} {t('admin_unique_visitors')}</small>
                  </article>
                ))}
              </div>
            ) : <CompactEmpty title={t('admin_no_events_registered_title')} body={t('admin_no_events_registered_body')} />}
          </Panel>
        </section>

        <section className="admin-section-grid two">
          <Breakdown title={t('admin_devices')} icon={MonitorSmartphone} items={data?.devices ?? []} lang={lang} emptyTitle={t('admin_no_visit_data_title')} emptyBody={t('admin_no_visit_data_body')} />
          <Breakdown title={t('admin_languages')} icon={Languages} items={data?.languages ?? []} lang={lang} emptyTitle={t('admin_no_visit_data_title')} emptyBody={t('admin_no_visit_data_body')} />
        </section>

        <Panel title={t('admin_recent_activity')} icon={Globe2}>
          <p className="admin-panel-copy">{copy.recentEventsDescription}</p>
          {hasAnalyticsRows ? (
            <>
              <div className="admin-table-tools" aria-label={copy.searchActivity}>
                <label>
                  <span>{copy.searchActivity}</span>
                  <input
                    value={activitySearch}
                    onChange={event => {
                      setActivitySearch(event.target.value);
                      setActivityVisibleCount(15);
                    }}
                    placeholder={copy.searchPlaceholder}
                  />
                </label>
                <label>
                  <span>{copy.deviceFilter}</span>
                  <select
                    value={activityDevice}
                    onChange={event => {
                      setActivityDevice(event.target.value);
                      setActivityVisibleCount(15);
                    }}
                  >
                    <option value="all">{copy.allDevices}</option>
                    {deviceOptions.map(device => <option key={device} value={device}>{device}</option>)}
                  </select>
                </label>
                {(activitySearch || activityDevice !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivitySearch('');
                      setActivityDevice('all');
                      setActivityVisibleCount(15);
                    }}
                  >
                    {copy.clearTableFilters}
                  </button>
                )}
              </div>
              {filteredRecent.length > 0 ? (
                <div className="admin-table-wrap admin-table-scroll">
                  <table>
                    <thead><tr><th>{t('admin_event_type')}</th><th>{t('admin_module')}</th><th>{t('admin_device')}</th><th>{t('admin_language')}</th><th>{t('admin_date')}</th></tr></thead>
                    <tbody>
                      {visibleRecent.map(item => (
                        <tr key={item.id}>
                          <td>{eventLabelKeys[item.eventType] ? t(eventLabelKeys[item.eventType]) : displayValue(item.eventType, copy.notAvailable)}</td>
                          <td>{sectionLabelKeys[item.sectionName || item.module || ''] ? t(sectionLabelKeys[item.sectionName || item.module || '']) : displayValue(item.module || item.pagePath, copy.notAvailable)}</td>
                          <td>{displayValue(item.device, copy.notAvailable)}</td>
                          <td>{displayValue(item.language, copy.notAvailable)}</td>
                          <td>{formatDateTime(item.createdAt, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <TablePager
                    shown={visibleRecent.length}
                    total={filteredRecent.length}
                    copy={copy}
                    onMore={() => setActivityVisibleCount(count => count + 15)}
                    onLess={() => setActivityVisibleCount(15)}
                  />
                </div>
              ) : (
                <CompactEmpty title={copy.noMatchingRows} body={copy.clearTableFilters} />
              )}
            </>
          ) : <CompactEmpty title={t('admin_no_events_registered_title')} body={t('admin_no_events_registered_body')} />}
        </Panel>

        <Panel title={copy.detailedLogs} icon={Activity}>
          <p className="admin-panel-copy">{copy.detailedLogsDescription}</p>
          {hasAnalyticsRows && filteredRecent.length > 0 ? (
            <div className="admin-table-wrap admin-table-scroll logs">
              <table>
                <thead><tr><th>{t('admin_event_type')}</th><th>{t('admin_route')}</th><th>{t('admin_module')}</th><th>{t('admin_device')}</th><th>{t('admin_date')}</th></tr></thead>
                <tbody>
                  {visibleRecent.map(item => (
                    <tr key={`log-${item.id}`}>
                      <td>{eventLabelKeys[item.eventType] ? t(eventLabelKeys[item.eventType]) : displayValue(item.eventType, copy.notAvailable)}</td>
                      <td dir="ltr">{displayValue(item.pagePath, copy.notAvailable)}</td>
                      <td>{sectionLabelKeys[item.sectionName || item.module || ''] ? t(sectionLabelKeys[item.sectionName || item.module || '']) : displayValue(item.sectionName || item.module, copy.notAvailable)}</td>
                      <td>{displayValue(item.device, copy.notAvailable)}</td>
                      <td>{formatDateTime(item.createdAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePager
                shown={visibleRecent.length}
                total={filteredRecent.length}
                copy={copy}
                onMore={() => setActivityVisibleCount(count => count + 15)}
                onLess={() => setActivityVisibleCount(15)}
              />
            </div>
          ) : (
            <CompactEmpty
              title={hasAnalyticsRows ? copy.noMatchingRows : t('admin_no_events_registered_title')}
              body={hasAnalyticsRows ? copy.clearTableFilters : t('admin_no_events_registered_body')}
            />
          )}
        </Panel>
      </div>
      <style jsx>{adminStyles}</style>
    </AdminDashboardShell>
  );
}

function AdminShell({ children, dir }: { children: React.ReactNode; dir: 'rtl' | 'ltr' }) {
  return (
    <AdminDashboardShell contentClassName="admin-dashboard-content" contentStyle={{ maxWidth: 'none', width: '100%' }}>
      <div className="admin-dashboard" dir={dir}>{children}</div>
      <style jsx>{adminStyles}</style>
    </AdminDashboardShell>
  );
}

function StateCard({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <section className="admin-state"><Icon size={24} aria-hidden="true" /><p>{text}</p></section>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="admin-panel">
      <h2><Icon size={18} aria-hidden="true" />{title}</h2>
      {children}
    </section>
  );
}

function CompactEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="admin-empty-compact">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function TablePager({
  shown,
  total,
  copy,
  onMore,
  onLess,
}: {
  shown: number;
  total: number;
  copy: typeof LOCAL_COPY.en;
  onMore: () => void;
  onLess: () => void;
}) {
  if (total <= 0) return null;
  const canShowMore = shown < total;
  const canShowLess = shown > 15 && total > 15;
  return (
    <div className="admin-table-pager">
      <span>{copy.showingRows} <strong dir="ltr">{shown}</strong> {copy.ofRows} <strong dir="ltr">{total}</strong></span>
      <div>
        {canShowLess && <button type="button" onClick={onLess}>{copy.showLess}</button>}
        {canShowMore && <button type="button" onClick={onMore}>{copy.showMore}</button>}
      </div>
    </div>
  );
}

function Breakdown({
  title,
  icon,
  items,
  lang,
  emptyTitle,
  emptyBody,
}: {
  title: string;
  icon: LucideIcon;
  items: Array<{ name: string; count: number; percentage: number }>;
  lang: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <Panel title={title} icon={icon}>
      {items.length > 0 ? (
        <div className="breakdown-list">
          {items.map(item => (
            <div key={item.name}>
              <span>{item.name}</span>
              <strong>{formatNumber(item.count, lang)}</strong>
              <em style={{ width: `${Math.min(100, item.percentage)}%` }} />
              <small dir="ltr">{item.percentage}%</small>
            </div>
          ))}
        </div>
      ) : <CompactEmpty title={emptyTitle} body={emptyBody} />}
    </Panel>
  );
}

const adminStyles = `
  :global(.admin-dashboard-content){max-width:none!important;width:100%!important;min-width:0!important}
  .admin-dashboard{width:100%;max-width:1500px;margin:0 auto;padding:clamp(16px,2vw,32px);display:grid;gap:18px;color:var(--foreground);font-family:var(--font-ui);min-width:0}
  .admin-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:12px;box-shadow:var(--shadow-card)}
  .admin-user-chip{min-height:42px;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground);padding:0 14px;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:var(--type-label-weight);overflow-wrap:anywhere}
  .admin-control-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .admin-control-actions :global(.sfm-language-trigger){background:var(--surface);border-color:var(--border-strong);color:var(--foreground);box-shadow:none}
  .admin-control-actions :global(.sfm-language-trigger:hover){background:var(--surface-hover);border-color:var(--primary);color:var(--primary-hover)}
  .admin-control-actions :global(.sfm-language-trigger:focus-visible){outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .admin-auth-button{min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-ui);font-size:13px;font-weight:var(--type-button-weight);text-decoration:none;cursor:pointer;box-shadow:none;transition:background var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease)}
  .admin-auth-button:hover{background:var(--primary-hover);border-color:var(--primary-hover)}
  .admin-auth-button:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .admin-auth-button.secondary{background:var(--surface);color:var(--foreground);border-color:var(--border-strong);box-shadow:none}
  .admin-auth-button.secondary:hover{background:var(--surface-hover);border-color:var(--primary);color:var(--primary-hover)}
  .admin-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-radius:var(--radius-panel);padding:24px;background:var(--hero-gradient);color:var(--hero-foreground);box-shadow:var(--shadow-card)}
  .admin-eyebrow,.admin-privacy-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb,var(--hero-foreground) 28%,transparent);background:color-mix(in srgb,var(--hero-foreground) 9%,transparent);border-radius:var(--radius-pill);padding:8px 12px;color:var(--hero-foreground-muted);font-weight:var(--type-label-weight)}
  .admin-hero h1{margin:13px 0 8px;font-size:clamp(28px,4.2vw,48px);line-height:1.05;font-weight:var(--type-display-weight);letter-spacing:0}
  .admin-hero p{max-width:760px;margin:0;color:var(--hero-foreground-muted);line-height:1.8;font-weight:var(--type-body-weight)}
  .admin-privacy-badge{flex-shrink:0;color:var(--warning);background:var(--warning-soft);border-color:var(--warning)}
  .admin-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:14px;box-shadow:var(--shadow-card);min-width:0}
  .admin-filters label{display:grid;gap:7px;min-width:0}
  .admin-filters span{font-size:12px;color:var(--foreground-muted);font-weight:var(--type-label-weight)}
  .admin-filters select,.admin-filters input{width:100%;min-height:42px;border-radius:var(--radius-control);border:1px solid var(--border-strong);background:var(--control-background);color:var(--foreground);padding:0 12px;font-family:var(--font-ui);font-size:13px;font-weight:var(--type-body-weight)}
  .admin-filters select:focus-visible,.admin-filters input:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .admin-overview-grid{display:grid;grid-template-columns:minmax(290px,.8fr) minmax(0,1.6fr);gap:14px;align-items:stretch;min-width:0}
  .admin-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;min-width:0}
  .admin-stat-grid.secondary{grid-template-columns:repeat(4,minmax(0,1fr))}
  .admin-stat-card,.admin-panel,.admin-state,.admin-tracking-status{border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);box-shadow:var(--shadow-card)}
  .admin-tracking-status{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 16px;border-color:var(--success);background:var(--success-soft)}
  .admin-tracking-status.stale{border-color:var(--warning);background:var(--warning-soft)}
  .admin-tracking-status.disabled{border-color:var(--danger);background:var(--danger-soft)}
  .admin-tracking-status span,.admin-tracking-status small{display:block;color:var(--foreground-secondary);font-weight:var(--type-body-weight);line-height:1.7}
  .admin-tracking-status strong{display:block;margin-top:2px;color:var(--foreground);font-size:18px;font-weight:var(--type-card-title-weight)}
  .admin-tracking-status svg{color:var(--success);flex:0 0 auto}
  .admin-tracking-status.stale svg{color:var(--warning)}
  .admin-tracking-status.disabled svg{color:var(--danger)}
  .admin-stat-card{display:grid;gap:7px;padding:15px;min-height:106px;min-width:0}
  .admin-stat-card.primary-card{min-height:130px;padding:18px}
  .admin-stat-card svg{color:var(--accent)}
  .admin-stat-card span{color:var(--foreground-muted);font-size:12px;font-weight:var(--type-label-weight)}
  .admin-stat-card strong{font-family:var(--font-data);font-size:25px;font-weight:var(--type-numeric-value-weight);color:var(--foreground);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
  .admin-stat-card.primary-card strong{font-size:clamp(28px,2.5vw,36px)}
  .admin-section-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px;align-items:start}
  .admin-section-grid.single{grid-template-columns:1fr}
  .admin-section-grid.two{grid-template-columns:1fr 1fr}
  .admin-panel{min-width:0;padding:16px;display:grid;gap:12px}
  .admin-panel h2{margin:0;display:flex;align-items:center;gap:8px;color:var(--foreground);font-size:18px;font-weight:var(--type-section-title-weight)}
  .admin-panel h2 svg{color:var(--accent)}
  .admin-panel-copy{margin:0;color:var(--foreground-secondary);line-height:1.7;font-weight:var(--type-body-weight)}
  .company-admin-actions{display:flex;flex-wrap:wrap;gap:7px}
  .company-admin-actions button{min-height:34px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--surface-muted);color:var(--foreground);padding:0 10px;font-family:var(--font-ui);font-size:12px;font-weight:var(--type-button-weight);cursor:pointer}
  .company-admin-actions button:first-child{border-color:var(--success);background:var(--success-soft);color:var(--success)}
  .company-admin-actions button:nth-child(2){border-color:var(--danger);background:var(--danger-soft);color:var(--danger)}
  .company-admin-actions button:hover:not(:disabled){background:var(--surface-hover)}
  .company-admin-actions button:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .company-admin-actions button:disabled{opacity:.65;cursor:not-allowed}
  .admin-table-wrap{max-width:100%;overflow:auto;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);min-width:0}
  .admin-table-wrap.compact-scroll{max-height:430px}
  .admin-table-wrap.admin-table-scroll{max-height:520px}
  .admin-table-wrap.logs{max-height:420px}
  table{width:100%;border-collapse:collapse;min-width:680px}
  .admin-compact-table{min-width:620px}
  th,td{padding:10px 9px;border-bottom:1px solid var(--border);text-align:start;font-size:12px;line-height:1.45}
  th{color:var(--foreground-secondary);font-weight:var(--type-table-header-weight);position:sticky;top:0;background:var(--table-header);z-index:1}
  td{color:var(--foreground);font-weight:var(--type-table-cell-weight)}
  tbody tr:hover{background:var(--table-row-hover)}
  .admin-event-grid{display:grid;gap:10px}
  .admin-event-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}
  .admin-event-grid.summary{grid-template-columns:repeat(4,minmax(0,1fr))}
  .admin-event-grid article{border:1px solid var(--border);background:var(--accent-soft);border-radius:var(--radius-card);padding:13px;display:grid;gap:5px}
  .admin-event-grid span,.breakdown-list span{color:var(--foreground-secondary);font-weight:var(--type-label-weight);font-size:12px}
  .admin-event-grid strong{font-family:var(--font-data);font-size:23px;font-weight:var(--type-numeric-value-weight);color:var(--foreground)}
  .admin-event-grid small,.breakdown-list small{color:var(--foreground-muted);font-weight:var(--type-body-weight)}
  .breakdown-list{display:grid;gap:12px}
  .breakdown-list div{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center}
  .breakdown-list em{grid-column:1/-1;height:9px;border-radius:var(--radius-pill);background:var(--primary);min-width:8px}
  .breakdown-list strong{font-family:var(--font-data);font-weight:var(--type-financial-value-weight);color:var(--foreground)}
  .admin-table-tools{display:grid;grid-template-columns:minmax(240px,1fr) minmax(180px,.32fr) auto;gap:10px;align-items:end}
  .admin-table-tools label{display:grid;gap:7px;min-width:0}
  .admin-table-tools span{font-size:12px;color:var(--foreground-muted);font-weight:var(--type-label-weight)}
  .admin-table-tools input,.admin-table-tools select{width:100%;min-height:42px;border-radius:var(--radius-control);border:1px solid var(--border-strong);background:var(--control-background);color:var(--foreground);padding:0 12px;font-family:var(--font-ui);font-size:13px;font-weight:var(--type-body-weight)}
  .admin-table-tools button,.admin-table-pager button{min-height:40px;border:1px solid var(--border-strong);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding:0 12px;font-family:var(--font-ui);font-size:12px;font-weight:var(--type-button-weight);cursor:pointer}
  .admin-table-tools input:focus-visible,.admin-table-tools select:focus-visible,.admin-table-tools button:focus-visible,.admin-table-pager button:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .admin-table-tools button:hover,.admin-table-pager button:hover:not(:disabled){background:var(--surface-hover);border-color:var(--primary);color:var(--primary-hover)}
  .admin-table-pager{display:flex;align-items:center;justify-content:space-between;gap:10px;position:sticky;bottom:0;background:var(--surface);border-top:1px solid var(--border);padding:10px 12px;color:var(--foreground-muted);font-size:12px;font-weight:var(--type-body-weight)}
  .admin-table-pager div{display:flex;gap:8px;flex-wrap:wrap}
  .admin-table-pager strong{font-family:var(--font-data);color:var(--foreground)}
  .admin-empty-compact{border:1px dashed var(--border-strong);background:var(--primary-soft);border-radius:var(--radius-card);padding:14px;display:grid;gap:5px}
  .admin-empty-compact strong{color:var(--foreground);font-size:13px;font-weight:var(--type-card-title-weight);line-height:1.45}
  .admin-empty-compact p{margin:0;color:var(--foreground-secondary);font-size:12px;font-weight:var(--type-body-weight);line-height:1.7}
  .admin-state{display:flex;align-items:center;gap:12px;padding:18px;color:var(--foreground)}
  .admin-state svg{color:var(--accent);flex:0 0 auto}
  .admin-state p{margin:0;color:var(--foreground-secondary);font-weight:var(--type-body-weight);line-height:1.8}
  .admin-code-card{width:min(100%,520px);margin:48px auto;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:26px;box-shadow:var(--shadow-card);display:grid;gap:14px}
  .admin-code-icon{width:54px;height:54px;border-radius:var(--radius-card);display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}
  .admin-code-card h1{margin:0;color:var(--foreground);font-size:28px;font-weight:var(--type-page-title-weight)}
  .admin-code-card p{margin:0;color:var(--foreground-secondary);line-height:1.8;font-weight:var(--type-body-weight)}
  .admin-code-card form{display:grid;gap:12px;margin-top:4px}
  .admin-code-card label{display:grid;gap:7px;color:var(--foreground);font-weight:var(--type-label-weight)}
  .admin-code-card input{min-height:48px;border-radius:var(--radius-control);border:1px solid var(--border-strong);background:var(--control-background);color:var(--foreground);padding:0 12px;font-family:var(--font-ui);font-size:15px;font-weight:var(--type-body-weight)}
  .admin-code-card input:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .admin-code-card strong{color:var(--danger);font-size:13px}
  .admin-code-card button{min-height:48px;border:1px solid var(--primary);border-radius:var(--radius-card);background:var(--primary);color:var(--primary-foreground);font-family:var(--font-ui);font-size:14px;font-weight:var(--type-button-weight);cursor:pointer}
  .admin-code-card button:hover:not(:disabled){background:var(--primary-hover);border-color:var(--primary-hover)}
  .admin-code-card button:focus-visible{outline:none;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
  .admin-code-card button:disabled{opacity:.6;cursor:not-allowed}
  @media(max-width:1200px){.admin-overview-grid{grid-template-columns:1fr}.admin-stat-grid,.admin-stat-grid.secondary,.admin-event-grid.summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:1100px){.admin-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-section-grid,.admin-section-grid.two,.admin-filters{grid-template-columns:1fr 1fr}.admin-table-tools{grid-template-columns:1fr 1fr}}
  @media(max-width:720px){.admin-dashboard{padding:14px}.admin-topbar{align-items:stretch}.admin-user-chip,.admin-control-actions,.admin-auth-button{width:100%}.admin-control-actions{display:grid;grid-template-columns:1fr 44px}.admin-auth-button{grid-column:1/-1}.admin-hero{display:grid;padding:20px}.admin-privacy-badge{width:max-content;max-width:100%}.admin-stat-grid,.admin-stat-grid.secondary,.admin-section-grid,.admin-section-grid.two,.admin-filters,.admin-event-grid.compact,.admin-event-grid.summary,.admin-table-tools{grid-template-columns:1fr}table{min-width:620px}.admin-stat-card strong{font-size:24px}.admin-table-pager{display:grid}.admin-table-pager div{justify-content:stretch}.admin-table-pager button{width:100%}}
`;
