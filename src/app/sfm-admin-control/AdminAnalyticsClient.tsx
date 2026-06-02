'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, BarChart3, Clock3, Eye, Globe2, Languages, LockKeyhole, MonitorSmartphone, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
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
  recent: Array<{ id: string; eventType: string; pagePath: string | null; sectionName?: string | null; module: string | null; device: string | null; language: string | null; createdAt: string }>;
  recentActivity?: Array<{ id: string; eventType: string; pagePath: string | null; sectionName?: string | null; module: string | null; device: string | null; language: string | null; createdAt: string }>;
  tracking?: { enabled: boolean; recent: boolean; label: 'active' | 'no_recent_events' | 'disabled' };
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
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US').format(value || 0);
}

function dateValue(daysBack = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

export default function AdminAnalyticsClient() {
  const { user, loading } = useAuth();
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
  const topPages = data?.topPages ?? data?.pages ?? [];
  const topSections = data?.topSections ?? [];
  const recent = data?.recentActivity ?? data?.recent ?? [];
  const statCards = [
    ['admin_total_visitors', stats.totalVisitors, Users],
    ['admin_visitors_today', stats.visitorsToday, Users],
    ['admin_visitors_week', stats.visitorsWeek, Users],
    ['admin_visitors_month', stats.visitorsMonth, Users],
    ['admin_total_page_views', stats.totalPageViews, Eye],
    ['admin_page_views_today', stats.pageViewsToday, Eye],
    ['admin_page_views_week', stats.pageViewsWeek, Eye],
    ['admin_page_views_month', stats.pageViewsMonth, Eye],
    ['admin_total_accounts', stats.totalUsers, ShieldCheck],
    ['admin_new_accounts_today', stats.newUsersToday, ShieldCheck],
    ['admin_new_accounts_week', stats.newUsersWeek, ShieldCheck],
    ['admin_new_accounts_month', stats.newUsersMonth, ShieldCheck],
  ] as const;

  if (loading || (!user && state === 'loading')) {
    return <AdminShell dir={dir}><StateCard icon={Clock3} text={t('admin_loading')} /></AdminShell>;
  }

  if (state === 'forbidden') {
    return <AdminShell dir={dir}><StateCard icon={LockKeyhole} text={t('admin_unauthorized')} /></AdminShell>;
  }

  if (state === 'code_required') {
    return (
      <AdminShell dir={dir}>
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
    <DashboardPageShell ariaLabel={t('admin_dashboard_title')} contentClassName="admin-dashboard-content">
      <main className="admin-dashboard" dir={dir}>
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
          <section className={`admin-tracking-status ${!trackingEnabled ? 'disabled' : trackingRecent ? 'active' : 'stale'}`}>
            <div>
              <span>{t('admin_tracking_status')}</span>
              <strong>{t(trackingStatusKey)}</strong>
              <small>{t('admin_tracking_privacy_note')}</small>
            </div>
            <Activity size={24} aria-hidden="true" />
          </section>
        )}

        <section className="admin-stat-grid">
          {statCards.map(([label, value, Icon]) => (
            <article key={label} className="admin-stat-card">
              <Icon size={19} aria-hidden="true" />
              <span>{t(label)}</span>
              <strong>{formatNumber(Number(value ?? 0), lang)}</strong>
            </article>
          ))}
        </section>

        <section className="admin-section-grid">
          <Panel title={t('admin_most_used_pages')} icon={BarChart3}>
            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>{t('admin_page_name')}</th><th>{t('admin_route')}</th><th>{t('admin_views')}</th><th>{t('admin_unique_visitors')}</th><th>{t('admin_percentage')}</th></tr></thead>
                <tbody>
                  {topPages.map(page => (
                    <tr key={`${page.pageName}-${page.route}`}>
                      <td>{pageLabelKeys[page.pageName] ? t(pageLabelKeys[page.pageName]) : page.pageName}</td>
                      <td>{page.route}</td>
                      <td>{formatNumber(page.views, lang)}</td>
                      <td>{formatNumber(page.visitors, lang)}</td>
                      <td>{page.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={t('admin_top_sections')} icon={Activity}>
            <div className="admin-event-grid">
              {topSections.map(item => (
                <article key={item.name}>
                  <span>{sectionLabelKeys[item.name] ? t(sectionLabelKeys[item.name]) : item.name}</span>
                  <strong>{formatNumber(item.count, lang)}</strong>
                  <small>{item.percentage}%</small>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="admin-section-grid single">
          <Panel title={t('admin_important_events')} icon={Activity}>
            <div className="admin-event-grid">
              {(data?.importantEvents ?? []).map(item => (
                <article key={item.event}>
                  <span>{t(eventLabelKeys[item.event] ?? 'admin_event_type')}</span>
                  <strong>{formatNumber(item.count, lang)}</strong>
                  <small>{formatNumber(item.uniqueUsers, lang)} {t('admin_unique_visitors')}</small>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="admin-section-grid two">
          <Breakdown title={t('admin_devices')} icon={MonitorSmartphone} items={data?.devices ?? []} lang={lang} />
          <Breakdown title={t('admin_languages')} icon={Languages} items={data?.languages ?? []} lang={lang} />
        </section>

        <Panel title={t('admin_recent_activity')} icon={Globe2}>
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>{t('admin_event_type')}</th><th>{t('admin_module')}</th><th>{t('admin_device')}</th><th>{t('admin_language')}</th><th>{t('admin_date')}</th></tr></thead>
              <tbody>
                {recent.map(item => (
                  <tr key={item.id}>
                    <td>{eventLabelKeys[item.eventType] ? t(eventLabelKeys[item.eventType]) : item.eventType}</td>
                    <td>{sectionLabelKeys[item.sectionName || item.module || ''] ? t(sectionLabelKeys[item.sectionName || item.module || '']) : item.module || item.pagePath || '-'}</td>
                    <td>{item.device || '-'}</td>
                    <td>{item.language || '-'}</td>
                    <td>{new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
      <style jsx>{adminStyles}</style>
    </DashboardPageShell>
  );
}

function AdminShell({ children, dir }: { children: React.ReactNode; dir: 'rtl' | 'ltr' }) {
  return (
    <DashboardPageShell contentClassName="admin-dashboard-content">
      <main className="admin-dashboard" dir={dir}>{children}</main>
      <style jsx>{adminStyles}</style>
    </DashboardPageShell>
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

function Breakdown({ title, icon, items, lang }: { title: string; icon: LucideIcon; items: Array<{ name: string; count: number; percentage: number }>; lang: string }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="breakdown-list">
        {items.map(item => (
          <div key={item.name}>
            <span>{item.name}</span>
            <strong>{formatNumber(item.count, lang)}</strong>
            <em style={{ width: `${Math.min(100, item.percentage)}%` }} />
            <small>{item.percentage}%</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const adminStyles = `
  .admin-dashboard{width:100%;max-width:1480px;margin:0 auto;padding:24px;display:grid;gap:18px;color:var(--sfm-foreground)}
  .admin-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-radius:28px;padding:28px;background:radial-gradient(circle at 12% 10%,rgba(34,211,238,.22),transparent 30%),linear-gradient(135deg,#061A2E,#0B2748 58%,#071E3A);color:#fff;box-shadow:0 24px 70px rgba(3,18,37,.18)}
  .admin-eyebrow,.admin-privacy-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.24);background:rgba(255,255,255,.08);border-radius:999px;padding:8px 12px;color:#A7F3F0;font-weight:950}
  .admin-hero h1{margin:16px 0 10px;font-size:clamp(30px,5vw,56px);line-height:1.05;font-weight:950;letter-spacing:0}
  .admin-hero p{max-width:760px;margin:0;color:#DCEBFA;line-height:1.8;font-weight:800}
  .admin-privacy-badge{flex-shrink:0;color:#FDE68A;border-color:rgba(251,191,36,.3)}
  .admin-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-card-bg);border-radius:22px;padding:16px;box-shadow:0 16px 40px rgba(3,18,37,.06)}
  .admin-filters label{display:grid;gap:7px;min-width:0}
  .admin-filters span{font-size:12px;color:var(--sfm-muted);font-weight:950}
  .admin-filters select,.admin-filters input{width:100%;min-height:42px;border-radius:14px;border:1px solid rgba(29,140,255,.16);background:var(--sfm-input-bg,#fff);color:var(--sfm-foreground);padding:0 12px;font:850 13px Tajawal,Arial,sans-serif}
  .admin-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .admin-stat-card,.admin-panel,.admin-state,.admin-tracking-status{border:1px solid rgba(29,140,255,.12);background:var(--sfm-card-bg);border-radius:22px;box-shadow:0 16px 40px rgba(3,18,37,.06)}
  .admin-tracking-status{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 18px;border-color:rgba(34,197,94,.22);background:linear-gradient(135deg,rgba(34,197,94,.10),var(--sfm-card-bg))}
  .admin-tracking-status.stale{border-color:rgba(245,158,11,.25);background:linear-gradient(135deg,rgba(245,158,11,.10),var(--sfm-card-bg))}
  .admin-tracking-status.disabled{border-color:rgba(239,68,68,.22);background:linear-gradient(135deg,rgba(239,68,68,.08),var(--sfm-card-bg))}
  .admin-tracking-status span,.admin-tracking-status small{display:block;color:var(--sfm-muted);font-weight:900;line-height:1.7}
  .admin-tracking-status strong{display:block;margin-top:2px;color:var(--sfm-foreground);font-size:18px;font-weight:950}
  .admin-tracking-status svg{color:#16A34A;flex:0 0 auto}
  .admin-tracking-status.stale svg{color:#D97706}
  .admin-tracking-status.disabled svg{color:#DC2626}
  .admin-stat-card{display:grid;gap:8px;padding:17px}
  .admin-stat-card svg{color:#18D4D4}
  .admin-stat-card span{color:var(--sfm-muted);font-size:12px;font-weight:950}
  .admin-stat-card strong{font-size:28px;font-weight:950;color:var(--sfm-foreground);font-variant-numeric:tabular-nums}
  .admin-section-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px;align-items:start}
  .admin-section-grid.single{grid-template-columns:1fr}
  .admin-section-grid.two{grid-template-columns:1fr 1fr}
  .admin-panel{min-width:0;padding:18px;display:grid;gap:14px}
  .admin-panel h2{margin:0;display:flex;align-items:center;gap:8px;color:var(--sfm-foreground);font-size:18px;font-weight:950}
  .admin-panel h2 svg{color:#18D4D4}
  .admin-table-wrap{max-width:100%;overflow-x:auto}
  table{width:100%;border-collapse:collapse;min-width:680px}
  th,td{padding:12px 10px;border-bottom:1px solid rgba(148,163,184,.18);text-align:start;font-size:13px}
  th{color:var(--sfm-muted);font-weight:950}
  td{color:var(--sfm-foreground);font-weight:800}
  .admin-event-grid{display:grid;gap:10px}
  .admin-event-grid article{border:1px solid rgba(24,212,212,.14);background:rgba(24,212,212,.07);border-radius:16px;padding:13px;display:grid;gap:5px}
  .admin-event-grid span,.breakdown-list span{color:var(--sfm-muted);font-weight:900;font-size:12px}
  .admin-event-grid strong{font-size:23px;font-weight:950;color:var(--sfm-foreground)}
  .admin-event-grid small,.breakdown-list small{color:var(--sfm-muted);font-weight:850}
  .breakdown-list{display:grid;gap:12px}
  .breakdown-list div{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center}
  .breakdown-list em{grid-column:1/-1;height:9px;border-radius:999px;background:linear-gradient(90deg,#1D8CFF,#18D4D4);min-width:8px}
  .breakdown-list strong{font-weight:950;color:var(--sfm-foreground)}
  .admin-state{display:flex;align-items:center;gap:12px;padding:18px;color:var(--sfm-foreground)}
  .admin-state svg{color:#18D4D4;flex:0 0 auto}
  .admin-state p{margin:0;color:var(--sfm-muted);font-weight:900;line-height:1.8}
  .admin-code-card{width:min(100%,520px);margin:48px auto;border:1px solid rgba(29,140,255,.14);background:var(--sfm-card-bg);border-radius:26px;padding:26px;box-shadow:0 24px 70px rgba(3,18,37,.12);display:grid;gap:14px}
  .admin-code-icon{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#061A2E}
  .admin-code-card h1{margin:0;color:var(--sfm-foreground);font-size:28px;font-weight:950}
  .admin-code-card p{margin:0;color:var(--sfm-muted);line-height:1.8;font-weight:850}
  .admin-code-card form{display:grid;gap:12px;margin-top:4px}
  .admin-code-card label{display:grid;gap:7px;color:var(--sfm-foreground);font-weight:950}
  .admin-code-card input{min-height:48px;border-radius:14px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-input-bg,#fff);color:var(--sfm-foreground);padding:0 12px;font:900 15px Tajawal,Arial,sans-serif}
  .admin-code-card strong{color:#DC2626;font-size:13px}
  .admin-code-card button{min-height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#061A2E;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer}
  .admin-code-card button:disabled{opacity:.6;cursor:not-allowed}
  :global(.dark) .admin-stat-card,:global(.dark) .admin-panel,:global(.dark) .admin-filters,:global(.dark) .admin-state,:global(.dark) .admin-code-card,:global(.dark) .admin-tracking-status{background:#102A45;border-color:rgba(255,255,255,.10);box-shadow:0 16px 44px rgba(0,0,0,.18)}
  :global(.dark) .admin-filters select,:global(.dark) .admin-filters input{background:#0F2942;border-color:rgba(255,255,255,.12);color:#F8FAFC}
  :global(.dark) .admin-code-card input{background:#0F2942;border-color:rgba(255,255,255,.12);color:#F8FAFC}
  @media(max-width:1100px){.admin-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-section-grid,.admin-section-grid.two,.admin-filters{grid-template-columns:1fr 1fr}}
  @media(max-width:720px){.admin-dashboard{padding:14px}.admin-hero{display:grid;padding:22px}.admin-privacy-badge{width:max-content;max-width:100%}.admin-stat-grid,.admin-section-grid,.admin-section-grid.two,.admin-filters{grid-template-columns:1fr}table{min-width:620px}.admin-stat-card strong{font-size:24px}}
`;
