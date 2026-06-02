'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit3, FileDown, FileText, Loader2, Plus, ReceiptText, Search, Trash2, Truck, UserRound, WalletCards } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/layout/EmptyState';
import { CurrencySelect } from '@/components/CurrencySelect';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import {
  BUSINESS_INVOICE_STATUS_OPTIONS,
  BUSINESS_OPERATING_EXPENSE_CATEGORY_OPTIONS,
  BUSINESS_TEXT,
  invoiceStatusLabel,
  normalizeBusinessLang,
  numericValue,
  operatingExpenseCategoryLabel,
  type BusinessLang,
} from '@/lib/businessOperations';
import { downloadCsv, downloadXlsx, printPdf } from '@/lib/businessReports';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';

type BusinessModuleKind = 'customers' | 'invoices' | 'suppliers' | 'operatingExpenses';
type BusinessRecord = Record<string, any>;
type BusinessFormValue = string | boolean;

type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'currency' | 'customer';

type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  full?: boolean;
  defaultValue?: BusinessFormValue;
  options?: Array<{ value: string; label: string }>;
};

type SummaryItem = {
  label: string;
  value: string;
};

type ModuleConfig = {
  tableName: string;
  title: string;
  description: string;
  addLabel: string;
  editLabel: string;
  deleteLabel: string;
  savedLabel: string;
  deletedLabel: string;
  confirmDeleteLabel: string;
  emptyTitle: string;
  emptyBody: string;
  searchPlaceholder: string;
  exportFileBase: string;
  icon: ReactNode;
  primaryField: string;
  secondaryFields: string[];
  searchFields: string[];
  dateField?: string;
  amountField?: string;
  currencyField?: string;
  fields: FieldConfig[];
  getTitle?: (row: BusinessRecord, helpers: FormatHelpers) => string;
  getSummary: (rows: BusinessRecord[], filteredRows: BusinessRecord[], helpers: FormatHelpers) => SummaryItem[];
};

type FormatHelpers = {
  text: typeof BUSINESS_TEXT[BusinessLang];
  locale: BusinessLang;
  defaultCurrency: string;
  customerName: (id: unknown) => string;
  formatValue: (field: FieldConfig, value: unknown, row?: BusinessRecord) => string;
};

const today = () => new Date().toISOString().slice(0, 10);

function valueAsString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function booleanLabel(value: unknown, locale: BusinessLang) {
  if (locale === 'ar') return value ? 'نعم' : 'لا';
  if (locale === 'fr') return value ? 'Oui' : 'Non';
  return value ? 'Yes' : 'No';
}

function makeEmptyForm(fields: FieldConfig[], defaultCurrency: string): Record<string, BusinessFormValue> {
  return fields.reduce<Record<string, BusinessFormValue>>((form, field) => {
    if (field.type === 'checkbox') form[field.key] = Boolean(field.defaultValue);
    else if (field.type === 'currency') form[field.key] = valueAsString(field.defaultValue || defaultCurrency);
    else if (field.type === 'date') form[field.key] = valueAsString(field.defaultValue || (field.required ? today() : ''));
    else form[field.key] = valueAsString(field.defaultValue ?? '');
    return form;
  }, {});
}

