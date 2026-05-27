'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit3, Loader2, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/layout/EmptyState';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_TEXT, SALE_STATUS_OPTIONS, normalizeBusinessLang, numericValue, saleStatusLabel, type SaleStatus } from '@/lib/businessOperations';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';

type SaleRow = {
  id: string;
  user_id: string;
  invoice_number: string | null;
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

function createEmptyForm(currency = 'KWD'): SaleForm {
  return {
    invoice_number: '',
    customer_name: '',
    product_or_service: '',
    amount: '',
    currency,
    status: 'pending',
    sale_date: today(),
    notes: '',
  };
}

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeBusinessLang(lang);
  const text = BUSINESS_TEXT[locale];
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [form, setForm] = useState<SaleForm>(() => createEmptyForm());
  const [formError, setFormError] = useState('');

  const loadSales = useCallback(async () => {
    if (!user) {
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
  }, [text.loadError, user]);

  useEffect(() => {
    if (!authLoading) void loadSales();
  }, [authLoading, loadSales]);

  useEffect(() => {
    setForm((current) => ({ ...current, currency: current.currency || defaultCurrency }));
  }, [defaultCurrency]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      if (!matchesStatus) return false;
      if (!needle) return true;
      return [row.customer_name, row.invoice_number, row.product_or_service, row.notes]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [query, rows, statusFilter]);

  const summary = useMemo(() => {
    const completed = rows.filter((row) => row.status === 'completed');
    return {
      totalSales: completed.reduce((total, row) => total + numericValue(row.amount), 0),
      completed: completed.length,
      pending: rows.filter((row) => row.status === 'pending' || !row.status).length,
      canceled: rows.filter((row) => row.status === 'canceled').length,
    };
  }, [rows]);

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
      status: SALE_STATUS_OPTIONS.includes(row.status as SaleStatus) ? row.status as SaleStatus : 'pending',
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
    if (!user) return;
    const amount = numericValue(form.amount);
    if (!form.customer_name.trim()) {
      setFormError(text.requiredField);
      return;
    }
    if (amount <= 0) {
      setFormError(text.invalidAmount);
      return;
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const payload = {
      user_id: user.id,
      invoice_number: form.invoice_number.trim() || null,
      customer_name: form.customer_name.trim(),
      product_or_service: form.product_or_service.trim() || null,
      amount,
      currency: form.currency || defaultCurrency,
      status: form.status,
      sale_date: form.sale_date || today(),
      notes: form.notes.trim() || null,
    };

    const db = supabase as any;
    const result = editing
      ? await db.from('business_sales').update(payload).eq('id', editing.id).eq('user_id', user.id)
      : await db.from('business_sales').insert(payload);

    setSaving(false);
    if (result.error) {
      setFormError(text.saveError);
      return;
    }

    setNotice(text.saleSaved);
    closeForm();
    await loadSales();
  }

  async function deleteSale(row: SaleRow) {
    if (!user || !window.confirm(text.confirmDeleteSale)) return;
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

  if (authLoading || loading) {
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
          actions={<button className="business-primary-btn" type="button" onClick={openCreate}><Plus size={16} />{text.addSale}</button>}
        />

        {error ? <div className="business-alert" role="alert">{error}</div> : null}
        {notice ? <div className="business-notice" role="status">{notice}</div> : null}

        <section className="business-stat-grid" aria-label={text.sales}>
          <article><span>{text.totalSales}</span><strong>{formatMoney(summary.totalSales, defaultCurrency, locale)}</strong></article>
          <article><span>{text.completedSales}</span><strong>{summary.completed.toLocaleString(locale === 'ar' ? 'ar-KW' : locale)}</strong></article>
          <article><span>{text.pendingSales}</span><strong>{summary.pending.toLocaleString(locale === 'ar' ? 'ar-KW' : locale)}</strong></article>
          <article><span>{text.canceledSales}</span><strong>{summary.canceled.toLocaleString(locale === 'ar' ? 'ar-KW' : locale)}</strong></article>
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
        </section>

        {formOpen ? (
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
                <input value={form.product_or_service} onChange={(event) => setForm({ ...form, product_or_service: event.target.value })} />
              </label>
              <label>
                <span>{text.amount}</span>
                <input required type="number" min="0" step="0.001" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
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
            actions={<button className="business-primary-btn" type="button" onClick={openCreate}><Plus size={16} />{text.addSale}</button>}
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
                      <td><span className={`business-status status-${row.status || 'pending'}`}>{saleStatusLabel(row.status, locale)}</span></td>
                      <td>{row.sale_date ? formatDate(row.sale_date, locale) : '-'}</td>
                      <td>
                        <div className="business-row-actions">
                          <button type="button" onClick={() => openEdit(row)} aria-label={text.edit}><Edit3 size={15} />{text.edit}</button>
                          <button type="button" className="danger" onClick={() => void deleteSale(row)} aria-label={text.delete}><Trash2 size={15} />{text.delete}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
  .business-back-link{width:max-content;display:inline-flex;align-items:center;gap:8px;color:var(--sfm-primary);text-decoration:none;font-weight:900}
  [dir="rtl"] .business-back-link svg{transform:scaleX(-1)}
  .business-loading{min-height:60vh;display:grid;place-items:center;align-content:center;gap:10px;color:var(--sfm-muted);font-weight:800}
  .business-spin{color:var(--sfm-primary);animation:business-spin .9s linear infinite}@keyframes business-spin{to{transform:rotate(360deg)}}
  .business-alert,.business-form-error{border:1px solid rgba(239,68,68,.24);background:rgba(239,68,68,.10);color:#B91C1C;border-radius:16px;padding:12px 14px;font-weight:850}
  .business-notice{border:1px solid rgba(16,185,129,.24);background:rgba(16,185,129,.10);color:#047857;border-radius:16px;padding:12px 14px;font-weight:850}
  .business-primary-btn,.business-ghost-btn{min-height:42px;border-radius:14px;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
  .business-primary-btn{border:1px solid rgba(167,243,240,.34);background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 14px 30px rgba(29,140,255,.18)}
  .business-ghost-btn{border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-primary)}
  .business-primary-btn:hover,.business-primary-btn:focus-visible,.business-ghost-btn:hover,.business-ghost-btn:focus-visible{transform:translateY(-1px);outline:2px solid rgba(24,212,212,.22);outline-offset:2px}
  .business-primary-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
  .business-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .business-stat-grid article,.business-form-card,.business-table-card{border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);border-radius:22px;box-shadow:0 16px 38px rgba(3,18,37,.07)}
  .business-stat-grid article{padding:16px;min-width:0}
  .business-stat-grid span{display:block;color:var(--sfm-muted);font-size:.88rem;font-weight:850}
  .business-stat-grid strong{display:block;margin-top:8px;color:var(--sfm-foreground);font-size:1.25rem;overflow-wrap:anywhere}
  .business-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,240px);gap:12px;align-items:center}
  .business-search{min-height:48px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);border-radius:16px;display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--sfm-muted)}
  .business-search input,.business-toolbar select,.business-form-grid input,.business-form-grid select,.business-form-grid textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:14px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}
  .business-search input{border:0;background:transparent;height:46px;padding:0}
  .business-search input:focus,.business-toolbar select:focus,.business-form-grid input:focus,.business-form-grid select:focus,.business-form-grid textarea:focus{box-shadow:0 0 0 3px rgba(24,212,212,.16);border-color:var(--sfm-accent)}
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
  .status-completed{background:rgba(16,185,129,.14);color:#047857}.status-canceled{background:rgba(239,68,68,.14);color:#B91C1C}
  .business-row-actions{display:flex;flex-wrap:wrap;gap:8px}
  .business-row-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);color:var(--sfm-primary);border-radius:12px;min-height:34px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-weight:900;cursor:pointer}
  .business-row-actions button.danger{color:#DC2626;border-color:rgba(239,68,68,.20)}
  .business-row-actions button:focus-visible{outline:2px solid rgba(24,212,212,.22);outline-offset:2px}
  .dark .business-alert,.dark .business-form-error{color:#FCA5A5}.dark .business-notice{color:#86EFAC}.dark .status-completed{color:#86EFAC}.dark .status-canceled{color:#FCA5A5}
  @media(max-width:760px){.business-topbar{justify-content:space-between;align-items:flex-start}.business-toolbar,.business-form-grid{grid-template-columns:1fr}.business-primary-btn,.business-ghost-btn,.business-form-actions{width:100%}.business-form-actions{display:grid}.business-table-card{border-radius:18px}table{min-width:720px}}
`;
