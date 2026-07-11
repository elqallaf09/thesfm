'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Edit3, FileDown, FileText, Loader2, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/layout/EmptyState';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import {
  BUSINESS_TEXT,
  SALE_STATUS_OPTIONS,
  businessRoleLabel,
  isActiveSaleStatus,
  isCancelledSaleStatus,
  normalizeBusinessLang,
  normalizeSaleStatus,
  numericValue,
  saleStatusLabel,
  type SaleStatus,
} from '@/lib/businessOperations';
import { aggregateBy, downloadCsv, downloadXlsx, isInDateRange, monthLabel, printPdf, saleExportColumns } from '@/lib/businessReports';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';
import { normalizeDigits } from '@/lib/locale';

const SalesChartCard = dynamic(() => import('@/components/business/SalesChartCard'), {
  ssr: false,
  loading: () => <article className="business-chart-card business-chart-skeleton" aria-hidden="true" />,
});

type SaleRow = {
  id: string;
  user_id: string;
  invoice_number: string | null;
  customer_id?: string | null;
  customer_name: string;
  product_or_service: string | null;
  amount: number | string;
  currency: string | null;
  status: SaleStatus | string | null;
  sale_date: string | null;
  notes: string | null;
};

type SaleForm = {
  invoice_number: string;
  customer_name: string;
  product_or_service: string;
  amount: string;
  currency: string;
  status: SaleStatus;
  sale_date: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function parseAmountInput(value: string) {
  const parsed = Number(normalizeDigits(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isValidDateInput(value: string) {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatDateToYYYYMMDD(value: string) {
  const normalized = value.trim();
  if (isValidDateInput(normalized)) return normalized;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function mapSaleStatusToDb(status: string | null | undefined): SaleStatus | null {
  const normalized = String(status ?? '').trim();
  if (normalized === 'مكتملة') return 'completed';
  if (normalized === 'معلقة') return 'pending';
  if (normalized === 'ملغاة') return 'cancelled';
  if (normalized === 'مستردة') return 'refunded';
  if (normalized === 'completed' || normalized === 'pending' || normalized === 'refunded') return normalized;
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return null;
}

function logSaleSaveError(error: any) {
  console.error('Sale save failed:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}

function isSalePermissionError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied');
}

function isSaleSchemaError(error: any) {
  const code = String(error?.code ?? '');
  const message = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code === '23502' ||
    code === '23503' ||
    code === '23514' ||
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('column') ||
    message.includes('constraint')
  );
}

function createEmptyForm(currency = 'KWD'): SaleForm {
  return {
    invoice_number: '',
    customer_name: '',
    product_or_service: '',
    amount: '',
    currency,
    status: 'completed',
    sale_date: today(),
    notes: '',
  };
}

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeBusinessLang(lang);
  const text = BUSINESS_TEXT[locale];
  const { role, loading: roleLoading, permissions } = useBusinessRole(user?.id);
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [form, setForm] = useState<SaleForm>(() => createEmptyForm());
  const [formError, setFormError] = useState('');

  const loadSales = useCallback(async () => {
    if (!user || !permissions.canViewSales) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const db = supabase as any;
    const [profileResult, salesResult] = await Promise.all([
      db.from('profiles').select('default_currency').eq('id', user.id).maybeSingle(),
      db.from('business_sales').select('*').eq('user_id', user.id).order('sale_date', { ascending: false }).order('created_at', { ascending: false }),
    ]);

    if (!profileResult.error && profileResult.data?.default_currency) {
      setDefaultCurrency(profileResult.data.default_currency);
    }

    if (salesResult.error) {
      setError(text.loadError);
      setRows([]);
    } else {
      setRows((salesResult.data ?? []) as SaleRow[]);
    }
    setLoading(false);
  }, [permissions.canViewSales, text.loadError, user]);

  useEffect(() => {
    if (!authLoading && !roleLoading) void loadSales();
  }, [authLoading, loadSales, roleLoading]);

  useEffect(() => {
    setForm((current) => ({ ...current, currency: current.currency || defaultCurrency }));
  }, [defaultCurrency]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const normalizedStatus = normalizeSaleStatus(row.status);
      const matchesNormalizedStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
      if (!matchesNormalizedStatus) return false;
      if (!isInDateRange(row.sale_date, fromDate, toDate)) return false;
      if (!needle) return true;
      return [row.customer_name, row.invoice_number, row.product_or_service, row.notes]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [fromDate, query, rows, statusFilter, toDate]);

  const summary = useMemo(() => {
    const completed = filteredRows.filter((row) => normalizeSaleStatus(row.status) === 'completed');
    return {
      totalSales: completed.reduce((total, row) => total + numericValue(row.amount), 0),
      completed: completed.length,
      pending: filteredRows.filter((row) => normalizeSaleStatus(row.status) === 'pending' || !row.status).length,
      canceled: filteredRows.filter((row) => isCancelledSaleStatus(row.status)).length,
    };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const activeSalesRows = filteredRows.filter((row) => isActiveSaleStatus(row.status));
    const monthly = aggregateBy(
      activeSalesRows,
      (row) => String(row.sale_date ?? '').slice(0, 7) || text.noDataYet,
      (row) => numericValue(row.amount)
    ).sort((a, b) => a.name.localeCompare(b.name)).map((item) => ({ ...item, label: /^\d{4}-\d{2}$/.test(item.name) ? monthLabel(item.name, locale) : item.name }));
    const yearly = aggregateBy(
      activeSalesRows,
      (row) => String(row.sale_date ?? '').slice(0, 4) || text.noDataYet,
      (row) => numericValue(row.amount)
    ).sort((a, b) => a.name.localeCompare(b.name));
    const status = aggregateBy(filteredRows, (row) => saleStatusLabel(row.status, locale), (row) => numericValue(row.amount));
    const products = aggregateBy(activeSalesRows, (row) => row.product_or_service || text.noDataYet, (row) => numericValue(row.amount))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const customers = aggregateBy(activeSalesRows, (row) => row.customer_name || text.noDataYet, (row) => numericValue(row.amount))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { monthly, yearly, status, products, customers };
  }, [filteredRows, locale, text.noDataYet]);

  function openCreate() {
    setEditing(null);
    setForm(createEmptyForm(defaultCurrency));
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(row: SaleRow) {
    setEditing(row);
    setForm({
      invoice_number: row.invoice_number ?? '',
      customer_name: row.customer_name ?? '',
      product_or_service: row.product_or_service ?? '',
      amount: String(row.amount ?? ''),
      currency: row.currency ?? defaultCurrency,
      status: SALE_STATUS_OPTIONS.includes(normalizeSaleStatus(row.status)) ? normalizeSaleStatus(row.status) : 'completed',
      sale_date: row.sale_date ?? today(),
      notes: row.notes ?? '',
    });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setForm(createEmptyForm(defaultCurrency));
    setFormError('');
    setFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setFormError(text.loginRequiredToSaveSale);
      return;
    }
    const currentUserId = user.id;
    if (!currentUserId) {
      setFormError(text.loginRequiredToSaveSale);
      return;
    }
    if (!permissions.canWriteSales) {
      setFormError(text.permissionDenied);
      return;
    }
    const customerName = form.customer_name.trim();
    const productOrService = form.product_or_service.trim();
    const amount = parseAmountInput(form.amount);
    const normalizedStatus = mapSaleStatusToDb(form.status);
    const saleDate = formatDateToYYYYMMDD(form.sale_date);
    const selectedCurrency = form.currency.trim() || defaultCurrency || 'KWD';
    if (!customerName) {
      setFormError(text.saleCustomerRequired);
      return;
    }
    if (!productOrService) {
      setFormError(text.saleProductRequired);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError(text.saleAmountRequired);
      return;
    }
    if (!selectedCurrency) {
      setFormError(text.businessValidationRequired);
      return;
    }
    if (!form.sale_date) {
      setFormError(text.saleDateRequired);
      return;
    }
    if (!saleDate || !isValidDateInput(saleDate)) {
      setFormError(text.saleDateInvalid);
      return;
    }
    if (!normalizedStatus || !SALE_STATUS_OPTIONS.includes(normalizedStatus)) {
      setFormError(text.saleStatusInvalid);
      return;
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const payload = {
      user_id: currentUserId,
      invoice_number: form.invoice_number.trim() || null,
      customer_id: null,
      customer_name: customerName,
      product_or_service: productOrService,
      amount,
      currency: selectedCurrency,
      status: normalizedStatus,
      sale_date: saleDate,
      notes: form.notes.trim() || null,
    };

    const db = supabase as any;
    let result: { error: any };
    try {
      result = editing
        ? await db.from('business_sales').update(payload).eq('id', editing.id).eq('user_id', currentUserId)
        : await db.from('business_sales').insert(payload);
    } catch (error) {
      setSaving(false);
      logSaleSaveError(error);
      setFormError(text.saleNetworkSaveError);
      return;
    }

    setSaving(false);
    if (result.error) {
      logSaleSaveError(result.error);
      if (isSalePermissionError(result.error)) setFormError(text.saleAccessDeniedSave);
      else if (isSaleSchemaError(result.error)) setFormError(text.saleSchemaSaveError);
      else setFormError(text.saleSaveFailedDetailed);
      return;
    }

    setNotice(text.saleSaved);
    closeForm();
    await loadSales();
  }

  async function deleteSale(row: SaleRow) {
    if (!user || !permissions.canDeleteSales || !window.confirm(text.confirmDeleteSale)) return;
    setNotice('');
    const db = supabase as any;
    const result = await db.from('business_sales').delete().eq('id', row.id).eq('user_id', user.id);
    if (result.error) {
      setError(text.deleteError);
      return;
    }
    setNotice(text.saleDeleted);
    await loadSales();
  }

  function exportRows(format: 'pdf' | 'xlsx' | 'csv') {
    if (!permissions.canExport) {
      setError(text.permissionDenied);
      return;
    }
    if (!filteredRows.length) {
      setNotice(text.noDataToExport);
      return;
    }
    const columns = saleExportColumns(locale, defaultCurrency);
    const dateRange = fromDate || toDate ? `${fromDate || text.allDates} - ${toDate || text.allDates}` : text.allDates;
    const filters = [
      { label: text.status, value: statusFilter === 'all' ? text.allStatuses : saleStatusLabel(statusFilter, locale) },
      { label: text.dateRange, value: dateRange },
      { label: text.role, value: businessRoleLabel(role, locale) },
    ];
    const totals = [
      { label: text.totalSales, value: formatMoney(summary.totalSales, defaultCurrency, locale) },
      { label: text.completedSales, value: String(summary.completed) },
      { label: text.pendingSales, value: String(summary.pending) },
      { label: text.canceledSales, value: String(summary.canceled) },
    ];
    if (format === 'csv') downloadCsv('the-sfm-sales.csv', filteredRows, columns);
    if (format === 'xlsx') void downloadXlsx('the-sfm-sales.xlsx', filteredRows, columns, text.sales);
    if (format === 'pdf') printPdf({ title: text.sales, lang: locale, columns, rows: filteredRows, totals, filters });
  }

  if (authLoading || loading || roleLoading) {
    return (
      <div className="business-ops-page" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={text.sales}>
          <div className="business-loading">
            <Loader2 className="business-spin" size={24} aria-hidden="true" />
            <p>{text.loading}</p>
          </div>
        </DashboardPageShell>
        <style jsx global>{salesStyles}</style>
      </div>
    );
  }

  return (
    <div className="business-ops-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.sales} contentClassName="business-records-content">
        <div className="business-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <Link className="business-back-link" href="/business-operations">
          <ArrowLeft size={16} aria-hidden="true" />
          {text.backToOperations}
        </Link>

        <PageHero
          eyebrow={text.businessOperations}
          title={text.sales}
          subtitle={text.salesDescription}
          icon={<ShoppingCart size={32} />}
          actions={
            <div className="business-hero-actions">
              {permissions.canWriteSales ? <button className="business-primary-btn" type="button" onClick={openCreate}><Plus size={16} />{text.addSale}</button> : null}
              {permissions.canExport ? (
                <>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('pdf')}><FileText size={16} />{text.exportPdf}</button>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('xlsx')}><FileDown size={16} />{text.exportExcel}</button>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('csv')}><FileDown size={16} />{text.exportCsv}</button>
                </>
              ) : null}
            </div>
          }
        />

        {!permissions.canViewSales ? (
          <EmptyState title={text.permissionDenied} description={businessRoleLabel(role, locale)} icon={<ShoppingCart size={26} />} />
        ) : (
          <>

        {error ? <div className="business-alert" role="alert">{error}</div> : null}
        {notice ? <div className="business-notice" role="status">{notice}</div> : null}

        <section className="business-stat-grid" aria-label={text.sales}>
          <article><span>{text.totalSales}</span><strong>{formatMoney(summary.totalSales, defaultCurrency, locale)}</strong></article>
          <article><span>{text.completedSales}</span><strong>{summary.completed.toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</strong></article>
          <article><span>{text.pendingSales}</span><strong>{summary.pending.toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</strong></article>
          <article><span>{text.canceledSales}</span><strong>{summary.canceled.toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</strong></article>
        </section>

        <section className="business-toolbar" aria-label={text.search}>
          <label className="business-search">
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchSales} />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | SaleStatus)} aria-label={text.status}>
            <option value="all">{text.allStatuses}</option>
            {SALE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{saleStatusLabel(status, locale)}</option>)}
          </select>
          <label className="business-date-filter">
            <span>{text.fromDate}</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="business-date-filter">
            <span>{text.toDate}</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </section>

        <section className="business-chart-grid" aria-label={text.monthlySales}>
          <SalesChartCard title={text.monthlySales} data={chartData.monthly} currency={defaultCurrency} lang={locale} />
          <SalesChartCard title={text.yearlySales} data={chartData.yearly} currency={defaultCurrency} lang={locale} />
          <SalesChartCard title={text.salesByStatus} data={chartData.status} currency={defaultCurrency} lang={locale} variant="pie" />
          <SalesChartCard title={text.topProducts} data={chartData.products} currency={defaultCurrency} lang={locale} />
          <SalesChartCard title={text.salesByCustomer} data={chartData.customers} currency={defaultCurrency} lang={locale} />
        </section>

        {formOpen && permissions.canWriteSales ? (
          <section className="business-form-card" aria-label={editing ? text.editSale : text.addSale}>
            <div className="business-section-heading">
              <h2>{editing ? text.editSale : text.addSale}</h2>
              <button type="button" className="business-ghost-btn" onClick={closeForm}>{text.cancel}</button>
            </div>
            {formError ? <div className="business-form-error" role="alert">{formError}</div> : null}
            <form className="business-form-grid" onSubmit={handleSubmit}>
              <label>
                <span>{text.invoiceNumber}</span>
                <input value={form.invoice_number} onChange={(event) => setForm({ ...form, invoice_number: event.target.value })} />
              </label>
              <label>
                <span>{text.customerName}</span>
                <input required value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} />
              </label>
              <label>
                <span>{text.productService}</span>
                <input required value={form.product_or_service} onChange={(event) => setForm({ ...form, product_or_service: event.target.value })} />
              </label>
              <label>
                <span>{text.amount}</span>
                <input required type="number" min="0.001" step="0.001" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
              </label>
              <CurrencySelect value={form.currency} onChange={(currency) => setForm({ ...form, currency })} lang={locale} label={text.currency} />
              <label>
                <span>{text.status}</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SaleStatus })}>
                  {SALE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{saleStatusLabel(status, locale)}</option>)}
                </select>
              </label>
              <label>
                <span>{text.saleDate}</span>
                <input type="date" value={form.sale_date} onChange={(event) => setForm({ ...form, sale_date: event.target.value })} />
              </label>
              <label className="business-full-field">
                <span>{text.notes}</span>
                <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>
              <div className="business-form-actions">
                <button className="business-primary-btn" type="submit" disabled={saving}>{saving ? text.loading : editing ? text.updateSale : text.saveSale}</button>
                <button className="business-ghost-btn" type="button" onClick={closeForm}>{text.cancel}</button>
              </div>
            </form>
          </section>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            title={text.noSalesYet}
            description={text.saleEmptyBody}
            icon={<ShoppingCart size={26} />}
            actions={permissions.canWriteSales ? <button className="business-primary-btn" type="button" onClick={openCreate}><Plus size={16} />{text.addSale}</button> : null}
          />
        ) : (
          <section className="business-table-card" aria-label={text.sales}>
            <div className="business-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{text.invoiceNumber}</th>
                    <th>{text.customer}</th>
                    <th>{text.productService}</th>
                    <th>{text.amount}</th>
                    <th>{text.status}</th>
                    <th>{text.saleDate}</th>
                    <th>{text.edit}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.invoice_number || '-'}</td>
                      <td><strong>{row.customer_name}</strong></td>
                      <td>{row.product_or_service || '-'}</td>
                      <td>{formatMoney(numericValue(row.amount), row.currency || defaultCurrency, locale)}</td>
                      <td><span className={`business-status status-${normalizeSaleStatus(row.status)}`}>{saleStatusLabel(row.status, locale)}</span></td>
                      <td>{row.sale_date ? formatDate(row.sale_date, locale) : '-'}</td>
                      <td>
                        <div className="business-row-actions">
                          {permissions.canWriteSales ? <button type="button" onClick={() => openEdit(row)} aria-label={text.edit}><Edit3 size={15} />{text.edit}</button> : null}
                          {permissions.canDeleteSales ? <button type="button" className="danger" onClick={() => void deleteSale(row)} aria-label={text.delete}><Trash2 size={15} />{text.delete}</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
          </>
        )}
      </DashboardPageShell>
      <style jsx global>{salesStyles}</style>
    </div>
  );
}

