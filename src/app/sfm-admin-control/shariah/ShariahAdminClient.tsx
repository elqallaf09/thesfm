'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

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

function rowName(row: ShariahRow, lang: string) {
  return lang === 'ar'
    ? row.company_name_ar || row.company_name_en || row.name || row.symbol
    : row.company_name_en || row.name || row.company_name_ar || row.symbol;
}

function dateText(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ShariahAdminClient({ reviewer }: { reviewer: string }) {
  const { t, lang, dir } = useLanguage();
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const statuses: Array<{ value: ShariahStatus; label: string }> = useMemo(() => [
    { value: 'compliant', label: t('admin_shariah_compliant') },
    { value: 'non_compliant', label: t('admin_shariah_non_compliant') },
    { value: 'needs_review', label: t('admin_shariah_needs_review') },
    { value: 'unclassified', label: t('admin_shariah_unclassified') },
  ], [t]);
  const statusLabel = (value: string | null | undefined) => statuses.find(item => item.value === value)?.label ?? t('admin_shariah_unclassified');
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
      setMessage(t('admin_shariah_load_error'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

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
  }, [items, statuses]);

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
          name: rowName(selected, lang),
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
      setMessage(t('admin_shariah_saved'));
    } catch (error) {
      setMessage(t('admin_shariah_save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir={dir} style={{ display: 'grid', gap: 16, padding: 24 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: '#64748b', fontWeight: 800 }}>{t('admin_permission_dashboard')}</p>
        <h1 style={{ margin: 0 }}>{t('admin_shariah_title')}</h1>
        <p style={{ margin: 0, color: '#475569' }}>{t('admin_shariah_desc')}</p>
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
          placeholder={t('admin_shariah_search_placeholder')}
          style={{ minHeight: 40, minWidth: 240, flex: '1 1 260px', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px' }}
        />
        <button type="submit" disabled={loading} style={{ minHeight: 40, borderRadius: 8, padding: '0 14px' }}>
          {loading ? t('admin_shariah_loading') : t('admin_search')}
        </button>
      </form>

      {message ? <p style={{ margin: 0, color: message === t('admin_shariah_saved') ? '#047857' : '#b91c1c', fontWeight: 700 }}>{message}</p> : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)', gap: 14, alignItems: 'start' }}>
        <div style={{ overflowX: 'auto', border: '1px solid #dbe3ef', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                {[t('admin_shariah_symbol'), t('admin_name'), t('admin_shariah_market'), t('admin_status'), t('admin_shariah_last_review'), ''].map(label => (
                  <th key={label} style={{ textAlign: 'start', padding: 10, borderBottom: '1px solid #dbe3ef', color: '#475569' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.symbol}:${item.exchange ?? ''}`}>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7', direction: 'ltr', textAlign: 'right', fontWeight: 800 }}>{item.display_symbol || item.symbol}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{rowName(item, lang)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{item.exchange || '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{statusLabel(item.shariah_status)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>{dateText(item.shariah_last_reviewed_at, locale)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>
                    <button type="button" onClick={() => choose(item)} style={{ borderRadius: 8, padding: '6px 10px' }}>{t('admin_shariah_review')}</button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: '#64748b' }}>{loading ? t('admin_shariah_loading') : t('admin_shariah_empty')}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside style={{ border: '1px solid #dbe3ef', borderRadius: 8, padding: 14, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{t('admin_shariah_manual_review')}</h2>
          {selected ? (
            <>
              <strong style={{ direction: 'ltr', textAlign: 'right' }}>{selected.display_symbol || selected.symbol}</strong>
              <span>{rowName(selected, lang)}</span>
              <label style={{ display: 'grid', gap: 6 }}>
                {t('admin_status')}
                <select value={status} onChange={event => setStatus(event.target.value as ShariahStatus)} style={{ minHeight: 38, borderRadius: 8 }}>
                  {statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                {t('admin_shariah_reason')}
                <textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} style={{ borderRadius: 8, padding: 10 }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                {t('admin_shariah_source')}
                <input value={source} onChange={event => setSource(event.target.value)} style={{ minHeight: 38, borderRadius: 8, padding: '0 10px' }} />
              </label>
              <button type="button" onClick={() => void save()} disabled={saving} style={{ minHeight: 40, borderRadius: 8 }}>
                {saving ? t('admin_shariah_saving') : t('admin_shariah_save')}
              </button>
            </>
          ) : (
            <p style={{ margin: 0, color: '#64748b' }}>{t('admin_shariah_select')}</p>
          )}
        </aside>
      </section>
    </main>
  );
}