function createConfig(
  module: BusinessModuleKind,
  text: typeof BUSINESS_TEXT[BusinessLang],
  locale: BusinessLang,
  customerOptions: Array<{ value: string; label: string }>,
): ModuleConfig {
  const invoiceStatusOptions = BUSINESS_INVOICE_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: invoiceStatusLabel(status, locale),
  }));
  const expenseCategoryOptions = BUSINESS_OPERATING_EXPENSE_CATEGORY_OPTIONS.map((category) => ({
    value: category,
    label: operatingExpenseCategoryLabel(category, locale),
  }));

  if (module === 'invoices') {
    return {
      tableName: 'business_invoices',
      title: text.invoices,
      description: text.invoicesDescription,
      addLabel: text.addInvoice,
      editLabel: text.editInvoice,
      deleteLabel: text.deleteInvoice,
      savedLabel: text.invoiceSaved,
      deletedLabel: text.invoiceDeleted,
      confirmDeleteLabel: text.confirmDeleteInvoice,
      emptyTitle: text.noInvoicesYet,
      emptyBody: text.invoiceEmptyBody,
      searchPlaceholder: text.searchInvoices,
      exportFileBase: 'the-sfm-business-invoices',
      icon: <FileText size={32} />,
      primaryField: 'invoice_number',
      secondaryFields: ['title', 'customer_id', 'status', 'invoice_date', 'due_date', 'amount', 'notes'],
      searchFields: ['invoice_number', 'title', 'notes'],
      dateField: 'invoice_date',
      amountField: 'amount',
      currencyField: 'currency',
      fields: [
        { key: 'invoice_number', label: text.invoiceNumber, type: 'text' },
        { key: 'title', label: text.invoiceTitle, type: 'text' },
        { key: 'customer_id', label: text.customer, type: 'customer', options: customerOptions },
        { key: 'amount', label: text.amount, type: 'number', required: true },
        { key: 'currency', label: text.currency, type: 'currency', defaultValue: 'KWD' },
        { key: 'status', label: text.status, type: 'select', defaultValue: 'draft', options: invoiceStatusOptions },
        { key: 'invoice_date', label: text.invoiceDate, type: 'date', required: true, defaultValue: today() },
        { key: 'due_date', label: text.dueDate, type: 'date' },
        { key: 'notes', label: text.notes, type: 'textarea', full: true },
      ],
      getTitle: (row) => valueAsString(row.invoice_number || row.title || text.invoices),
      getSummary: (rows, filteredRows, helpers) => {
        const total = filteredRows.reduce((sum, row) => sum + numericValue(row.amount), 0);
        return [
          { label: text.invoices, value: String(rows.length) },
          { label: text.amount, value: formatMoney(total, helpers.defaultCurrency, helpers.locale) },
          { label: text.paid, value: String(filteredRows.filter((row) => row.status === 'paid').length) },
          { label: text.overdue, value: String(filteredRows.filter((row) => row.status === 'overdue').length) },
        ];
      },
    };
  }

  if (module === 'suppliers') {
    return {
      tableName: 'business_suppliers',
      title: text.suppliers,
      description: text.suppliersDescription,
      addLabel: text.addSupplier,
      editLabel: text.editSupplier,
      deleteLabel: text.deleteSupplier,
      savedLabel: text.supplierSaved,
      deletedLabel: text.supplierDeleted,
      confirmDeleteLabel: text.confirmDeleteSupplier,
      emptyTitle: text.noSuppliersYet,
      emptyBody: text.supplierEmptyBody,
      searchPlaceholder: text.searchSuppliers,
      exportFileBase: 'the-sfm-business-suppliers',
      icon: <Truck size={32} />,
      primaryField: 'name',
      secondaryFields: ['company', 'supply_type', 'phone', 'email', 'address', 'notes'],
      searchFields: ['name', 'company', 'supply_type', 'phone', 'email', 'notes'],
      fields: [
        { key: 'name', label: text.supplierName, type: 'text', required: true },
        { key: 'phone', label: text.phone, type: 'tel' },
        { key: 'email', label: text.email, type: 'email' },
        { key: 'company', label: text.company, type: 'text' },
        { key: 'supply_type', label: text.supplierType, type: 'text' },
        { key: 'address', label: text.address, type: 'textarea', full: true },
        { key: 'notes', label: text.notes, type: 'textarea', full: true },
      ],
      getSummary: (rows, filteredRows) => [
        { label: text.suppliers, value: String(rows.length) },
        { label: text.search, value: String(filteredRows.length) },
      ],
    };
  }

  if (module === 'operatingExpenses') {
    return {
      tableName: 'business_operating_expenses',
      title: text.operatingExpenses,
      description: text.operatingExpensesDescription,
      addLabel: text.addOperatingExpense,
      editLabel: text.editOperatingExpense,
      deleteLabel: text.deleteOperatingExpense,
      savedLabel: text.operatingExpenseSaved,
      deletedLabel: text.operatingExpenseDeleted,
      confirmDeleteLabel: text.confirmDeleteOperatingExpense,
      emptyTitle: text.noOperatingExpensesYet,
      emptyBody: text.operatingExpenseEmptyBody,
      searchPlaceholder: text.searchOperatingExpenses,
      exportFileBase: 'the-sfm-business-operating-expenses',
      icon: <ReceiptText size={32} />,
      primaryField: 'name',
      secondaryFields: ['category', 'amount', 'expense_date', 'recurring_monthly', 'notes'],
      searchFields: ['name', 'category', 'notes'],
      dateField: 'expense_date',
      amountField: 'amount',
      currencyField: 'currency',
      fields: [
        { key: 'name', label: text.expenseName, type: 'text', required: true },
        { key: 'category', label: text.expenseCategory, type: 'select', defaultValue: 'other', options: expenseCategoryOptions },
        { key: 'amount', label: text.amount, type: 'number', required: true },
        { key: 'currency', label: text.currency, type: 'currency', defaultValue: 'KWD' },
        { key: 'expense_date', label: text.expenseDate, type: 'date', required: true, defaultValue: today() },
        { key: 'recurring_monthly', label: text.recurringMonthly, type: 'checkbox' },
        { key: 'notes', label: text.notes, type: 'textarea', full: true },
      ],
      getSummary: (rows, filteredRows, helpers) => {
        const currentMonth = today().slice(0, 7);
        const monthlyTotal = rows
          .filter((row) => String(row.expense_date ?? '').slice(0, 7) === currentMonth)
          .reduce((sum, row) => sum + numericValue(row.amount), 0);
        const filteredTotal = filteredRows.reduce((sum, row) => sum + numericValue(row.amount), 0);
        return [
          { label: text.monthlyOperatingExpenses, value: formatMoney(monthlyTotal, helpers.defaultCurrency, helpers.locale) },
          { label: text.operatingExpenses, value: String(rows.length) },
          { label: text.amount, value: formatMoney(filteredTotal, helpers.defaultCurrency, helpers.locale) },
          { label: text.recurringMonthly, value: String(rows.filter((row) => row.recurring_monthly).length) },
        ];
      },
    };
  }

  return {
    tableName: 'business_customers',
    title: text.customers,
    description: text.customersDescription,
    addLabel: text.addCustomer,
    editLabel: text.editCustomer,
    deleteLabel: text.deleteCustomer,
    savedLabel: text.customerSaved,
    deletedLabel: text.customerDeleted,
    confirmDeleteLabel: text.confirmDeleteCustomer,
    emptyTitle: text.noCustomersYet,
    emptyBody: text.customerEmptyBody,
    searchPlaceholder: text.searchCustomers,
    exportFileBase: 'the-sfm-business-customers',
    icon: <UserRound size={32} />,
    primaryField: 'name',
    secondaryFields: ['company', 'phone', 'email', 'address', 'notes'],
    searchFields: ['name', 'company', 'phone', 'email', 'notes'],
    fields: [
      { key: 'name', label: text.customerNameField, type: 'text', required: true },
      { key: 'phone', label: text.phone, type: 'tel' },
      { key: 'email', label: text.email, type: 'email' },
      { key: 'company', label: text.company, type: 'text' },
      { key: 'address', label: text.address, type: 'textarea', full: true },
      { key: 'notes', label: text.notes, type: 'textarea', full: true },
    ],
    getSummary: (rows, filteredRows) => [
      { label: text.customers, value: String(rows.length) },
      { label: text.search, value: String(filteredRows.length) },
    ],
  };
}

