'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, CalendarDays, CircleDollarSign, Download, Edit3, LineChart, Plus, ReceiptText, Sparkles, Trash2, Wallet, X } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

type IncomeType = 'salary' | 'side' | 'investment' | 'bonus' | 'gift' | 'rent' | 'other';
type IncomeStatus = 'received' | 'pending' | 'expected' | 'late';
type Frequency = 'monthly' | 'weekly' | 'yearly';
type Lang = 'ar' | 'en' | 'fr';

type IncomeRow = {
  id: string;
  user_id?: string;
  label?: string | null;
  name?: string | null;
  category?: string | null;
  amount: number;
  income_type?: string | null;
  status?: string | null;
  received_date?: string | null;
  currency?: string | null;
  source_name?: string | null;
  notes?: string | null;
  is_recurring?: boolean | null;
  frequency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type IncomeForm = {
  id?: string;
  name: string;
  amount: string;
  currency: string;
  incomeType: IncomeType;
  receivedDate: string;
  status: IncomeStatus;
  isRecurring: boolean;
  frequency: Frequency;
  sourceName: string;
  notes: string;
};

const TX: Record<string, Record<Lang, string>> = {
  breadcrumb: { ar: 'THE SFM / الدخل', en: 'THE SFM / Income', fr: 'THE SFM / Revenus' },
  title: { ar: 'الدخل', en: 'Income', fr: 'Revenus' },
  monthNow: { ar: 'مايو 2026 • محدّث الآن', en: 'May 2026 • Updated now', fr: 'Mai 2026 • Mis à jour maintenant' },
  export: { ar: 'تصدير', en: 'Export', fr: 'Exporter' },
  addIncome: { ar: '+ إضافة دخل', en: '+ Add Income', fr: '+ Ajouter un revenu' },
  savingsInsight: { ar: 'معدل الادخار 43% — أعلى من المستهدف', en: 'Savings rate 43% — above target', fr: 'Taux d’épargne 43% — au-dessus de l’objectif' },
  spendingInsight: { ar: 'نسبة الصرف 57% — تجاوزت قاعدة 50/30/20', en: 'Spending ratio 57% — above the 50/30/20 rule', fr: 'Ratio de dépenses 57% — au-dessus de la règle 50/30/20' },
  forecastInsight: { ar: 'توقع الشهر القادم +5.2% بناءً على 6 شهور', en: 'Next month forecast +5.2% based on 6 months', fr: 'Prévision du mois prochain +5,2% sur 6 mois' },
  viewExpenses: { ar: 'اعرض المصاريف', en: 'View expenses', fr: 'Voir les dépenses' },
  totalIncome: { ar: 'إجمالي الدخل', en: 'Total Income', fr: 'Revenu total' },
  incomeSources: { ar: 'مصادر الدخل', en: 'Income Sources', fr: 'Sources de revenus' },
  active: { ar: 'نشطة', en: 'active', fr: 'actives' },
  expectedNet: { ar: 'الصافي المتوقع', en: 'Expected Net', fr: 'Net prévu' },
  distribution: { ar: 'توزيع الدخل', en: 'Income Distribution', fr: 'Répartition des revenus' },
  trend: { ar: 'اتجاه الدخل الشهري', en: 'Monthly Income Trend', fr: 'Tendance mensuelle des revenus' },
  incomeList: { ar: 'مصادر الدخل', en: 'Income Sources', fr: 'Sources de revenus' },
  noIncome: { ar: 'لا توجد مصادر دخل بعد', en: 'No income sources yet', fr: 'Aucune source de revenu pour le moment' },
  name: { ar: 'اسم الدخل', en: 'Income name', fr: 'Nom du revenu' },
  amount: { ar: 'المبلغ', en: 'Amount', fr: 'Montant' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  type: { ar: 'النوع', en: 'Type', fr: 'Type' },
  receivedDate: { ar: 'تاريخ الاستلام', en: 'Received date', fr: 'Date de réception' },
  status: { ar: 'الحالة', en: 'Status', fr: 'Statut' },
  recurring: { ar: 'متكرر', en: 'Recurring', fr: 'Récurrent' },
  oneTime: { ar: 'لمرة واحدة', en: 'One time', fr: 'Une fois' },
  frequency: { ar: 'التكرار', en: 'Frequency', fr: 'Fréquence' },
  sourceCompany: { ar: 'المصدر / الجهة', en: 'Source / Company', fr: 'Source / organisme' },
  notes: { ar: 'ملاحظات', en: 'Notes', fr: 'Notes' },
  cancel: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
  add: { ar: '+ إضافة', en: '+ Add', fr: '+ Ajouter' },
  save: { ar: 'حفظ', en: 'Save', fr: 'Enregistrer' },
  saving: { ar: 'جارٍ الحفظ...', en: 'Saving...', fr: 'Enregistrement...' },
  edit: { ar: 'تعديل', en: 'Edit', fr: 'Modifier' },
  delete: { ar: 'حذف', en: 'Delete', fr: 'Supprimer' },
  close: { ar: 'إغلاق', en: 'Close', fr: 'Fermer' },
  source: { ar: 'المصدر', en: 'Source', fr: 'Source' },
  date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
  percent: { ar: 'من الإجمالي', en: 'of total', fr: 'du total' },
  nameError: { ar: 'الرجاء إدخال اسم الدخل.', en: 'Please enter income name.', fr: 'Veuillez saisir le nom du revenu.' },
  amountError: { ar: 'المبلغ يجب أن يكون أكبر من صفر.', en: 'Amount must be greater than zero.', fr: 'Le montant doit être supérieur à zéro.' },
  requiredError: { ar: 'يرجى إكمال الحقول المطلوبة.', en: 'Please complete the required fields.', fr: 'Veuillez compléter les champs requis.' },
  saved: { ar: 'تم حفظ الدخل', en: 'Income saved', fr: 'Revenu enregistré' },
  deleted: { ar: 'تم حذف الدخل', en: 'Income deleted', fr: 'Revenu supprimé' },
  exportSoon: { ar: 'التصدير غير مفعّل في هذه المرحلة.', en: 'Export is not enabled in this phase.', fr: 'L’export n’est pas activé dans cette phase.' },
  insightDetails: { ar: 'هذه قراءة إرشادية مؤقتة لتحسين التخطيط الشهري.', en: 'This is a temporary guidance insight for monthly planning.', fr: 'Il s’agit d’un aperçu indicatif temporaire pour la planification mensuelle.' },
};

const TYPES: Array<{ id: IncomeType; icon: string; label: Record<Lang, string> }> = [
  { id: 'salary', icon: '💼', label: { ar: 'راتب', en: 'Salary', fr: 'Salaire' } },
  { id: 'side', icon: '🧰', label: { ar: 'دخل جانبي', en: 'Side income', fr: 'Revenu secondaire' } },
  { id: 'investment', icon: '📈', label: { ar: 'استثمار', en: 'Investment', fr: 'Investissement' } },
  { id: 'bonus', icon: '✨', label: { ar: 'مكافأة', en: 'Bonus', fr: 'Prime' } },
  { id: 'gift', icon: '🎁', label: { ar: 'هدية', en: 'Gift', fr: 'Cadeau' } },
  { id: 'rent', icon: '🏠', label: { ar: 'إيجار', en: 'Rent', fr: 'Loyer' } },
  { id: 'other', icon: '💰', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

const STATUSES: Array<{ id: IncomeStatus; label: Record<Lang, string> }> = [
  { id: 'received', label: { ar: 'مستلم', en: 'Received', fr: 'Reçu' } },
  { id: 'pending', label: { ar: 'بانتظار', en: 'Pending', fr: 'En attente' } },
  { id: 'expected', label: { ar: 'متوقع', en: 'Expected', fr: 'Prévu' } },
  { id: 'late', label: { ar: 'متأخر', en: 'Late', fr: 'En retard' } },
];

const FREQUENCIES: Array<{ id: Frequency; label: Record<Lang, string> }> = [
  { id: 'monthly', label: { ar: 'شهري', en: 'Monthly', fr: 'Mensuel' } },
  { id: 'weekly', label: { ar: 'أسبوعي', en: 'Weekly', fr: 'Hebdomadaire' } },
  { id: 'yearly', label: { ar: 'سنوي', en: 'Yearly', fr: 'Annuel' } },
];

const emptyForm = (): IncomeForm => ({
  name: '',
  amount: '',
  currency: 'KWD',
  incomeType: 'other',
  receivedDate: new Date().toISOString().slice(0, 10),
  status: 'received',
  isRecurring: false,
  frequency: 'monthly',
  sourceName: '',
  notes: '',
});

function tr(key: keyof typeof TX, lang: string) {
  const safe = lang === 'fr' || lang === 'en' || lang === 'ar' ? lang : 'ar';
  return TX[key][safe];
}

function normalizeType(value?: string | null): IncomeType {
  if (value === 'salary' || value === 'side' || value === 'investment' || value === 'bonus' || value === 'gift' || value === 'rent') return value;
  if (value === 'business' || value === 'additional' || value === 'active') return 'side';
  if (value === 'passive') return 'rent';
  return 'other';
}

function normalizeStatus(value?: string | null): IncomeStatus {
  if (value === 'pending' || value === 'expected' || value === 'late') return value;
  return 'received';
}

function formatMoney(value: number, lang: string, currency = 'KWD') {
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)} ${currency}`;
}

function formatDate(value: string | null | undefined, lang: string) {
  const date = value ? new Date(value) : new Date();
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function typeLabel(type: string | null | undefined, lang: string) {
  const item = TYPES.find(entry => entry.id === normalizeType(type)) ?? TYPES.at(-1)!;
  return item.label[lang as Lang] ?? item.label.ar;
}

function typeIcon(type: string | null | undefined) {
  return (TYPES.find(entry => entry.id === normalizeType(type)) ?? TYPES.at(-1)!).icon;
}

function statusLabel(status: string | null | undefined, lang: string) {
  const item = STATUSES.find(entry => entry.id === normalizeStatus(status)) ?? STATUSES[0];
  return item.label[lang as Lang] ?? item.label.ar;
}

function legacyName(row: IncomeRow) {
  return row.label || row.name || row.source_name || 'Income';
}

export default function IncomePage() {
  const { lang, dir } = useLanguage();
  const { user, isGuest } = useAuth();
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<IncomeForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [insightOpen, setInsightOpen] = useState<string | null>(null);

  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';

  const load = useCallback(async () => {
    setLoading(true);
    if (isGuest || !user) {
      try {
        const local = JSON.parse(localStorage.getItem('sfm_guest_income') || '[]') as IncomeRow[];
        setRows(local);
      } catch {
        setRows([]);
      }
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('monthly_income_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('received_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    setRows((data ?? []) as IncomeRow[]);
    setLoading(false);
  }, [isGuest, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const activeSources = rows.filter(row => normalizeStatus(row.status) !== 'late').length;
  const expectedNet = Math.max(total * 0.433, 0);

  const distribution = useMemo(() => {
    const data = [
      { label: typeLabel('salary', lang), value: 74, color: '#3D2914' },
      { label: typeLabel('bonus', lang), value: 19.8, color: '#BA7517' },
      { label: typeLabel('rent', lang), value: 6.2, color: '#EF9F27' },
    ];
    return data;
  }, [lang]);

  const trend = [1850, 1910, 1980, 2025, 2100, 2160, 2210, 2260, 2310, 2380, 2416, 2542];
  const points = trend.map((value, index) => {
    const x = (index / (trend.length - 1)) * 360;
    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const y = 130 - ((value - min) / (max - min || 1)) * 110;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  function openCreate() {
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(row: IncomeRow) {
    setForm({
      id: row.id,
      name: legacyName(row),
      amount: String(row.amount || ''),
      currency: row.currency || 'KWD',
      incomeType: normalizeType(row.income_type || row.category),
      receivedDate: row.received_date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      status: normalizeStatus(row.status),
      isRecurring: Boolean(row.is_recurring),
      frequency: (row.frequency === 'weekly' || row.frequency === 'yearly' ? row.frequency : 'monthly'),
      sourceName: row.source_name || '',
      notes: row.notes || '',
    });
    setFormError('');
    setModalOpen(true);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  async function saveIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (name.length < 2) return setFormError(tr('nameError', lang));
    if (!amount || amount <= 0) return setFormError(tr('amountError', lang));
    if (!form.incomeType || !form.receivedDate || !form.status) return setFormError(tr('requiredError', lang));

    setSaving(true);
    const id = form.id || crypto.randomUUID();
    const payload = {
      label: name,
      category: form.incomeType,
      amount,
      income_type: form.incomeType,
      status: form.status,
      received_date: form.receivedDate,
      currency: form.currency,
      source_name: form.sourceName || null,
      notes: form.notes || null,
      is_recurring: form.isRecurring,
      frequency: form.isRecurring ? form.frequency : null,
      updated_at: new Date().toISOString(),
    };
    const nextRow: IncomeRow = { id, ...payload, created_at: new Date().toISOString() };

    try {
      if (isGuest || !user) {
        const next = form.id ? rows.map(row => row.id === id ? { ...row, ...nextRow } : row) : [nextRow, ...rows];
        localStorage.setItem('sfm_guest_income', JSON.stringify(next));
        setRows(next);
      } else if (form.id) {
        const { error } = await supabase.from('monthly_income_sources').update(payload).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
        setRows(previous => previous.map(row => row.id === id ? { ...row, ...nextRow } : row));
      } else {
        const { data, error } = await supabase
          .from('monthly_income_sources')
          .insert({ ...payload, user_id: user.id })
          .select('*')
          .single();
        if (error) throw error;
        setRows(previous => [data as IncomeRow, ...previous]);
      }
      setModalOpen(false);
      showToast(tr('saved', lang));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : tr('requiredError', lang));
    } finally {
      setSaving(false);
    }
  }

  async function deleteIncome(row: IncomeRow) {
    if (isGuest || !user) {
      const next = rows.filter(item => item.id !== row.id);
      localStorage.setItem('sfm_guest_income', JSON.stringify(next));
      setRows(next);
    } else {
      await supabase.from('monthly_income_sources').delete().eq('id', row.id).eq('user_id', user.id);
      setRows(previous => previous.filter(item => item.id !== row.id));
    }
    showToast(tr('deleted', lang));
  }

  function donutBackground() {
    let cursor = 0;
    const stops = distribution.map(item => {
      const start = cursor;
      cursor += item.value;
      return `${item.color} ${start}% ${cursor}%`;
    }).join(', ');
    return `conic-gradient(${stops})`;
  }

  return (
    <div className="income-shell" dir={dir}>
      <AppHeader />
      <Sidebar />
      <main className="income-main">
        <header className="income-header">
          <div>
            <p>{tr('breadcrumb', lang)}</p>
            <h1>{tr('title', lang)}</h1>
            <span>{tr('monthNow', lang)}</span>
          </div>
          <div className="income-actions">
            <button type="button" className="ghost" aria-label={tr('export', lang)} onClick={() => showToast(tr('exportSoon', lang))} disabled>
              <Download size={16} />{tr('export', lang)}
            </button>
            <button type="button" className="primary" onClick={openCreate}>
              <Plus size={16} />{tr('addIncome', lang)}
            </button>
          </div>
        </header>

        <section className="insights" aria-label="income insights">
          {[
            ['success', tr('savingsInsight', lang), null],
            ['warning', tr('spendingInsight', lang), tr('viewExpenses', lang)],
            ['info', tr('forecastInsight', lang), null],
          ].map(([tone, text, action]) => (
            <button type="button" className={`insight ${tone}`} key={text} onClick={() => setInsightOpen(text)}>
              <Sparkles size={17} />
              <span>{text}</span>
              {action && <b>{action}</b>}
            </button>
          ))}
        </section>

        <section className="stat-grid">
          <article><span><Wallet size={18} />{tr('totalIncome', lang)}</span><strong>{formatMoney(total || 2416, lang)}</strong><em>↑ 8.2%</em></article>
          <article><span><BriefcaseBusiness size={18} />{tr('incomeSources', lang)}</span><strong>{activeSources || 3} {tr('active', lang)}</strong><em>↑ 2</em></article>
          <article><span><CircleDollarSign size={18} />{tr('expectedNet', lang)}</span><strong>{formatMoney(expectedNet || 1046.4, lang)}</strong><em>↑ 3.1%</em></article>
        </section>

        <section className="chart-grid">
          <article className="panel">
            <div className="panel-title"><BarChart3 size={18} /><h2>{tr('distribution', lang)}</h2></div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: donutBackground() }}><span>{new Intl.NumberFormat(locale).format(100)}%</span></div>
              <div className="legend">
                {distribution.map(item => <div key={item.label}><i style={{ background: item.color }} /> <span>{item.label}</span><b>{new Intl.NumberFormat(locale).format(item.value)}%</b></div>)}
              </div>
            </div>
          </article>
          <article className="panel">
            <div className="panel-title"><LineChart size={18} /><h2>{tr('trend', lang)}</h2></div>
            <svg className="line-chart" viewBox="0 0 360 150" role="img" aria-label={tr('trend', lang)}>
              <polyline points={points} fill="none" stroke="#BA7517" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="360" cy={points.split(' ').at(-1)?.split(',')[1] || 20} r="5" fill="#EF9F27" />
            </svg>
          </article>
        </section>

        <section className="panel">
          <div className="panel-title list-title">
            <ReceiptText size={18} /><h2>{tr('incomeList', lang)}</h2>
          </div>
          <div className="income-list">
            {loading ? <div className="empty">{tr('title', lang)}...</div> : rows.length === 0 ? <div className="empty">{tr('noIncome', lang)}</div> : rows.map(row => {
              const amount = Number(row.amount || 0);
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <article className="income-row" key={row.id}>
                  <div className="row-main">
                    <div className="row-icon">{typeIcon(row.income_type || row.category)}</div>
                    <div>
                      <strong>{legacyName(row)}</strong>
                      <span>{typeLabel(row.income_type || row.category, lang)} · {row.source_name || tr('source', lang)}</span>
                      <div className="row-meta">
                        <em className={`status ${normalizeStatus(row.status)}`}>{statusLabel(row.status, lang)}</em>
                        <em><CalendarDays size={12} />{formatDate(row.received_date || row.created_at, lang)}</em>
                        <em>{pct}% {tr('percent', lang)}</em>
                      </div>
                    </div>
                  </div>
                  <div className="row-side">
                    <b>{formatMoney(amount, lang, row.currency || 'KWD')}</b>
                    <div>
                      <button type="button" aria-label={tr('edit', lang)} onClick={() => openEdit(row)}><Edit3 size={15} /></button>
                      <button type="button" aria-label={tr('delete', lang)} onClick={() => void deleteIncome(row)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <div className="income-modal" role="dialog" aria-modal="true" aria-labelledby="income-modal-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head">
              <div><p>{tr('breadcrumb', lang)}</p><h2 id="income-modal-title">{form.id ? tr('edit', lang) : tr('addIncome', lang)}</h2></div>
              <button type="button" aria-label={tr('close', lang)} onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form className="income-form" onSubmit={saveIncome}>
              <label><span>{tr('name', lang)}</span><input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} /></label>
              <label><span>{tr('amount', lang)}</span><input value={form.amount} inputMode="decimal" onChange={e => setForm({ ...form, amount: e.target.value })} required /></label>
              <label><span>{tr('currency', lang)}</span><input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} /></label>
              <label><span>{tr('receivedDate', lang)}</span><input type="date" value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} required /></label>
              <label><span>{tr('type', lang)}</span><select value={form.incomeType} onChange={e => setForm({ ...form, incomeType: e.target.value as IncomeType })}>{TYPES.map(item => <option key={item.id} value={item.id}>{item.icon} {item.label[lang as Lang]}</option>)}</select></label>
              <label><span>{tr('status', lang)}</span><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as IncomeStatus })}>{STATUSES.map(item => <option key={item.id} value={item.id}>{item.label[lang as Lang]}</option>)}</select></label>
              <label className="toggle-line"><span>{tr('recurring', lang)}</span><button type="button" className={form.isRecurring ? 'toggle on' : 'toggle'} onClick={() => setForm({ ...form, isRecurring: !form.isRecurring })}><span />{form.isRecurring ? tr('recurring', lang) : tr('oneTime', lang)}</button></label>
              {form.isRecurring && <label><span>{tr('frequency', lang)}</span><select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as Frequency })}>{FREQUENCIES.map(item => <option key={item.id} value={item.id}>{item.label[lang as Lang]}</option>)}</select></label>}
              <label><span>{tr('sourceCompany', lang)}</span><input value={form.sourceName} onChange={e => setForm({ ...form, sourceName: e.target.value })} /></label>
              <label className="wide"><span>{tr('notes', lang)}</span><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
              {formError && <div className="form-error">{formError}</div>}
              <div className="form-actions">
                <button type="button" className="ghost-light" onClick={() => setModalOpen(false)} disabled={saving}>{tr('cancel', lang)}</button>
                <button type="submit" className="primary-dark" disabled={saving}>{saving ? tr('saving', lang) : form.id ? tr('save', lang) : tr('add', lang)}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {insightOpen && (
        <div className="mini-pop" role="dialog" aria-modal="true">
          <button type="button" aria-label={tr('close', lang)} onClick={() => setInsightOpen(null)}><X size={14} /></button>
          <strong>{insightOpen}</strong>
          <p>{tr('insightDetails', lang)}</p>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .income-shell{min-height:100dvh;background:#F5F1E8;color:#24180d;font-family:Cairo,Tajawal,"IBM Plex Sans Arabic",Arial,sans-serif;overflow-x:hidden}
        .income-main{width:100%;max-width:1320px;margin:0 auto;padding:24px;margin-inline-start:250px;display:grid;gap:16px}
        .income-header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:20px}
        .income-header p,.income-header span{margin:0;color:#7b6248;font-size:13px;font-weight:500}.income-header h1{margin:6px 0;font-size:34px;font-weight:600;color:#3D2914}
        .income-actions{display:flex;gap:10px;flex-wrap:wrap}.primary,.ghost,.primary-dark,.ghost-light{border-radius:12px;border:1px solid rgba(0,0,0,.08);height:42px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:500 14px inherit;cursor:pointer}.primary,.primary-dark{background:#3D2914;color:#fff}.ghost{background:#fff;color:#3D2914}.ghost:disabled{opacity:.55;cursor:not-allowed}.ghost-light{background:#fff;color:#3D2914}
        .insights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.insight{min-height:74px;text-align:start;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;background:#fff;display:flex;align-items:center;gap:10px;color:#3D2914;cursor:pointer}.insight span{line-height:1.6;font-weight:500}.insight b{margin-inline-start:auto;font-size:12px;color:#854F0B}.insight.success{background:#EAF3DE;color:#27500A}.insight.warning{background:#FAEEDA;color:#854F0B}.insight.info{background:#E6F1FB;color:#0C447C}
        .stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.stat-grid article,.panel{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:18px;box-shadow:0 8px 22px rgba(61,41,20,.04)}.stat-grid span{display:flex;gap:8px;align-items:center;color:#7b6248;font-size:13px}.stat-grid strong{display:block;margin-top:10px;font-size:26px;font-weight:600;color:#3D2914}.stat-grid em{display:inline-flex;margin-top:10px;border-radius:999px;background:#EAF3DE;color:#27500A;padding:4px 9px;font-style:normal;font-size:12px}
        .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.panel-title{display:flex;align-items:center;gap:9px;margin-bottom:16px;color:#BA7517}.panel-title h2{margin:0;font-size:18px;font-weight:600;color:#3D2914}.donut-wrap{display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center}.donut{width:170px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;position:relative}.donut:after{content:"";position:absolute;inset:32px;background:#fff;border-radius:50%}.donut span{position:relative;z-index:1;font-weight:600;color:#3D2914}.legend{display:grid;gap:10px}.legend div{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:13px}.legend i{width:10px;height:10px;border-radius:50%}.line-chart{width:100%;height:auto;min-height:170px;background:#F5F1E8;border-radius:14px;padding:12px;overflow:visible}
        .income-list{display:grid;gap:10px}.income-row{display:flex;justify-content:space-between;gap:14px;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;background:#fff}.row-main{display:flex;gap:12px;min-width:0}.row-icon{width:44px;height:44px;border-radius:14px;background:#FAEEDA;display:grid;place-items:center;font-size:21px}.row-main strong{display:block;font-size:15px;font-weight:600;color:#3D2914}.row-main span{display:block;margin-top:4px;color:#7b6248;font-size:12px}.row-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.row-meta em{font-style:normal;border-radius:999px;background:#F5F1E8;color:#7b6248;padding:4px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px}.row-meta .received{background:#EAF3DE;color:#27500A}.row-meta .pending,.row-meta .expected{background:#FAEEDA;color:#854F0B}.row-meta .late{background:#FCEBEB;color:#791F1F}.row-side{display:flex;align-items:center;gap:12px}.row-side b{white-space:nowrap;color:#3D2914}.row-side div{display:flex;gap:6px}.row-side button,.modal-head button,.mini-pop button{width:36px;height:36px;border-radius:11px;border:1px solid rgba(0,0,0,.08);background:#fff;color:#3D2914;display:grid;place-items:center;cursor:pointer}.empty{padding:24px;text-align:center;color:#7b6248;border:1px dashed rgba(0,0,0,.12);border-radius:14px}
        .modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(36,24,13,.42);display:grid;place-items:center;padding:18px}.income-modal{width:min(760px,100%);max-height:min(92dvh,900px);overflow:auto;background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.08);padding:20px}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.modal-head p{margin:0;color:#BA7517;font-size:12px}.modal-head h2{margin:4px 0 0;font-size:24px;color:#3D2914}.income-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.income-form label{display:grid;gap:7px;color:#3D2914;font-size:13px;font-weight:500}.income-form input,.income-form select,.income-form textarea{width:100%;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:#F5F1E8;color:#3D2914;padding:0 12px;min-height:46px;font:500 14px inherit;outline:none}.income-form textarea{min-height:92px;padding-top:12px;resize:vertical}.income-form input:focus,.income-form select:focus,.income-form textarea:focus{border-color:#BA7517;box-shadow:0 0 0 3px rgba(186,117,23,.14);background:#fff}.wide,.form-actions,.form-error{grid-column:1/-1}.toggle-line{align-content:end}.toggle{height:46px;border-radius:12px;border:1px solid rgba(0,0,0,.08);background:#F5F1E8;color:#3D2914;display:flex;align-items:center;gap:9px;padding:0 12px;cursor:pointer}.toggle span{width:20px;height:20px;border-radius:50%;background:#c9bea9}.toggle.on span{background:#BA7517}.form-actions{display:flex;justify-content:flex-end;gap:10px}.form-error{background:#FCEBEB;color:#791F1F;border-radius:12px;padding:10px 12px;font-size:13px}
        .mini-pop,.toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;max-width:min(360px,calc(100vw - 32px));box-shadow:0 16px 38px rgba(61,41,20,.12)}.mini-pop strong{display:block;margin-bottom:6px}.mini-pop p{margin:0;color:#7b6248;line-height:1.6}.mini-pop button{float:inline-end;width:28px;height:28px}.toast{background:#EAF3DE;color:#27500A;font-weight:600}
        @media(max-width:1024px){.income-main{margin-inline-start:0;padding:calc(84px + env(safe-area-inset-top)) 16px 24px}.insights,.chart-grid{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.income-header,.income-row{display:grid}.income-actions,.form-actions{display:grid;grid-template-columns:1fr}.primary,.ghost,.primary-dark,.ghost-light{width:100%}.stat-grid,.income-form,.donut-wrap{grid-template-columns:1fr}.row-side{justify-content:space-between}.modal-backdrop{align-items:end;padding:10px}.income-modal{border-radius:20px 20px 0 0;max-height:94dvh;padding-bottom:calc(20px + env(safe-area-inset-bottom))}.insight{align-items:flex-start}.insight b{margin-inline-start:0}.row-meta{gap:5px}}
      `}</style>
    </div>
  );
}
