'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertTriangle, BriefcaseBusiness, FileDown, FileText, FolderKanban, Loader2, Plus, ReceiptText, RefreshCw, ShoppingCart, Truck, UserRound, UsersRound } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_TEXT, businessRoleLabel, normalizeBusinessLang, numericValue, saleStatusLabel } from '@/lib/businessOperations';
import { aggregateBy, downloadCsv, downloadXlsx, monthLabel, nextPayrollDate, printPdf } from '@/lib/businessReports';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';

const BusinessOperationsChartCard = dynamic(() => import('@/components/business/BusinessOperationsChartCard'), {
  ssr: false,
  loading: () => <article className="business-chart-card business-chart-skeleton" aria-hidden="true" />,
});

type SaleRow = {
  id: string;
  customer_name: string;
  product_or_service: string | null;
  amount: number | string;
  currency: string | null;
  status: string | null;
  sale_date: string | null;
};

type EmployeeRow = {
  id: string;
  employee_name: string;
  salary: number | string | null;
  bonus: number | string | null;
  status: string | null;
  payroll_due_day: number | string | null;
};

type ProjectRow = {
  id: string;
};

type SummaryRow = {
  metric: string;
  value: string;
};

type BusinessLoadIssues = {
  projects?: string;
  sales?: string;
  employees?: string;
};

