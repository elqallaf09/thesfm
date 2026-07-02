'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type ShariahStatus = 'compliant' | 'non_compliant' | 'needs_review' | 'unclassified';

type ShariahRow = {
  id?: string | number;
  symbol: string;
  display_symbol?: string | null;
  provider_symbol?: string | null;
  name?: string | null;
  company_name_ar?: string | null;
  company_name_en?: string | null;
  asset_type?: string | null;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  shariah_status?: ShariahStatus | string | null;
  shariah_reason?: string | null;
  shariah_source?: string | null;
  shariah_last_reviewed_at?: string | null;
  shariah_manual_override?: boolean | null;
  shariah_reviewed_by?: string | null;
  updated_at?: string | null;
};

type ApiResponse = {
  ok?: boolean;
  items?: ShariahRow[];
  item?: ShariahRow;
  message?: string;
  code?: string;
};

const statuses: Array<{ value: ShariahStatus; label: string }> = [
  { value: 'compliant', label: 'متوافق' },
  { value: 'non_compliant', label: 'غير متوافق' },
  { value: 'needs_review', label: 'يحتاج مراجعة' },
  { value: 'unclassified', label: 'غير مصنف' },
];

function statusLabel(value: string | null | undefined) {
  return statuses.find(status => status.value === value)?.label ?? 'غير مصنف';
}

function rowName(row: ShariahRow) {
  return row.company_name_ar || row.company_name_en || row.name || row.symbol;
}

function dateText(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-KW', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ShariahAdminClient({ reviewer }: { reviewer: string }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ShariahRow[]>([]);
  const [selected, setSelected] = useState<ShariahRow | null>(null);
  const [status, setStatus] = useState<ShariahStatus>('needs_review');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState('manual_admin_review');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async (term = query) => {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (term.trim()) params.set('q', term.trim());
      const response = await fetch(`/api/admin/shariah?${params}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || data.ok === false) throw new Error(data.message || data.code || 'LOAD_FAILED');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : 'تعذر تحميل البيانات.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load('');
  }, [load]);

  const counts = useMemo(() => {
    return items.reduce<Record<ShariahStatus, number>>((acc, item) => {
      const key = statuses.some(statusItem => statusItem.value === item.shariah_status)
        ? item.shariah_status as ShariahStatus
        : 'unclassified';
      acc[key] += 1;
      return acc;
    }, { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 });
  }, [items]);

  function choose(row: ShariahRow) {
    setSelected(row);
    setStatus(statuses.some(item => item.value === row.shariah_status) ? row.shariah_status as ShariahStatus : 'needs_review');
    setReason(row.shariah_reason || '');
    setSource(row.shariah_source || 'manual_admin_review');
    setMessage('');
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/shariah', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          symbol: selected.symbol,
          exchange: selected.exchange,
          providerSymbol: selected.provider_symbol,
          name: rowName(selected),
          assetType: selected.asset_type,
          country: selected.country,
          currency: selected.currency,
          status,
          reason,
          source,
          reviewedBy: reviewer,
          reviewedAt: new Date().toISOString(),
        }),
      });
      const data = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || data.ok === false || !data.item) throw new Error(data.message || data.code || 'SAVE_FAILED');
      setItems(current => current.map(item => item.symbol === data.item?.symbol ? data.item : item));
      setSelected(data.item);
      setMessage('تم حفظ التصنيف.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ التصنيف.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" style={{ display: 'grid', gap: 16, padding: 24 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: '#64748b', fontWeight: 800 }}>لوحة الإدارة</p>
        <h1 style={{ margin: 0 }}>تصنيفات التوافق الشرعي</h1>
        <p style={{ margin: 0, color: '#475569' }}>راجع رموز السوق واحفظ التصنيف اليدوي عبر بيانات حقيقية من جدول market_symbols.</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {statuses.map(item => (
          <article key={item.value} style={{ border: '1px solid #dbe3ef', borderRadius: 8, padding: 12 }}>
            <strong>{counts[item.value]}</strong>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>{item.label}</p>
          </article>
        ))}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load(query);
        }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="ابحث بالرمز أو الاسم"
          style={{ minHeight: 40, minWidth: 240, flex: '1 1 260px', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px' }}
        />
        <button type="submit" disabled={loading} style={{ minHeight: 40, borderRadius: 8, padding: '0 14px' }}>
          {loading ? 'جار التحميل' : 'بحث'}
        </button>
      </form>

      {message ? <p style={{ margin: 0, color: message.includes('تم ') ? '#047857' : '#b91c1c', fontWeight: 700 }}>{message}</p> : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)', gap: 14, alignItems: 'start' }}>
        <div style={{ overflowX: 'auto', border: '1px solid #dbe3ef', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                {['الرمز', 'الاسم', 'السوق', 'الحالة', 'آخر مراجعة', ''].map(label => (
                  <th key={label} style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #dbe3ef', color: '#475569' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.symbol}:${item.exchange ?? ''}`}>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7', direction: 'ltr', textAlign: 'right', fontWeight: 800 }}>{item.display_symbol || item.symbol}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{rowName(item)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{item.exchange || '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{statusLabel(item.shariah_status)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{dateText(item.shariah_last_reviewed_at)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>
                    <button type="button" onClick={() => choose(item)} style={{ borderRadius: 8, padding: '6px 10px' }}>مراجعة</button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: '#64748b' }}>{loading ? 'جار التحميل' : 'لا توجد نتائج.'}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside style={{ border: '1px solid #dbe3ef', borderRadius: 8, padding: 14, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0 }}>المراجعة اليدوية</h2>
          {selected ? (
            <>
              <strong style={{ direction: 'ltr', textAlign: 'right' }}>{selected.display_symbol || selected.symbol}</strong>
              <span>{rowName(selected)}</span>
              <label style={{ display: 'grid', gap: 6 }}>
                الحالة
                <select value={status} onChange={event => setStatus(event.target.value as ShariahStatus)} style={{ minHeight: 38, borderRadius: 8 }}>
                  {statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                السبب
                <textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} style={{ borderRadius: 8, padding: 10 }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                المصدر
                <input value={source} onChange={event => setSource(event.target.value)} style={{ minHeight: 38, borderRadius: 8, padding: '0 10px' }} />
              </label>
              <button type="button" onClick={() => void save()} disabled={saving} style={{ minHeight: 40, borderRadius: 8 }}>
                {saving ? 'جار الحفظ' : 'حفظ التصنيف'}
              </button>
            </>
          ) : (
            <p style={{ margin: 0, color: '#64748b' }}>اختر رمزاً من الجدول لبدء المراجعة.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
