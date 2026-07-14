'use client';

import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Edit3, FileDown, FileText, Loader2, Plus, ReceiptText, Search, Sparkles, Trash2, Truck, UploadCloud, UserRound, WalletCards, X } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/layout/EmptyState';
import { CurrencySelect } from '@/components/CurrencySelect';
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

type InvoiceAnalysisLineItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
};

type InvoiceAnalysisResult = {
  ok: true;
  extracted: {
    invoiceNumber: string | null;
    title: string | null;
    vendorName: string | null;
    clientName: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    amount: number | null;
    currency: string | null;
    taxAmount: number | null;
    discountAmount: number | null;
    status: string | null;
    lineItems: InvoiceAnalysisLineItem[];
    notes: string | null;
  };
  confidence: {
    invoiceNumber?: number;
    amount?: number;
    currency?: number;
    invoiceDate?: number;
  };
  analysis: {
    suggestedCategory: string | null;
    isComplete: boolean;
    warnings: string[];
    summary: string;
  };
};

type InvoiceAnalysisError = {
  ok: false;
  code?: string;
  message?: string;
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const INVOICE_ANALYSIS_MAX_FILE_SIZE = 10 * 1024 * 1024;
const INVOICE_ANALYSIS_SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function inferInvoiceFileType(file: File) {
  const explicitType = file.type?.trim().toLowerCase();
  if (explicitType) return explicitType;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function formatInvoiceFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function confidencePercent(value?: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(Math.max(0, Math.min(1, Number(value))) * 100)}%`;
}

function invoiceAnalysisWarningLabel(code: string, text: typeof BUSINESS_TEXT[BusinessLang]) {
  const labels: Record<string, string> = {
    missing_invoice_number: text.aiInvoiceWarningMissingInvoiceNumber,
    missing_vendor_or_title: text.aiInvoiceWarningMissingVendor,
    missing_invoice_date: text.aiInvoiceWarningMissingInvoiceDate,
    missing_due_date: text.aiInvoiceWarningMissingDueDate,
    missing_amount: text.aiInvoiceWarningMissingAmount,
    missing_currency: text.aiInvoiceWarningMissingCurrency,
    currency_differs: text.aiInvoiceWarningCurrencyDiffers,
    due_soon: text.aiInvoiceWarningDueSoon,
    tax_detected: text.aiInvoiceWarningTaxDetected,
    discount_detected: text.aiInvoiceWarningDiscountDetected,
    review_low_confidence: text.aiInvoiceWarningLowConfidence,
  };
  return labels[code] || code;
}

function invoiceAnalysisCategoryLabel(code: string | null, text: typeof BUSINESS_TEXT[BusinessLang]) {
  const labels: Record<string, string> = {
    operational: text.aiInvoiceCategoryOperational,
    marketing: text.aiInvoiceCategoryMarketing,
    payroll: text.aiInvoiceCategoryPayroll,
    technology: text.aiInvoiceCategoryTechnology,
    rent: text.aiInvoiceCategoryRent,
    suppliers: text.aiInvoiceCategorySuppliers,
    other: text.aiInvoiceCategoryOther,
  };
  return code ? labels[code] || text.aiInvoiceCategoryOther : text.aiInvoiceNotClear;
}

function invoiceAnalysisSummaryLabel(code: string, text: typeof BUSINESS_TEXT[BusinessLang]) {
  if (code === 'invoice_complete') return text.aiInvoiceSummaryComplete;
  return text.aiInvoiceSummaryNeedsReview;
}

function logSupplierSaveFailure(error: any) {
  console.error('Supplier save failed:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}

function isSupplierAccessDeniedError(error: any) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return code === '42501' || message.includes('row-level security') || message.includes('permission denied');
}

function isSupplierSchemaError(error: any) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code === '23502' ||
    code === '23503' ||
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('column')
  );
}

function formatDateToYYYYMMDD(value: string) {
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const parsed = new Date(`${normalized}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized) return normalized;
  }

  const slashDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const month = Number(slashDate[1]);
    const day = Number(slashDate[2]);
    const year = Number(slashDate[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const parsed = new Date(`${candidate}T00:00:00Z`);
      if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate) return candidate;
    }
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function logOperatingExpensesLoadFailure(error: any) {
  console.error('Operating expenses load failed:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}

function logOperatingExpenseSaveFailure(error: any) {
  console.error('Operating expense save failed:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}

function isBusinessAccessDeniedError(error: any) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return code === '42501' || message.includes('row-level security') || message.includes('permission denied');
}

function isBusinessSchemaError(error: any) {
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
  const [invoiceAnalysisOpen, setInvoiceAnalysisOpen] = useState(false);
  const [invoiceAnalysisFile, setInvoiceAnalysisFile] = useState<File | null>(null);
  const [invoiceAnalysisLoading, setInvoiceAnalysisLoading] = useState(false);
  const [invoiceAnalysisError, setInvoiceAnalysisError] = useState('');
  const [invoiceAnalysisResult, setInvoiceAnalysisResult] = useState<InvoiceAnalysisResult | null>(null);

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
      if (module === 'operatingExpenses' && !user) setError(text.operatingExpenseAuthRequired);
      setRows([]);
      setCustomerRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const db = supabase as any;
    const orderColumn = config.dateField ?? 'created_at';
    const recordsQuery = module === 'operatingExpenses'
      ? db.from('business_operating_expenses').select('*').eq('user_id', user.id).order('expense_date', { ascending: false })
      : db.from(config.tableName).select('*').eq('user_id', user.id).order(orderColumn, { ascending: false }).order('created_at', { ascending: false });
    const queries = [
      db.from('profiles').select('default_currency').eq('id', user.id).maybeSingle(),
      recordsQuery,
      db.from('business_customers').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
    ];

    let results;
    try {
      results = await Promise.all(queries);
    } catch (loadError) {
      if (module === 'operatingExpenses') logOperatingExpensesLoadFailure(loadError);
      setRows([]);
      setCustomerRows([]);
      setError(text.loadError);
      setLoading(false);
      return;
    }

    const [profileResult, recordsResult, customersResult] = results;

    if (!profileResult.error && profileResult.data?.default_currency) {
      setDefaultCurrency(profileResult.data.default_currency);
    }

    if (customersResult.error) {
      setCustomerRows([]);
    } else {
      setCustomerRows((customersResult.data ?? []) as BusinessRecord[]);
    }

    if (recordsResult.error) {
      if (module === 'operatingExpenses') logOperatingExpensesLoadFailure(recordsResult.error);
      setError(text.loadError);
      setRows([]);
    } else {
      setRows((recordsResult.data ?? []) as BusinessRecord[]);
    }
    setLoading(false);
  }, [config.dateField, config.tableName, module, permissions.canViewBusinessModules, text.loadError, text.operatingExpenseAuthRequired, user]);

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

  function resetInvoiceAnalysis() {
    setInvoiceAnalysisOpen(false);
    setInvoiceAnalysisFile(null);
    setInvoiceAnalysisLoading(false);
    setInvoiceAnalysisError('');
    setInvoiceAnalysisResult(null);
  }

  function handleInvoiceAnalysisFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    setInvoiceAnalysisError('');
    setInvoiceAnalysisResult(null);
    if (!file) {
      setInvoiceAnalysisFile(null);
      return;
    }
    const mimeType = inferInvoiceFileType(file);
    if (!INVOICE_ANALYSIS_SUPPORTED_TYPES.has(mimeType)) {
      setInvoiceAnalysisFile(null);
      setInvoiceAnalysisError(text.aiInvoiceUnsupportedFile);
      return;
    }
    if (file.size > INVOICE_ANALYSIS_MAX_FILE_SIZE) {
      setInvoiceAnalysisFile(null);
      setInvoiceAnalysisError(text.aiInvoiceFileTooLarge);
      return;
    }
    setInvoiceAnalysisFile(file);
  }

  function applyInvoiceAnalysis(result: InvoiceAnalysisResult) {
    const extracted = result.extracted;
    const matchedCustomer = extracted.clientName
      ? customerRows.find((row) => valueAsString(row.name).trim().toLowerCase() === extracted.clientName?.trim().toLowerCase())
      : null;
    const lineItemNotes = extracted.lineItems.length
      ? `${text.aiInvoiceLineItems}: ${extracted.lineItems.map((item) => item.description).filter(Boolean).slice(0, 5).join(', ')}`
      : '';
    const analysisNotes = [
      extracted.notes,
      invoiceAnalysisSummaryLabel(result.analysis.summary, text),
      result.analysis.suggestedCategory ? `${text.aiInvoiceSuggestedCategory}: ${invoiceAnalysisCategoryLabel(result.analysis.suggestedCategory, text)}` : '',
      lineItemNotes,
      result.analysis.warnings.map((warning) => invoiceAnalysisWarningLabel(warning, text)).join(' | '),
    ].filter(Boolean).join('\n');

    setForm((current) => ({
      ...current,
      invoice_number: extracted.invoiceNumber || current.invoice_number || '',
      title: extracted.title || extracted.vendorName || current.title || '',
      customer_id: matchedCustomer?.id ? valueAsString(matchedCustomer.id) : current.customer_id || '',
      amount: extracted.amount !== null && extracted.amount !== undefined ? String(extracted.amount) : current.amount || '',
      currency: extracted.currency || current.currency || defaultCurrency,
      status: extracted.status && BUSINESS_INVOICE_STATUS_OPTIONS.includes(extracted.status as any) ? extracted.status : current.status || 'draft',
      invoice_date: extracted.invoiceDate || current.invoice_date || today(),
      due_date: extracted.dueDate || current.due_date || '',
      notes: analysisNotes || current.notes || '',
    }));
  }

  async function analyzeInvoiceFile() {
    if (!invoiceAnalysisFile) {
      setInvoiceAnalysisError(text.aiInvoiceNoFile);
      return;
    }
    setInvoiceAnalysisLoading(true);
    setInvoiceAnalysisError('');
    setInvoiceAnalysisResult(null);
    const body = new FormData();
    body.append('file', invoiceAnalysisFile);
    body.append('defaultCurrency', defaultCurrency);
    body.append('lang', locale);

    try {
      const response = await fetch('/api/invoices/analyze', {
        method: 'POST',
        body,
      });
      const payload = await response.json() as InvoiceAnalysisResult | InvoiceAnalysisError;
      if (!response.ok || payload.ok === false) {
        const errorPayload = payload as InvoiceAnalysisError;
        setInvoiceAnalysisError(errorPayload.message || text.aiInvoiceFailed);
        return;
      }
      const result = payload as InvoiceAnalysisResult;
      setInvoiceAnalysisResult(result);
      applyInvoiceAnalysis(result);
    } catch {
      setInvoiceAnalysisError(text.aiInvoiceFailed);
    } finally {
      setInvoiceAnalysisLoading(false);
    }
  }

  function invoiceAnalysisDisplayValue(value: unknown, type?: 'money' | 'date', currency?: string | null) {
    if (value === null || value === undefined || value === '') return text.aiInvoiceNotClear;
    if (type === 'money') return formatMoney(numericValue(value), currency || defaultCurrency, locale);
    if (type === 'date') return formatDate(String(value), locale);
    return valueAsString(value);
  }

  function openCreate() {
    setEditing(null);
    setForm(makeEmptyForm(config.fields, defaultCurrency));
    setFormError('');
    resetInvoiceAnalysis();
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
    resetInvoiceAnalysis();
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setForm(makeEmptyForm(config.fields, defaultCurrency));
    setFormError('');
    resetInvoiceAnalysis();
    setFormOpen(false);
  }

  function buildPayload(currentUserId: string) {
    const optionalText = (key: string) => {
      const normalized = valueAsString(form[key]).trim();
      return normalized || null;
    };

    if (module === 'suppliers') {
      return {
        user_id: currentUserId,
        name: valueAsString(form.name).trim(),
        phone: optionalText('phone'),
        email: optionalText('email'),
        company: optionalText('company'),
        supply_type: optionalText('supply_type'),
        address: optionalText('address'),
        notes: optionalText('notes'),
      };
    }

    if (module === 'operatingExpenses') {
      return {
        user_id: currentUserId,
        name: valueAsString(form.name).trim(),
        category: optionalText('category'),
        amount: numericValue(form.amount),
        currency: valueAsString(form.currency || defaultCurrency || 'KWD').trim() || 'KWD',
        expense_date: formatDateToYYYYMMDD(valueAsString(form.expense_date)),
        recurring_monthly: Boolean(form.recurring_monthly),
        notes: optionalText('notes'),
      };
    }

    const payload: BusinessRecord = { user_id: currentUserId };
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
    if (!user) {
      if (module === 'suppliers') setFormError(text.supplierAuthRequired);
      else if (module === 'operatingExpenses') setFormError(text.operatingExpenseAuthRequired);
      else setFormError(text.permissionDenied);
      return;
    }
    const currentUserId = user.id;
    if (!currentUserId) {
      if (module === 'suppliers') setFormError(text.supplierAuthRequired);
      else if (module === 'operatingExpenses') setFormError(text.operatingExpenseAuthRequired);
      else setFormError(text.permissionDenied);
      return;
    }
    if (!permissions.canWriteBusinessModules) {
      setFormError(text.permissionDenied);
      return;
    }

    if (module === 'suppliers') {
      const supplierName = valueAsString(form.name).trim();
      const supplierEmail = valueAsString(form.email).trim();

      if (!supplierName) {
        setFormError(text.supplierNameRequired);
        return;
      }
      if (supplierEmail && !isValidEmail(supplierEmail)) {
        setFormError(text.invalidEmail);
        return;
      }
    }

    if (module === 'operatingExpenses') {
      const expenseName = valueAsString(form.name).trim();
      const amount = numericValue(form.amount);
      const selectedCurrency = valueAsString(form.currency || defaultCurrency || 'KWD').trim();
      const expenseDate = valueAsString(form.expense_date).trim();
      const normalizedExpenseDate = formatDateToYYYYMMDD(expenseDate);

      if (!expenseName) {
        setFormError(text.operatingExpenseNameRequired);
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setFormError(text.operatingExpenseAmountRequired);
        return;
      }
      if (!selectedCurrency) {
        setFormError(text.businessValidationRequired);
        return;
      }
      if (!expenseDate) {
        setFormError(text.operatingExpenseDateRequired);
        return;
      }
      if (!normalizedExpenseDate) {
        setFormError(text.operatingExpenseDateInvalid);
        return;
      }
    }

    for (const field of config.fields) {
      if (!field.required) continue;
      const value = form[field.key];
      if (field.type === 'number' && numericValue(value) <= 0) {
        setFormError(module === 'operatingExpenses' ? text.operatingExpenseAmountRequired : text.invalidAmount);
        return;
      }
      if (field.type !== 'number' && !valueAsString(value).trim()) {
        setFormError(module === 'suppliers' || module === 'operatingExpenses' ? text.businessValidationRequired : text.requiredField);
        return;
      }
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const db = supabase as any;
    const payload = buildPayload(currentUserId);
    let result: { error: any };

    try {
      result = editing
        ? await db.from(config.tableName).update(payload).eq('id', editing.id).eq('user_id', currentUserId)
        : await db.from(config.tableName).insert(payload);
    } catch (error) {
      setSaving(false);
      if (module === 'suppliers') logSupplierSaveFailure(error);
      if (module === 'operatingExpenses') logOperatingExpenseSaveFailure(error);
      setFormError(module === 'suppliers' || module === 'operatingExpenses' ? text.networkSaveError : text.saveError);
      return;
    }

    setSaving(false);
    if (result.error) {
      if (module === 'suppliers') {
        logSupplierSaveFailure(result.error);
        if (isSupplierAccessDeniedError(result.error)) setFormError(text.supplierRlsSaveError);
        else if (isSupplierSchemaError(result.error)) setFormError(text.supplierSchemaSaveError);
        else setFormError(text.saveError);
      } else if (module === 'operatingExpenses') {
        logOperatingExpenseSaveFailure(result.error);
        if (isBusinessAccessDeniedError(result.error)) setFormError(text.operatingExpenseRlsSaveError);
        else if (isBusinessSchemaError(result.error)) setFormError(text.operatingExpenseSchemaSaveError);
        else setFormError(text.saveError);
      } else {
        setFormError(text.saveError);
      }
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
      <DashboardPageShell ariaLabel={config.title} contentClassName="business-records-content">
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
              <div className="business-form-scroll">
                {formError ? <div className="business-form-error" role="alert">{formError}</div> : null}
                {module === 'invoices' ? (
                  <section className="business-ai-invoice-panel" aria-label={text.aiInvoiceReader}>
                    <div className="business-ai-invoice-head">
                      <div>
                        <span>{text.aiInvoiceOptional}</span>
                        <h3>{text.aiInvoiceReader}</h3>
                        <p>{text.aiInvoiceUploadDescription}</p>
                      </div>
                      <button
                        className="business-ai-invoice-toggle"
                        type="button"
                        onClick={() => setInvoiceAnalysisOpen((current) => !current)}
                      >
                        <Sparkles size={16} aria-hidden="true" />
                        {invoiceAnalysisOpen ? text.aiInvoiceHidePanel : text.aiInvoiceAnalyzeButton}
                      </button>
                    </div>
                    {invoiceAnalysisOpen ? (
                      <div className="business-ai-invoice-body">
                        <label className="business-ai-upload-box">
                          <input
                            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                            type="file"
                            onChange={handleInvoiceAnalysisFileChange}
                          />
                          <UploadCloud size={22} aria-hidden="true" />
                          <strong>{text.aiInvoiceDropTitle}</strong>
                          <span>{text.aiInvoiceDropDescription}</span>
                          <em>{text.aiInvoiceChooseFile}</em>
                        </label>

                        {invoiceAnalysisFile ? (
                          <div className="business-ai-file-row">
                            <FileText size={17} aria-hidden="true" />
                            <div>
                              <strong>{invoiceAnalysisFile.name}</strong>
                              <span>{formatInvoiceFileSize(invoiceAnalysisFile.size)}</span>
                            </div>
                            <button type="button" onClick={() => {
                              setInvoiceAnalysisFile(null);
                              setInvoiceAnalysisError('');
                              setInvoiceAnalysisResult(null);
                            }}>
                              <X size={15} aria-hidden="true" />
                              {text.aiInvoiceRemoveFile}
                            </button>
                          </div>
                        ) : null}

                        {invoiceAnalysisError ? (
                          <div className="business-ai-alert" role="alert">
                            <AlertTriangle size={16} aria-hidden="true" />
                            <span>{invoiceAnalysisError}</span>
                          </div>
                        ) : null}

                        <div className="business-ai-actions">
                          <button className="business-primary-btn" type="button" onClick={analyzeInvoiceFile} disabled={invoiceAnalysisLoading || !invoiceAnalysisFile}>
                            {invoiceAnalysisLoading ? <Loader2 className="business-spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                            {invoiceAnalysisLoading ? text.aiInvoiceReading : text.aiInvoiceStartAnalysis}
                          </button>
                          {invoiceAnalysisResult ? (
                            <>
                              <button className="business-ghost-btn" type="button" onClick={() => applyInvoiceAnalysis(invoiceAnalysisResult)}>
                                <CheckCircle2 size={15} aria-hidden="true" />
                                {text.aiInvoiceApplyData}
                              </button>
                              <button className="business-ghost-btn" type="button" onClick={() => {
                                setInvoiceAnalysisResult(null);
                                setInvoiceAnalysisError('');
                              }}>
                                {text.aiInvoiceClearResult}
                              </button>
                            </>
                          ) : null}
                        </div>

                        {invoiceAnalysisResult ? (
                          <article className="business-ai-result-card">
                            <div className="business-ai-result-head">
                              <div>
                                <span>{text.aiInvoiceReviewNotice}</span>
                                <h4>{text.aiInvoiceResultTitle}</h4>
                              </div>
                              <strong>{invoiceAnalysisResult.analysis.isComplete ? text.aiInvoiceCompleteBadge : text.aiInvoiceReviewBadge}</strong>
                            </div>
                            <div className="business-ai-result-grid">
                              {[
                                { label: text.invoiceNumber, value: invoiceAnalysisResult.extracted.invoiceNumber, confidence: invoiceAnalysisResult.confidence.invoiceNumber },
                                { label: text.invoiceTitle, value: invoiceAnalysisResult.extracted.title || invoiceAnalysisResult.extracted.vendorName, confidence: undefined },
                                { label: text.supplierName, value: invoiceAnalysisResult.extracted.vendorName, confidence: undefined },
                                { label: text.customer, value: invoiceAnalysisResult.extracted.clientName, confidence: undefined },
                                { label: text.amount, value: invoiceAnalysisDisplayValue(invoiceAnalysisResult.extracted.amount, 'money', invoiceAnalysisResult.extracted.currency), confidence: invoiceAnalysisResult.confidence.amount },
                                { label: text.currency, value: invoiceAnalysisResult.extracted.currency, confidence: invoiceAnalysisResult.confidence.currency },
                                { label: text.status, value: invoiceStatusLabel(valueAsString(invoiceAnalysisResult.extracted.status), locale), confidence: undefined },
                                { label: text.invoiceDate, value: invoiceAnalysisDisplayValue(invoiceAnalysisResult.extracted.invoiceDate, 'date'), confidence: invoiceAnalysisResult.confidence.invoiceDate },
                                { label: text.dueDate, value: invoiceAnalysisDisplayValue(invoiceAnalysisResult.extracted.dueDate, 'date'), confidence: undefined },
                                { label: text.aiInvoiceTaxAmount, value: invoiceAnalysisDisplayValue(invoiceAnalysisResult.extracted.taxAmount, 'money', invoiceAnalysisResult.extracted.currency), confidence: undefined },
                                { label: text.aiInvoiceDiscountAmount, value: invoiceAnalysisDisplayValue(invoiceAnalysisResult.extracted.discountAmount, 'money', invoiceAnalysisResult.extracted.currency), confidence: undefined },
                                { label: text.aiInvoiceSuggestedCategory, value: invoiceAnalysisCategoryLabel(invoiceAnalysisResult.analysis.suggestedCategory, text), confidence: undefined },
                              ].map((item) => (
                                <div key={item.label}>
                                  <span>{item.label}</span>
                                  <strong>{item.value || text.aiInvoiceNotClear}</strong>
                                  {item.confidence !== undefined ? <em>{text.aiInvoiceConfidence}: {confidencePercent(item.confidence)}</em> : null}
                                </div>
                              ))}
                            </div>
                            {invoiceAnalysisResult.extracted.currency && invoiceAnalysisResult.extracted.currency !== defaultCurrency ? (
                              <p className="business-ai-note">{text.aiInvoiceExchangeUnavailable}</p>
                            ) : null}
                            <div className="business-ai-summary">
                              <strong>{text.aiInvoiceSmartSummary}</strong>
                              <p>{invoiceAnalysisSummaryLabel(invoiceAnalysisResult.analysis.summary, text)}</p>
                              {invoiceAnalysisResult.analysis.warnings.length ? (
                                <ul>
                                  {invoiceAnalysisResult.analysis.warnings.map((warning) => (
                                    <li key={warning}>{invoiceAnalysisWarningLabel(warning, text)}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                            {invoiceAnalysisResult.extracted.lineItems.length ? (
                              <div className="business-ai-line-items">
                                <strong>{text.aiInvoiceLineItems}</strong>
                                <div>
                                  {invoiceAnalysisResult.extracted.lineItems.slice(0, 5).map((item, index) => (
                                    <span key={`${item.description}-${index}`} title={item.description}>
                                      {item.description || text.aiInvoiceNotClear}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </article>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                ) : null}
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
    width: 100%;
    min-width: 0;
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-ui);
  }

  .business-records-content {
    display: grid;
    gap: 18px;
  }

  .business-hero-actions,
  .business-form-actions,
  .business-record-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .business-loading {
    min-height: 60vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    color: var(--foreground-muted);
    font-weight: 500;
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
    border-radius: var(--radius-control);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
  }

  .business-back-link,
  .business-ghost-btn,
  .business-empty-action,
  .business-form-head button {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--primary);
    padding: 0 14px;
  }

  .business-back-link {
    width: max-content;
    min-height: 44px;
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    background: var(--primary-soft);
    color: var(--primary);
    border-radius: var(--radius-card);
    padding: 0 16px;
    font-size: 0.92rem;
    box-shadow: var(--shadow-xs);
  }

  .business-back-link svg {
    flex-shrink: 0;
  }

  [dir="rtl"] .business-back-link svg {
    transform: scaleX(-1);
  }

  .business-primary-btn {
    border: 0;
    background: var(--primary);
    color: var(--primary-foreground);
    padding: 0 16px;
    box-shadow: var(--shadow-sm);
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
    outline: 2px solid var(--focus-ring);
    box-shadow: var(--focus-shadow);
    outline-offset: 2px;
  }

  .business-back-link:hover,
  .business-back-link:focus-visible {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--primary-hover);
    box-shadow: var(--focus-shadow);
  }

  .business-back-link:active {
    transform: translateY(0);
    box-shadow: var(--shadow-xs);
  }

  .business-alert,
  .business-notice,
  .business-form-error {
    border-radius: var(--radius-card);
    padding: 12px 14px;
    font-weight: 500;
  }

  .business-alert,
  .business-form-error {
    border: 1px solid var(--danger);
    background: var(--danger-soft);
    color: var(--danger);
  }

  .business-notice {
    border: 1px solid var(--success);
    background: var(--success-soft);
    color: var(--success);
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
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-card);
  }

  .business-stat-grid article {
    padding: 16px;
  }

  .business-stat-grid span,
  .business-record-meta-grid span,
  .business-form-field span,
  .business-form-head span {
    color: var(--foreground-muted);
    font-size: 0.86rem;
    font-weight: 500;
  }

  .business-stat-grid strong,
  .business-record-meta-grid strong {
    font-family: var(--font-data);
    display: block;
    margin-top: 7px;
    color: var(--foreground);
    font-size: 1.08rem;
    overflow-wrap: anywhere;
  }

  .business-toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 12px;
  }

  .business-search {
    flex: 1 1 260px;
    min-height: 46px;
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--foreground-muted);
  }

  .business-search input,
  .business-toolbar select,
  .business-date-filter input,
  .business-form-field input,
  .business-form-field textarea,
  .business-form-field select {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
    color: var(--foreground);
    padding: 11px 12px;
    font-family: inherit;
    font-weight: 500;
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
    color: var(--foreground-muted);
    font-size: 0.78rem;
    font-weight: 500;
  }

  .business-form-field input:focus,
  .business-form-field textarea:focus,
  .business-form-field select:focus,
  .business-toolbar select:focus,
  .business-date-filter input:focus,
  .business-search:focus-within {
    border-color: var(--focus-ring);
    outline: 2px solid var(--focus-ring);
    box-shadow: var(--focus-shadow);
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
    color: var(--foreground);
    font-size: 1.05rem;
    font-weight: 600;
  }

  .business-record-card p {
    margin: 5px 0 0;
    color: var(--foreground-muted);
    font-weight: 400;
  }

  .business-record-actions button {
    width: 40px;
    min-height: 40px;
    border: 1px solid var(--border);
    background: var(--surface-muted);
    color: var(--primary);
    padding: 0;
  }

  .business-record-actions button.danger {
    color: var(--danger);
    border-color: var(--danger);
  }

  .business-record-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }

  .business-record-meta-grid div {
    min-width: 0;
    border: 1px solid var(--border);
    background: var(--surface-muted);
    border-radius: var(--radius-card);
    padding: 12px;
  }

  .business-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 18px;
    background: var(--background-overlay);
    backdrop-filter: blur(10px);
  }

  .business-form-modal {
    width: min(820px, 100%);
    max-height: min(88vh, 900px);
    overflow: hidden;
    padding: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0;
  }

  .business-form-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 20px 20px 14px;
    border-bottom: 1px solid var(--border);
  }

  .business-form-scroll {
    display: grid;
    gap: 16px;
    overflow: auto;
    padding: 16px 20px 18px;
    min-height: 0;
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
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
    padding: 11px 12px;
  }

  .business-form-field.checkbox span {
    order: 2;
    color: var(--foreground);
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
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-muted) 94%, transparent);
  }

  .business-ai-invoice-panel {
    border: 1px solid var(--border);
    background: var(--surface-muted);
    border-radius: var(--radius-card);
    padding: 14px;
    box-shadow: var(--shadow-card);
  }

  .business-ai-invoice-head,
  .business-ai-result-head,
  .business-ai-file-row,
  .business-ai-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .business-ai-invoice-head h3,
  .business-ai-result-head h4 {
    margin: 3px 0 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--foreground);
  }

  .business-ai-invoice-head span,
  .business-ai-result-head span,
  .business-ai-file-row span,
  .business-ai-result-grid span,
  .business-ai-result-grid em,
  .business-ai-invoice-head p,
  .business-ai-summary p {
    color: var(--foreground-muted);
  }

  .business-ai-invoice-head p,
  .business-ai-summary p {
    margin: 4px 0 0;
    line-height: 1.55;
  }

  .business-ai-invoice-toggle {
    border: 1px solid var(--border);
    background: var(--primary-soft);
    color: var(--primary);
    min-height: 40px;
    border-radius: var(--radius-control);
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .business-ai-invoice-toggle:hover {
    transform: translateY(-1px);
    border-color: var(--border);
    background: var(--primary-soft);
  }

  .business-ai-invoice-body {
    display: grid;
    gap: 12px;
    margin-top: 12px;
  }

  .business-ai-upload-box {
    position: relative;
    min-height: 128px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
    display: grid;
    place-items: center;
    align-content: center;
    gap: 6px;
    padding: 16px;
    text-align: center;
    cursor: pointer;
  }

  .business-ai-upload-box input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .business-ai-upload-box strong {
    font-weight: 600;
    color: var(--foreground);
  }

  .business-ai-upload-box span,
  .business-ai-upload-box em {
    color: var(--foreground-muted);
    font-style: normal;
    font-size: 0.88rem;
  }

  .business-ai-upload-box em {
    margin-top: 3px;
    color: var(--primary);
    font-weight: 600;
  }

  .business-ai-file-row {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: var(--radius-control);
    padding: 10px 12px;
  }

  .business-ai-file-row > div {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .business-ai-file-row strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .business-ai-file-row button {
    border: 0;
    background: var(--danger-soft);
    color: var(--danger);
    min-height: 34px;
    border-radius: var(--radius-control);
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    cursor: pointer;
  }

  .business-ai-alert,
  .business-ai-note {
    border: 1px solid var(--warning);
    background: var(--warning-soft);
    color: var(--warning);
    border-radius: var(--radius-control);
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  .business-ai-note {
    margin: 0;
  }

  .business-ai-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .business-ai-result-card {
    border: 1px solid var(--success);
    background: var(--success-soft);
    border-radius: var(--radius-card);
    padding: 14px;
    display: grid;
    gap: 12px;
  }

  .business-ai-result-head strong {
    font-family: var(--font-data);
    border-radius: var(--radius-pill);
    padding: 7px 10px;
    background: var(--success-soft);
    color: var(--success);
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .business-ai-result-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .business-ai-result-grid div {
    min-width: 0;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: var(--radius-control);
    padding: 10px;
    display: grid;
    gap: 3px;
  }

  .business-ai-result-grid strong {
    font-family: var(--font-data);
    overflow-wrap: anywhere;
    color: var(--foreground);
  }

  .business-ai-result-grid em {
    font-style: normal;
    font-size: 0.78rem;
  }

  .business-ai-summary,
  .business-ai-line-items {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: var(--radius-control);
    padding: 11px 12px;
  }

  .business-ai-summary ul {
    margin: 8px 0 0;
    padding-inline-start: 18px;
    color: var(--foreground-muted);
    line-height: 1.55;
  }

  .business-ai-line-items {
    display: grid;
    gap: 8px;
  }

  .business-ai-line-items div {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .business-ai-line-items span {
    max-width: 100%;
    border: 1px solid var(--border);
    background: var(--primary-soft);
    color: var(--foreground);
    border-radius: var(--radius-pill);
    padding: 6px 9px;
    font-weight: 500;
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .business-record-actions button:focus-visible,
  .business-form-head button:focus-visible,
  .business-ai-invoice-toggle:focus-visible,
  .business-ai-upload-box:focus-within,
  .business-ai-file-row button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    box-shadow: var(--focus-shadow);
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

    .business-modal-backdrop {
      padding: 12px;
      align-items: end;
      place-items: end center;
    }

    .business-form-modal {
      width: 100%;
      max-height: 92vh;
      border-radius: var(--radius-panel) var(--radius-panel) 0 0;
    }

    .business-form-head,
    .business-form-scroll,
    .business-form-actions {
      padding-inline: 14px;
    }

    .business-ai-invoice-head,
    .business-ai-result-head,
    .business-ai-file-row {
      align-items: stretch;
      flex-direction: column;
    }

    .business-ai-invoice-toggle,
    .business-ai-actions button,
    .business-ai-file-row button {
      width: 100%;
    }

    .business-ai-result-grid {
      grid-template-columns: 1fr;
    }

    .business-back-link {
      width: 100%;
      min-height: 46px;
    }

    .business-record-actions button,
    .business-primary-btn,
    .business-ghost-btn,
    .business-empty-action {
      flex: 1 1 auto;
    }
  }
`;