export default function BusinessRecordsModulePage({ module }: { module: BusinessModuleKind }) {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeBusinessLang(lang);
  const text = BUSINESS_TEXT[locale];
  const { role, loading: roleLoading, permissions } = useBusinessRole(user?.id);
  const [rows, setRows] = useState<BusinessRecord[]>([]);
  const [customerRows, setCustomerRows] = useState<BusinessRecord[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRecord | null>(null);
  const [form, setForm] = useState<Record<string, BusinessFormValue>>({});
  const [formError, setFormError] = useState('');

  const customerOptions = useMemo(() => customerRows.map((row) => ({
    value: valueAsString(row.id),
    label: valueAsString(row.name),
  })), [customerRows]);

  const config = useMemo(() => createConfig(module, text, locale, customerOptions), [customerOptions, locale, module, text]);

  const customerName = useCallback((id: unknown) => {
    const customer = customerRows.find((row) => row.id === id);
    return customer?.name ? valueAsString(customer.name) : text.unclassified;
  }, [customerRows, text.unclassified]);

  const formatValue = useCallback((field: FieldConfig, value: unknown, row?: BusinessRecord) => {
    if (field.type === 'customer') return value ? customerName(value) : text.unclassified;
    if (field.type === 'currency') return valueAsString(value || defaultCurrency);
    if (field.type === 'number') {
      if (config.currencyField && field.key === config.amountField) {
        return formatMoney(numericValue(value), valueAsString(row?.[config.currencyField] || defaultCurrency), locale);
      }
      return String(numericValue(value));
    }
    if (field.type === 'date') return value ? formatDate(String(value), locale) : text.noDataYet;
    if (field.type === 'checkbox') return booleanLabel(value, locale);
    if (field.key === 'status') return invoiceStatusLabel(valueAsString(value), locale);
    if (field.key === 'category') return operatingExpenseCategoryLabel(valueAsString(value), locale);
    return valueAsString(value) || text.noDataYet;
  }, [config.amountField, config.currencyField, customerName, defaultCurrency, locale, text.noDataYet, text.unclassified]);

  const helpers = useMemo<FormatHelpers>(() => ({
    text,
    locale,
    defaultCurrency,
    customerName,
    formatValue,
  }), [customerName, defaultCurrency, formatValue, locale, text]);

  const loadRows = useCallback(async () => {
    if (!user || !permissions.canViewBusinessModules) {
      setRows([]);
      setCustomerRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const db = supabase as any;
    const orderColumn = config.dateField ?? 'created_at';
    const queries = [
      db.from('profiles').select('default_currency').eq('id', user.id).maybeSingle(),
      db.from(config.tableName).select('*').eq('user_id', user.id).order(orderColumn, { ascending: false }).order('created_at', { ascending: false }),
      db.from('business_customers').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
    ];

    const [profileResult, recordsResult, customersResult] = await Promise.all(queries);

    if (!profileResult.error && profileResult.data?.default_currency) {
      setDefaultCurrency(profileResult.data.default_currency);
    }

    if (customersResult.error) {
      setCustomerRows([]);
    } else {
      setCustomerRows((customersResult.data ?? []) as BusinessRecord[]);
    }

    if (recordsResult.error) {
      setError(text.loadError);
      setRows([]);
    } else {
      setRows((recordsResult.data ?? []) as BusinessRecord[]);
    }
    setLoading(false);
  }, [config.dateField, config.tableName, permissions.canViewBusinessModules, text.loadError, user]);

  useEffect(() => {
    if (!authLoading && !roleLoading) void loadRows();
  }, [authLoading, loadRows, roleLoading]);

  useEffect(() => {
    setForm(makeEmptyForm(config.fields, defaultCurrency));
  }, [config.fields, defaultCurrency]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (module === 'invoices' && statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (module === 'operatingExpenses' && categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (config.dateField) {
        const rowDate = valueAsString(row[config.dateField]);
        if (fromDate && (!rowDate || rowDate < fromDate)) return false;
        if (toDate && (!rowDate || rowDate > toDate)) return false;
      }
      if (!needle) return true;
      const values = config.searchFields.flatMap((key) => {
        if (key === 'customer_id') return [customerName(row.customer_id)];
        return [row[key]];
      });
      if (module === 'invoices') values.push(customerName(row.customer_id));
      return values.some((value) => valueAsString(value).toLowerCase().includes(needle));
    });
  }, [categoryFilter, config.dateField, config.searchFields, customerName, fromDate, module, query, rows, statusFilter, toDate]);

  const summaryItems = useMemo(() => config.getSummary(rows, filteredRows, helpers), [config, filteredRows, helpers, rows]);

  function openCreate() {
    setEditing(null);
    setForm(makeEmptyForm(config.fields, defaultCurrency));
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(row: BusinessRecord) {
    setEditing(row);
    const nextForm = makeEmptyForm(config.fields, defaultCurrency);
    config.fields.forEach((field) => {
      if (field.type === 'checkbox') nextForm[field.key] = Boolean(row[field.key]);
      else nextForm[field.key] = valueAsString(row[field.key]);
    });
    setForm(nextForm);
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setForm(makeEmptyForm(config.fields, defaultCurrency));
    setFormError('');
    setFormOpen(false);
  }

  function buildPayload() {
    const payload: BusinessRecord = { user_id: user?.id };
    for (const field of config.fields) {
      const value = form[field.key];
      if (field.type === 'checkbox') {
        payload[field.key] = Boolean(value);
      } else if (field.type === 'number') {
        payload[field.key] = numericValue(value);
      } else if (field.type === 'currency') {
        payload[field.key] = valueAsString(value || defaultCurrency);
      } else {
        const normalized = valueAsString(value).trim();
        payload[field.key] = normalized || null;
      }
    }
    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !permissions.canWriteBusinessModules) return;

    for (const field of config.fields) {
      if (!field.required) continue;
      const value = form[field.key];
      if (field.type === 'number' && numericValue(value) <= 0) {
        setFormError(text.invalidAmount);
        return;
      }
      if (field.type !== 'number' && !valueAsString(value).trim()) {
        setFormError(text.requiredField);
        return;
      }
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const db = supabase as any;
    const payload = buildPayload();
    const result = editing
      ? await db.from(config.tableName).update(payload).eq('id', editing.id).eq('user_id', user.id)
      : await db.from(config.tableName).insert(payload);

    setSaving(false);
    if (result.error) {
      setFormError(text.saveError);
      return;
    }

    setNotice(config.savedLabel);
    closeForm();
    await loadRows();
  }

  async function deleteRow(row: BusinessRecord) {
    if (!user || !permissions.canDeleteBusinessModules || !window.confirm(config.confirmDeleteLabel)) return;
    setNotice('');
    const db = supabase as any;
    const result = await db.from(config.tableName).delete().eq('id', row.id).eq('user_id', user.id);
    if (result.error) {
      setError(text.deleteError);
      return;
    }
    setNotice(config.deletedLabel);
    await loadRows();
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
    const columns = config.fields
      .filter((field) => field.type !== 'textarea' || field.key === 'notes')
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: (row: BusinessRecord) => formatValue(field, row[field.key], row),
      }));
    const totals = summaryItems;
    if (format === 'csv') downloadCsv(`${config.exportFileBase}.csv`, filteredRows, columns);
    if (format === 'xlsx') void downloadXlsx(`${config.exportFileBase}.xlsx`, filteredRows, columns, config.title);
    if (format === 'pdf') printPdf({ title: config.title, lang: locale, columns, rows: filteredRows, totals });
  }

  if (authLoading || loading || roleLoading) {
    return (
      <div className="business-ops-page" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={config.title}>
          <div className="business-loading">
            <Loader2 className="business-spin" size={24} aria-hidden="true" />
            <p>{text.loading}</p>
          </div>
        </DashboardPageShell>
        <style jsx global>{businessRecordsModuleStyles}</style>
      </div>
    );
  }

  return (
    <div className="business-ops-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={config.title} contentClassName="business-records-content">
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
          title={config.title}
          subtitle={config.description}
          icon={config.icon}
          actions={(
            <div className="business-hero-actions">
              {permissions.canWriteBusinessModules ? (
                <button className="business-primary-btn" type="button" onClick={openCreate}>
                  <Plus size={16} aria-hidden="true" />
                  {config.addLabel}
                </button>
              ) : null}
              {permissions.canExport ? (
                <>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('pdf')}><FileText size={16} />{text.exportPdf}</button>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('xlsx')}><FileDown size={16} />{text.exportExcel}</button>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('csv')}><FileDown size={16} />{text.exportCsv}</button>
                </>
              ) : null}
            </div>
          )}
        />

        {!permissions.canViewBusinessModules ? (
          <EmptyState title={text.permissionDenied} description={String(role)} icon={<WalletCards size={26} />} />
        ) : (
          <>
            {error ? <div className="business-alert" role="alert">{error}</div> : null}
            {notice ? <div className="business-notice" role="status">{notice}</div> : null}

            <section className="business-stat-grid" aria-label={config.title}>
              {summaryItems.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </section>

            <section className="business-toolbar" aria-label={text.search}>
              <label className="business-search">
                <Search size={17} aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={config.searchPlaceholder} />
              </label>
              {module === 'invoices' ? (
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={text.status}>
                  <option value="all">{text.allStatuses}</option>
                  {BUSINESS_INVOICE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{invoiceStatusLabel(status, locale)}</option>
                  ))}
                </select>
              ) : null}
              {module === 'operatingExpenses' ? (
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label={text.expenseCategory}>
                  <option value="all">{text.allCategories}</option>
                  {BUSINESS_OPERATING_EXPENSE_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{operatingExpenseCategoryLabel(category, locale)}</option>
                  ))}
                </select>
              ) : null}
              {config.dateField ? (
                <>
                  <label className="business-date-filter">
                    <span>{text.fromDate}</span>
                    <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  </label>
                  <label className="business-date-filter">
                    <span>{text.toDate}</span>
                    <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                  </label>
                </>
              ) : null}
            </section>

            {!rows.length ? (
              <EmptyState
                title={config.emptyTitle}
                description={config.emptyBody}
                icon={config.icon}
                actions={permissions.canWriteBusinessModules ? (
                  <button className="business-empty-action" type="button" onClick={openCreate}>
                    <Plus size={16} aria-hidden="true" />
                    {config.addLabel}
                  </button>
                ) : null}
              />
            ) : (
              <section className="business-record-list" aria-label={config.title}>
                {filteredRows.map((row) => {
                  const title = config.getTitle ? config.getTitle(row, helpers) : valueAsString(row[config.primaryField]);
                  const metaFields = config.fields.filter((field) => config.secondaryFields.includes(field.key));
                  return (
                    <article className="business-record-card" key={row.id}>
                      <div className="business-record-card-head">
                        <div>
                          <h2>{title || config.title}</h2>
                          <p>{row.created_at ? formatDate(String(row.created_at), locale) : config.description}</p>
                        </div>
                        <div className="business-record-actions">
                          {permissions.canWriteBusinessModules ? (
                            <button type="button" onClick={() => openEdit(row)} aria-label={config.editLabel}>
                              <Edit3 size={15} aria-hidden="true" />
                            </button>
                          ) : null}
                          {permissions.canDeleteBusinessModules ? (
                            <button className="danger" type="button" onClick={() => deleteRow(row)} aria-label={config.deleteLabel}>
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="business-record-meta-grid">
                        {metaFields.map((field) => (
                          <div key={field.key}>
                            <span>{field.label}</span>
                            <strong dir={field.type === 'number' || field.type === 'currency' ? 'ltr' : undefined}>
                              {formatValue(field, row[field.key], row)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}

        {formOpen ? (
          <div className="business-modal-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}>
            <form className="business-form-modal" onSubmit={handleSubmit}>
              <div className="business-form-head">
                <div>
                  <span>{text.businessOperations}</span>
                  <h2>{editing ? config.editLabel : config.addLabel}</h2>
                </div>
                <button type="button" onClick={closeForm}>{text.cancel}</button>
              </div>
              {formError ? <div className="business-form-error" role="alert">{formError}</div> : null}
              <div className="business-form-grid">
                {config.fields.map((field) => (
                  <label className={`business-form-field ${field.full ? 'full' : ''} ${field.type === 'checkbox' ? 'checkbox' : ''}`} key={field.key}>
                    <span>{field.label}{field.required ? ' *' : ''}</span>
                    {field.type === 'textarea' ? (
                      <textarea value={valueAsString(form[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                    ) : field.type === 'select' || field.type === 'customer' ? (
                      <select value={valueAsString(form[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}>
                        {field.type === 'customer' ? <option value="">{text.unclassified}</option> : null}
                        {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.type === 'currency' ? (
                      <CurrencySelect value={valueAsString(form[field.key] || defaultCurrency)} onChange={(code) => setForm((current) => ({ ...current, [field.key]: code }))} lang={locale} />
                    ) : field.type === 'checkbox' ? (
                      <input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))} />
                    ) : (
                      <input
                        type={field.type}
                        value={valueAsString(form[field.key])}
                        min={field.type === 'number' ? '0' : undefined}
                        step={field.type === 'number' ? '0.01' : undefined}
                        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="business-form-actions">
                <button className="business-ghost-btn" type="button" onClick={closeForm}>{text.cancel}</button>
                <button className="business-primary-btn" type="submit" disabled={saving}>
                  {saving ? <Loader2 className="business-spin" size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                  {editing ? config.editLabel : config.addLabel}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </DashboardPageShell>
      <style jsx global>{businessRecordsModuleStyles}</style>
    </div>
  );
}

const businessRecordsModuleStyles = `
  .business-ops-page {
    min-height: 100vh;
    background: var(--sfm-background);
    color: var(--sfm-foreground);
  }

  .business-records-content {
    display: grid;
    gap: 18px;
  }

  .business-topbar,
  .business-hero-actions,
  .business-form-actions,
  .business-record-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .business-topbar {
    justify-content: flex-end;
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
    color: currentColor;
    animation: business-spin 0.9s linear infinite;
  }

  @keyframes business-spin {
    to { transform: rotate(360deg); }
  }

  .business-back-link,
  .business-primary-btn,
  .business-ghost-btn,
  .business-empty-action,
  .business-record-actions button,
  .business-form-head button {
    font-family: inherit;
    min-height: 42px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 950;
    cursor: pointer;
    text-decoration: none;
    transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
  }

  .business-back-link,
  .business-ghost-btn,
  .business-empty-action,
  .business-form-head button {
    border: 1px solid rgba(29, 140, 255, 0.18);
    background: var(--sfm-card);
    color: var(--sfm-primary);
    padding: 0 14px;
  }

  .business-primary-btn {
    border: 0;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    color: white;
    padding: 0 16px;
    box-shadow: 0 16px 32px rgba(29, 140, 255, 0.18);
  }

  .business-back-link:hover,
  .business-back-link:focus-visible,
  .business-ghost-btn:hover,
  .business-ghost-btn:focus-visible,
  .business-empty-action:hover,
  .business-empty-action:focus-visible,
  .business-primary-btn:hover,
  .business-primary-btn:focus-visible {
    transform: translateY(-1px);
    outline: 2px solid rgba(24, 212, 212, 0.22);
    outline-offset: 2px;
  }

  .business-alert,
  .business-notice,
  .business-form-error {
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 850;
  }

  .business-alert,
  .business-form-error {
    border: 1px solid rgba(239, 68, 68, 0.24);
    background: rgba(239, 68, 68, 0.10);
    color: #B91C1C;
  }

  .business-notice {
    border: 1px solid rgba(16, 185, 129, 0.24);
    background: rgba(16, 185, 129, 0.10);
    color: #047857;
  }

  .business-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .business-stat-grid article,
  .business-record-card,
  .business-form-modal {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-card);
    border-radius: 24px;
    box-shadow: 0 16px 38px rgba(3, 18, 37, 0.07);
  }

  .business-stat-grid article {
    padding: 16px;
  }

  .business-stat-grid span,
  .business-record-meta-grid span,
  .business-form-field span,
  .business-form-head span {
    color: var(--sfm-muted);
    font-size: 0.86rem;
    font-weight: 850;
  }

  .business-stat-grid strong,
  .business-record-meta-grid strong {
    display: block;
    margin-top: 7px;
    color: var(--sfm-foreground);
    font-size: 1.08rem;
    overflow-wrap: anywhere;
  }

  .business-toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-card);
    border-radius: 22px;
    padding: 12px;
  }

  .business-search {
    flex: 1 1 260px;
    min-height: 46px;
    border: 1px solid rgba(29, 140, 255, 0.16);
    border-radius: 15px;
    background: var(--sfm-surface);
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--sfm-muted);
  }

  .business-search input,
  .business-toolbar select,
  .business-date-filter input,
  .business-form-field input,
  .business-form-field textarea,
  .business-form-field select {
    width: 100%;
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    border-radius: 14px;
    background: var(--sfm-surface);
    color: var(--sfm-foreground);
    padding: 11px 12px;
    font-family: inherit;
    font-weight: 750;
  }

  .business-search input {
    border: 0;
    background: transparent;
    padding: 0;
    outline: 0;
  }

  .business-toolbar select {
    min-height: 46px;
    width: auto;
    min-width: 170px;
  }

  .business-date-filter {
    display: grid;
    gap: 5px;
    min-width: 160px;
    color: var(--sfm-muted);
    font-size: 0.78rem;
    font-weight: 850;
  }

  .business-form-field input:focus,
  .business-form-field textarea:focus,
  .business-form-field select:focus,
  .business-toolbar select:focus,
  .business-date-filter input:focus,
  .business-search:focus-within {
    border-color: rgba(24, 212, 212, 0.45);
    outline: 2px solid rgba(24, 212, 212, 0.18);
    outline-offset: 2px;
  }

  .business-record-list {
    display: grid;
    gap: 14px;
  }

  .business-record-card {
    padding: 18px;
    display: grid;
    gap: 16px;
  }

  .business-record-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .business-record-card h2,
  .business-form-head h2 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 1.05rem;
    font-weight: 950;
  }

  .business-record-card p {
    margin: 5px 0 0;
    color: var(--sfm-muted);
    font-weight: 760;
  }

  .business-record-actions button {
    width: 40px;
    min-height: 40px;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-surface);
    color: var(--sfm-primary);
    padding: 0;
  }

  .business-record-actions button.danger {
    color: #DC2626;
    border-color: rgba(220, 38, 38, 0.20);
  }

  .business-record-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }

  .business-record-meta-grid div {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.12);
    background: var(--sfm-surface);
    border-radius: 16px;
    padding: 12px;
  }

  .business-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(2, 8, 23, 0.58);
    backdrop-filter: blur(10px);
  }

  .business-form-modal {
    width: min(760px, 100%);
    max-height: min(88vh, 900px);
    overflow: auto;
    padding: 20px;
    display: grid;
    gap: 16px;
  }

  .business-form-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .business-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 13px;
  }

  .business-form-field {
    display: grid;
    gap: 7px;
  }

  .business-form-field.full {
    grid-column: 1 / -1;
  }

  .business-form-field.checkbox {
    align-content: end;
    grid-template-columns: auto 1fr;
    align-items: center;
    border: 1px solid rgba(29, 140, 255, 0.16);
    border-radius: 14px;
    background: var(--sfm-surface);
    padding: 11px 12px;
  }

  .business-form-field.checkbox span {
    order: 2;
    color: var(--sfm-foreground);
  }

  .business-form-field.checkbox input {
    order: 1;
    width: 18px;
    height: 18px;
    padding: 0;
  }

  .business-form-field textarea {
    min-height: 90px;
    resize: vertical;
  }

  .business-form-actions {
    justify-content: flex-end;
  }

  @media (max-width: 720px) {
    .business-form-grid,
    .business-stat-grid,
    .business-record-meta-grid {
      grid-template-columns: 1fr;
    }

    .business-record-card-head,
    .business-form-head {
      flex-direction: column;
    }

    .business-record-actions,
    .business-form-actions,
    .business-hero-actions {
      width: 100%;
    }

    .business-record-actions button,
    .business-primary-btn,
    .business-ghost-btn,
    .business-empty-action {
      flex: 1 1 auto;
    }
  }
`;