export default function BusinessOperationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeBusinessLang(lang);
  const text = BUSINESS_TEXT[locale];
  const { role, loading: roleLoading, permissions } = useBusinessRole(user?.id);
  const [salesRows, setSalesRows] = useState<SaleRow[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadIssues, setLoadIssues] = useState<BusinessLoadIssues>({});
  const [notice, setNotice] = useState('');

  const loadBusinessData = useCallback(async () => {
    if (!user) {
      setSalesRows([]);
      setEmployeeRows([]);
      setProjectRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setLoadIssues({});
    try {
      const db = supabase as any;
      const [profileResult, projectsResult, salesResult, employeesResult] = await Promise.all([
        db.from('profiles').select('default_currency').eq('id', user.id).maybeSingle(),
        db.from('projects').select('id').eq('user_id', user.id),
        permissions.canViewSales
          ? db.from('business_sales').select('id, customer_name, product_or_service, amount, currency, status, sale_date').eq('user_id', user.id).order('sale_date', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        permissions.canViewEmployees
          ? db.from('business_employees').select('id, employee_name, salary, bonus, status, payroll_due_day').eq('user_id', user.id).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profileResult.error) {
        console.warn('[BusinessOperations] Profile currency could not be loaded', profileResult.error);
      } else if (profileResult.data?.default_currency) {
        setDefaultCurrency(profileResult.data.default_currency);
      }

      const nextIssues: BusinessLoadIssues = {};

      if (projectsResult.error) {
        console.error('[BusinessOperations] Projects query failed', projectsResult.error);
        nextIssues.projects = text.loadError;
        setProjectRows([]);
      } else {
        setProjectRows(Array.isArray(projectsResult.data) ? (projectsResult.data as ProjectRow[]) : []);
      }

      if (salesResult.error) {
        console.error('[BusinessOperations] Sales query failed', salesResult.error);
        if (permissions.canViewSales) nextIssues.sales = text.loadError;
        setSalesRows([]);
      } else {
        setSalesRows(Array.isArray(salesResult.data) ? (salesResult.data as SaleRow[]) : []);
      }

      if (employeesResult.error) {
        console.error('[BusinessOperations] Employees query failed', employeesResult.error);
        if (permissions.canViewEmployees) nextIssues.employees = text.loadError;
        setEmployeeRows([]);
      } else {
        setEmployeeRows(Array.isArray(employeesResult.data) ? (employeesResult.data as EmployeeRow[]) : []);
      }

      setLoadIssues(nextIssues);

      const attemptedQueries = [
        { attempted: true, error: projectsResult.error },
        { attempted: permissions.canViewSales, error: salesResult.error },
        { attempted: permissions.canViewEmployees, error: employeesResult.error },
      ].filter(item => item.attempted);
      const everyAttemptedQueryFailed = attemptedQueries.length > 0 && attemptedQueries.every(item => Boolean(item.error));

      if (everyAttemptedQueryFailed) {
        console.error('[BusinessOperations] All business data sources failed', {
          projectsError: projectsResult.error,
          salesError: salesResult.error,
          employeesError: employeesResult.error,
        });
        setError(text.loadError);
        return;
      }
    } catch (loadError) {
      console.error('[BusinessOperations] Unexpected business data load error', loadError);
      setError(text.loadError);
    } finally {
      setLoading(false);
    }
  }, [permissions.canViewEmployees, permissions.canViewSales, text.loadError, user]);

  useEffect(() => {
    if (!authLoading && !roleLoading) void loadBusinessData();
  }, [authLoading, loadBusinessData, roleLoading]);

  const summary = useMemo(() => {
    const completedSales = salesRows.filter((row) => row.status === 'completed');
    const activeEmployees = employeeRows.filter((row) => row.status === 'active' || !row.status);
    const totalSales = completedSales.reduce((total, row) => total + numericValue(row.amount), 0);
    const payroll = activeEmployees.reduce((total, row) => total + numericValue(row.salary) + numericValue(row.bonus), 0);
    const nearestPayroll = activeEmployees
      .map((row) => nextPayrollDate(Number(row.payroll_due_day ?? 25)))
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    return {
      totalSales,
      projectCount: projectRows.length,
      salesCount: salesRows.length,
      employeeCount: employeeRows.length,
      activeEmployees: activeEmployees.length,
      payroll,
      nearestPayroll,
    };
  }, [employeeRows, projectRows.length, salesRows]);

  const chartData = useMemo(() => {
    const activeSales = salesRows.filter((row) => row.status !== 'canceled');
    const monthly = aggregateBy(
      activeSales,
      (row) => String(row.sale_date ?? '').slice(0, 7) || text.unclassified,
      (row) => numericValue(row.amount)
    ).sort((a, b) => a.name.localeCompare(b.name)).map((item) => ({ ...item, label: /^\d{4}-\d{2}$/.test(item.name) ? monthLabel(item.name, locale) : item.name }));
    const status = aggregateBy(salesRows, (row) => saleStatusLabel(row.status, locale), (row) => numericValue(row.amount));
    const products = aggregateBy(activeSales, (row) => row.product_or_service || text.unclassified, (row) => numericValue(row.amount))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { monthly, status, products };
  }, [locale, salesRows, text.unclassified]);

  const isEmpty = summary.projectCount === 0 && summary.salesCount === 0 && summary.employeeCount === 0;

  function summaryRows(): SummaryRow[] {
    return [
      { metric: text.totalSales, value: permissions.canViewSales ? formatMoney(summary.totalSales, defaultCurrency, locale) : text.permissionDenied },
      { metric: text.totalProjects, value: String(summary.projectCount) },
      { metric: text.sales, value: permissions.canViewSales ? String(summary.salesCount) : text.permissionDenied },
      { metric: text.totalEmployees, value: permissions.canViewEmployees ? String(summary.employeeCount) : text.permissionDenied },
      { metric: text.activeEmployees, value: permissions.canViewEmployees ? String(summary.activeEmployees) : text.permissionDenied },
      { metric: text.totalMonthlyCost, value: permissions.canViewPayrollTotals ? formatMoney(summary.payroll, defaultCurrency, locale) : text.permissionDenied },
      { metric: text.nearestPayrollDate, value: summary.nearestPayroll ? formatDate(summary.nearestPayroll, locale) : text.noPayrollDate },
    ];
  }

  function exportSummary(format: 'pdf' | 'xlsx' | 'csv') {
    if (!permissions.canExport) {
      setError(text.permissionDenied);
      return;
    }
    if (!salesRows.length && !employeeRows.length) {
      setNotice(text.noDataToExport);
      return;
    }
    const rows = summaryRows();
    const columns = [
      { key: 'metric', label: text.businessOperations, value: (row: SummaryRow) => row.metric },
      { key: 'value', label: text.amount, value: (row: SummaryRow) => row.value },
    ];
    const filters = [{ label: text.role, value: businessRoleLabel(role, locale) }];
    if (format === 'csv') downloadCsv('the-sfm-business-summary.csv', rows, columns);
    if (format === 'xlsx') void downloadXlsx('the-sfm-business-summary.xlsx', rows, columns, text.businessOperations);
    if (format === 'pdf') printPdf({ title: text.businessOperations, lang: locale, columns, rows, filters });
  }

  const cards = useMemo(() => [
    {
      title: text.projects,
      description: text.projectsDescription,
      href: '/projects',
      action: text.openProjects,
      icon: FolderKanban,
      active: true,
      allowed: true,
      count: summary.projectCount,
    },
    {
      title: text.sales,
      description: text.salesDescription,
      href: '/sales',
      action: text.openSales,
      icon: ShoppingCart,
      active: true,
      allowed: permissions.canViewSales,
      count: summary.salesCount,
    },
    {
      title: text.employees,
      description: text.employeesDescription,
      href: '/employees',
      action: text.openEmployees,
      icon: UsersRound,
      active: true,
      allowed: permissions.canViewEmployees,
      count: summary.employeeCount,
    },
    { title: text.customers, description: text.customersDescription, icon: UserRound, active: false, allowed: false, count: 0 },
    { title: text.invoices, description: text.invoicesDescription, icon: FileText, active: false, allowed: false, count: 0 },
    { title: text.suppliers, description: text.suppliersDescription, icon: Truck, active: false, allowed: false, count: 0 },
    { title: text.operatingExpenses, description: text.operatingExpensesDescription, icon: ReceiptText, active: false, allowed: false, count: 0 },
  ], [permissions.canViewEmployees, permissions.canViewSales, summary.employeeCount, summary.projectCount, summary.salesCount, text]);

  if (authLoading || loading || roleLoading) {
    return (
      <div className="business-ops-page" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={text.businessOperations}>
          <div className="business-loading">
            <Loader2 className="business-spin" size={24} aria-hidden="true" />
            <p>{text.loading}</p>
          </div>
        </DashboardPageShell>
        <style jsx global>{businessOperationsStyles}</style>
      </div>
    );
  }

  return (
    <div className="business-ops-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.businessOperations} contentClassName="business-ops-content">
        <div className="business-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.operationsBadge}
          title={text.businessOperations}
          subtitle={text.businessOperationsSubtitle}
          icon={<BriefcaseBusiness size={32} />}
          actions={permissions.canExport ? (
            <div className="business-hero-actions">
              <button className="business-ghost-btn" type="button" onClick={() => exportSummary('pdf')}><FileText size={16} />{text.exportPdf}</button>
              <button className="business-ghost-btn" type="button" onClick={() => exportSummary('xlsx')}><FileDown size={16} />{text.exportExcel}</button>
              <button className="business-ghost-btn" type="button" onClick={() => exportSummary('csv')}><FileDown size={16} />{text.exportCsv}</button>
            </div>
          ) : null}
        />

        {error ? (
          <div className="business-alert" role="alert">
            <span><AlertTriangle size={18} aria-hidden="true" />{error}</span>
            <button type="button" onClick={loadBusinessData}>
              <RefreshCw size={15} aria-hidden="true" />
              {text.retry}
            </button>
          </div>
        ) : null}
        {notice ? <div className="business-notice" role="status">{notice}</div> : null}

        <section className="business-summary-grid" aria-label={text.businessOperations}>
          {summaryRows().map((item) => (
            <article key={item.metric}>
              <span>{item.metric}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <section className="business-hub-grid" aria-label={text.businessOperations}>
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <>
                <div className="business-card-icon" aria-hidden="true"><Icon size={22} /></div>
                <div>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                </div>
                {card.active && card.allowed ? (
                  <div className="business-card-foot">
                    <span>{text.itemCount.replace('{count}', String(card.count ?? 0))}</span>
                    <strong>{card.action}</strong>
                  </div>
                ) : card.active ? (
                  <div className="business-card-foot muted">
                    <span>{text.itemCount.replace('{count}', String(card.count ?? 0))}</span>
                    <strong>{text.permissionDenied}</strong>
                  </div>
                ) : (
                  <div className="business-card-foot muted">
                    <span>{text.itemCount.replace('{count}', String(card.count ?? 0))}</span>
                    <strong>{text.comingSoon}</strong>
                  </div>
                )}
              </>
            );

            return card.active && card.allowed && card.href ? (
              <Link className="business-hub-card active" href={card.href} key={card.title}>
                {content}
              </Link>
            ) : (
              <AppCard className="business-hub-card" key={card.title}>
                {content}
              </AppCard>
            );
          })}
        </section>

        <section className="business-chart-grid" aria-label={text.monthlySales}>
          <BusinessOperationsChartCard title={text.monthlySales} data={chartData.monthly} currency={defaultCurrency} lang={locale} />
          <BusinessOperationsChartCard title={text.salesByStatus} data={chartData.status} currency={defaultCurrency} lang={locale} variant="pie" />
          <BusinessOperationsChartCard title={text.topProducts} data={chartData.products} currency={defaultCurrency} lang={locale} />
        </section>

        {!error && Object.keys(loadIssues).length > 0 ? (
          <div className="business-section-warning" role="status">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>{text.partialLoadWarning}</span>
          </div>
        ) : null}

        {isEmpty && !error ? (
          <EmptyState
            title={text.noDataYet}
            description={text.emptyDashboardBody}
            icon={<BriefcaseBusiness size={26} />}
            actions={(
              <Link className="business-empty-action" href="/sales">
                <Plus size={16} aria-hidden="true" />
                {text.addSale}
              </Link>
            )}
          />
        ) : null}
      </DashboardPageShell>
      <style jsx global>{businessOperationsStyles}</style>
    </div>
  );
}

const businessOperationsStyles = `
  .business-ops-page {
    min-height: 100vh;
    background: var(--sfm-background);
    color: var(--sfm-foreground);
  }

  .business-ops-content {
    display: grid;
    gap: 18px;
  }

  .business-topbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }

  .business-loading {
    min-height: 60vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    color: var(--sfm-muted);
    font-weight: 800;
  }

  .business-spin {
    color: var(--sfm-primary);
    animation: business-spin 0.9s linear infinite;
  }

  @keyframes business-spin {
    to { transform: rotate(360deg); }
  }

  .business-alert {
    border: 1px solid rgba(239, 68, 68, 0.24);
    background: rgba(239, 68, 68, 0.10);
    color: #B91C1C;
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 850;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .business-alert span,
  .business-alert button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .business-alert button {
    min-height: 36px;
    border: 1px solid rgba(185, 28, 28, 0.24);
    border-radius: 12px;
    background: var(--sfm-card);
    color: #B91C1C;
    padding: 0 12px;
    font-family: inherit;
    font-weight: 950;
    cursor: pointer;
  }

  .business-alert button:hover,
  .business-alert button:focus-visible {
    border-color: rgba(185, 28, 28, 0.42);
    outline: 2px solid rgba(239, 68, 68, 0.22);
    outline-offset: 2px;
  }

  .business-notice {
    border: 1px solid rgba(16, 185, 129, 0.24);
    background: rgba(16, 185, 129, 0.10);
    color: #047857;
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 850;
  }

  .business-section-warning {
    border: 1px solid rgba(245, 158, 11, 0.24);
    background: rgba(245, 158, 11, 0.09);
    color: #92400E;
    border-radius: 16px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 850;
  }

  .business-hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }

  .business-ghost-btn {
    min-height: 42px;
    border: 1px solid rgba(29, 140, 255, 0.18);
    border-radius: 14px;
    background: var(--sfm-card);
    color: var(--sfm-primary);
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    font-weight: 950;
    cursor: pointer;
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .business-ghost-btn:hover,
  .business-ghost-btn:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(24, 212, 212, 0.42);
    outline: 2px solid rgba(24, 212, 212, 0.22);
    outline-offset: 2px;
  }

  .business-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .business-summary-grid article,
  .business-chart-card {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-card);
    border-radius: 22px;
    box-shadow: 0 16px 38px rgba(3, 18, 37, 0.07);
  }

  .business-summary-grid article {
    padding: 16px;
  }

  .business-summary-grid span {
    display: block;
    color: var(--sfm-muted);
    font-size: 0.88rem;
    font-weight: 850;
  }

  .business-summary-grid strong {
    display: block;
    margin-top: 8px;
    color: var(--sfm-foreground);
    font-size: 1.18rem;
    overflow-wrap: anywhere;
  }

  .business-hub-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    gap: 16px;
    align-items: stretch;
  }

  .business-hub-card {
    min-width: 0;
    min-height: 210px;
    display: grid;
    align-content: start;
    gap: 14px;
    padding: 18px;
    text-decoration: none;
    color: inherit;
  }

  .business-hub-card.active {
    border: 1px solid rgba(29, 140, 255, 0.18);
    background: var(--sfm-card);
    border-radius: 24px;
    box-shadow: 0 18px 42px rgba(3, 18, 37, 0.08);
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .business-hub-card.active:hover,
  .business-hub-card.active:focus-visible {
    transform: translateY(-3px);
    border-color: rgba(24, 212, 212, 0.42);
    box-shadow: 0 24px 54px rgba(3, 18, 37, 0.12);
    outline: 2px solid rgba(24, 212, 212, 0.22);
    outline-offset: 2px;
  }

  .business-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: #EAF6FF;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    box-shadow: 0 14px 30px rgba(29, 140, 255, 0.20);
  }

  .business-hub-card h2 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 1.15rem;
  }

  .business-hub-card p {
    margin: 8px 0 0;
    color: var(--sfm-muted);
    line-height: 1.7;
  }

  .business-card-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid rgba(29, 140, 255, 0.12);
  }

  .business-card-foot span {
    color: var(--sfm-muted);
    font-weight: 850;
    font-size: 0.9rem;
  }

  .business-card-foot strong {
    color: var(--sfm-primary);
    font-weight: 950;
  }

  .business-card-foot.muted strong {
    color: var(--sfm-muted);
  }

  .business-chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    gap: 14px;
  }

  .business-chart-card {
    padding: 16px;
  }

  .business-chart-skeleton {
    min-height: 286px;
    background: linear-gradient(90deg, var(--sfm-card), var(--sfm-light-card), var(--sfm-card));
    background-size: 200% 100%;
    animation: business-chart-shimmer 1.25s linear infinite;
  }

  @keyframes business-chart-shimmer {
    to { background-position: -200% 0; }
  }

  .business-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .business-section-heading h2 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .business-chart-empty {
    min-height: 220px;
    margin: 0;
    display: grid;
    align-content: center;
    place-items: center;
    text-align: center;
    color: var(--sfm-muted);
    font-weight: 850;
    border: 1px dashed rgba(29, 140, 255, 0.22);
    border-radius: 16px;
    background: var(--sfm-light-card);
    padding: 22px;
    gap: 9px;
  }

  .business-chart-empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: #EAF6FF;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    box-shadow: 0 14px 30px rgba(29, 140, 255, 0.18);
  }

  .business-chart-empty strong {
    color: var(--sfm-foreground);
    font-size: 1rem;
  }

  .business-chart-empty p {
    margin: 0;
    max-width: 320px;
    line-height: 1.7;
  }

  .business-chart-empty-action {
    min-height: 38px;
    margin-top: 4px;
    padding: 0 14px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #fff;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    text-decoration: none;
    font-weight: 950;
    box-shadow: 0 12px 24px rgba(29, 140, 255, 0.20);
  }

  .business-empty-action {
    min-height: 42px;
    padding: 0 16px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    text-decoration: none;
    font-weight: 950;
    box-shadow: 0 14px 28px rgba(29, 140, 255, 0.20);
  }

  .business-empty-action:hover,
  .business-empty-action:focus-visible {
    transform: translateY(-1px);
    outline: 2px solid rgba(24, 212, 212, 0.36);
    outline-offset: 3px;
  }

  .business-chart-empty-action:focus-visible {
    outline: 2px solid rgba(24, 212, 212, 0.42);
    outline-offset: 3px;
  }

  .dark .business-alert {
    color: #FCA5A5;
    background: rgba(239, 68, 68, 0.14);
  }

  .dark .business-alert button {
    border-color: rgba(252, 165, 165, 0.28);
    background: rgba(15, 23, 42, 0.74);
    color: #FCA5A5;
  }

  .dark .business-notice {
    color: #86EFAC;
  }

  @media (max-width: 720px) {
    .business-topbar {
      justify-content: space-between;
      align-items: flex-start;
    }

    .business-card-foot {
      display: grid;
    }

    .business-hero-actions,
    .business-ghost-btn {
      width: 100%;
    }
  }
`;