const salesStyles = `
  .business-ops-page{min-height:100vh;background:var(--sfm-background);color:var(--sfm-foreground)}
  .business-records-content{display:grid;gap:18px}
  .business-topbar{display:flex;justify-content:flex-end;align-items:center;gap:12px}
  .business-back-link{width:max-content;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid rgba(24,212,212,.28);background:rgba(29,140,255,.08);color:var(--sfm-primary);border-radius:var(--r-lg);padding:0 16px;text-decoration:none;font-size:.92rem;font-weight:950;box-shadow:0 12px 28px rgba(29,140,255,.08);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease,color .16s ease}
  .business-back-link svg{flex-shrink:0}
  [dir="rtl"] .business-back-link svg{transform:scaleX(-1)}
  .business-back-link:hover,.business-back-link:focus-visible{transform:translateY(-1px);border-color:rgba(24,212,212,.46);background:rgba(24,212,212,.14);color:var(--sfm-primary-dark);box-shadow:0 16px 34px rgba(29,140,255,.14);outline:2px solid rgba(24,212,212,.20);outline-offset:2px}
  .business-back-link:active{transform:translateY(0);box-shadow:0 8px 18px rgba(29,140,255,.10)}
  .business-loading{min-height:60vh;display:grid;place-items:center;align-content:center;gap:10px;color:var(--sfm-muted);font-weight:800}
  .business-spin{color:var(--sfm-primary);animation:business-spin .9s linear infinite}@keyframes business-spin{to{transform:rotate(360deg)}}
  .business-alert,.business-form-error{border:1px solid rgba(239,68,68,.24);background:rgba(239,68,68,.10);color:#B91C1C;border-radius:var(--r-lg);padding:12px 14px;font-weight:850}
  .business-notice{border:1px solid rgba(16,185,129,.24);background:rgba(16,185,129,.10);color:#047857;border-radius:var(--r-lg);padding:12px 14px;font-weight:850}
  .business-hero-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .business-primary-btn,.business-ghost-btn{min-height:42px;border-radius:var(--r-md);padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
  .business-primary-btn{border:1px solid rgba(167,243,240,.34);background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 14px 30px rgba(29,140,255,.18)}
  .business-ghost-btn{border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-primary)}
  .business-primary-btn:hover,.business-primary-btn:focus-visible,.business-ghost-btn:hover,.business-ghost-btn:focus-visible{transform:translateY(-1px);outline:2px solid rgba(24,212,212,.22);outline-offset:2px}
  .business-primary-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
  .business-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .business-stat-grid article,.business-form-card,.business-table-card{border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);border-radius:var(--r-2xl);box-shadow:0 16px 38px rgba(3,18,37,.07)}
  .business-stat-grid article{padding:16px;min-width:0}
  .business-stat-grid span{display:block;color:var(--sfm-muted);font-size:.88rem;font-weight:850}
  .business-stat-grid strong{display:block;margin-top:8px;color:var(--sfm-foreground);font-size:1.25rem;overflow-wrap:anywhere}
  .business-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,220px) minmax(150px,190px) minmax(150px,190px);gap:12px;align-items:center}
  .business-search{min-height:48px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);border-radius:var(--r-lg);display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--sfm-muted)}
  .business-search input,.business-toolbar select,.business-date-filter input,.business-form-grid input,.business-form-grid select,.business-form-grid textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:var(--r-md);padding:11px 12px;font-family:inherit;font-weight:800;outline:none}
  .business-search input{border:0;background:transparent;height:var(--control-h);padding:0}
  .business-date-filter{display:grid;gap:6px}.business-date-filter span{color:var(--sfm-muted);font-size:.78rem;font-weight:900}
  .business-search input:focus,.business-toolbar select:focus,.business-date-filter input:focus,.business-form-grid input:focus,.business-form-grid select:focus,.business-form-grid textarea:focus{box-shadow:0 0 0 3px rgba(24,212,212,.16);border-color:var(--sfm-accent)}
  .business-chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:14px}
  .business-chart-card{min-width:0;border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);border-radius:var(--r-2xl);padding:16px;box-shadow:0 16px 38px rgba(3,18,37,.07)}
  .business-chart-card .business-section-heading h2{display:flex;align-items:center;gap:8px;font-size:1rem}
  .business-chart-skeleton{min-height:288px;background:linear-gradient(90deg,var(--sfm-card),var(--sfm-light-card),var(--sfm-card));background-size:200% 100%;animation:business-chart-shimmer 1.25s linear infinite}
  @keyframes business-chart-shimmer{to{background-position:-200% 0}}
  .business-chart-empty{min-height:220px;margin:0;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);font-weight:850;border:1px dashed rgba(29,140,255,.22);border-radius:var(--r-lg);background:var(--sfm-light-card);padding:18px}
  .business-form-card{padding:18px}
  .business-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
  .business-section-heading h2{margin:0;color:var(--sfm-foreground)}
  .business-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .business-form-grid label{display:grid;gap:7px;min-width:0}
  .business-form-grid label span,.currency-label{color:var(--sfm-muted)!important;font-weight:900}
  .business-full-field,.business-form-actions{grid-column:1 / -1}
  .business-form-grid textarea{resize:vertical;line-height:1.7}
  .business-form-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .business-table-card{padding:0;overflow:hidden}
  .business-table-wrap{overflow:auto;max-width:100%}
  table{width:100%;border-collapse:collapse;min-width:860px}
  th,td{padding:14px 13px;text-align:start;border-bottom:1px solid rgba(29,140,255,.10);vertical-align:middle}
  th{background:rgba(29,140,255,.08);color:var(--sfm-muted);font-size:.82rem;font-weight:950;position:sticky;top:0;z-index:1}
  td{color:var(--sfm-foreground);font-weight:760}
  .business-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:.78rem;font-weight:950;background:rgba(29,140,255,.12);color:var(--sfm-primary)}
  .status-completed{background:rgba(16,185,129,.14);color:#047857}.status-cancelled,.status-canceled{background:rgba(239,68,68,.14);color:#B91C1C}.status-refunded{background:rgba(245,158,11,.16);color:#B45309}
  .business-row-actions{display:flex;flex-wrap:wrap;gap:8px}
  .business-row-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);color:var(--sfm-primary);border-radius:var(--r-md);min-height:34px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-weight:900;cursor:pointer}
  .business-row-actions button.danger{color:#DC2626;border-color:rgba(239,68,68,.20)}
  .business-row-actions button:focus-visible{outline:2px solid rgba(24,212,212,.22);outline-offset:2px}
  .dark .business-alert,.dark .business-form-error{color:#FCA5A5}.dark .business-notice{color:#86EFAC}.dark .status-completed{color:#86EFAC}.dark .status-cancelled,.dark .status-canceled{color:#FCA5A5}.dark .status-refunded{color:#FCD34D}
  @media(max-width:980px){.business-toolbar{grid-template-columns:1fr 1fr}.business-search{grid-column:1 / -1}}
  @media(max-width:760px){.business-topbar{justify-content:space-between;align-items:flex-start}.business-back-link{width:100%;min-height:46px}.business-toolbar,.business-form-grid{grid-template-columns:1fr}.business-search{grid-column:auto}.business-hero-actions,.business-primary-btn,.business-ghost-btn,.business-form-actions{width:100%}.business-form-actions{display:grid}.business-table-card{border-radius:var(--r-xl)}table{min-width:720px}}
`;
