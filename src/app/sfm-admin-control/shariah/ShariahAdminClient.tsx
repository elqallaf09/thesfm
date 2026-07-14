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
  counts?: Record<ShariahStatus, number>;
};

const EMPTY_SHARIAH_COUNTS: Record<ShariahStatus, number> = { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 };

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
  // Server-computed across the FULL catalog (see /api/admin/shariah's computeShariahCounts) — not
  // a client-side reduce over just the loaded/paginated rows, which previously under-counted any
  // status once the catalog exceeded the page limit.
  const [counts, setCounts] = useState<Record<ShariahStatus, number>>(EMPTY_SHARIAH_COUNTS);
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
      setCounts(data.counts ?? EMPTY_SHARIAH_COUNTS);
    } catch (error) {
      setItems([]);
      setCounts(EMPTY_SHARIAH_COUNTS);
      setMessage(t('admin_shariah_load_error'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    void load('');
  }, [load]);

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
    <main dir={dir} className="sharia-admin-page">
      <header className="sharia-admin-header">
        <p className="sharia-admin-eyebrow">{t('admin_permission_dashboard')}</p>
        <h1>{t('admin_shariah_title')}</h1>
        <p>{t('admin_shariah_desc')}</p>
      </header>

      <section className="sharia-admin-stats">
        {statuses.map(item => (
          <article key={item.value} className={`sharia-admin-stat status-${item.value}`}>
            <strong>{counts[item.value]}</strong>
            <p>{item.label}</p>
          </article>
        ))}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load(query);
        }}
        className="sharia-admin-search"
      >
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('admin_shariah_search_placeholder')}
          aria-label={t('admin_shariah_search_placeholder')}
        />
        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? t('admin_shariah_loading') : t('admin_search')}
        </button>
      </form>

      {message ? <p role="status" className={`sharia-admin-message ${message === t('admin_shariah_saved') ? 'success' : 'error'}`}>{message}</p> : null}

      <section className="sharia-admin-workspace">
        <div className="sharia-admin-table-shell">
          <table>
            <thead>
              <tr>
                {[t('admin_shariah_symbol'), t('admin_name'), t('admin_shariah_market'), t('admin_status'), t('admin_shariah_last_review'), ''].map(label => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.symbol}:${item.exchange ?? ''}`}>
                  <td className="sharia-admin-symbol" dir="ltr">{item.display_symbol || item.symbol}</td>
                  <td>{rowName(item, lang)}</td>
                  <td>{item.exchange || '—'}</td>
                  <td><span className={`sharia-admin-status status-${item.shariah_status || 'unclassified'}`}>{statusLabel(item.shariah_status)}</span></td>
                  <td>{dateText(item.shariah_last_reviewed_at, locale)}</td>
                  <td>
                    <button type="button" className="sharia-admin-review-button" onClick={() => choose(item)}>{t('admin_shariah_review')}</button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr><td colSpan={6} className="sharia-admin-empty">{loading ? t('admin_shariah_loading') : t('admin_shariah_empty')}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="sharia-admin-review-panel">
          <h2>{t('admin_shariah_manual_review')}</h2>
          {selected ? (
            <>
              <strong className="sharia-admin-selected-symbol" dir="ltr">{selected.display_symbol || selected.symbol}</strong>
              <span>{rowName(selected, lang)}</span>
              <label>
                {t('admin_status')}
                <select value={status} onChange={event => setStatus(event.target.value as ShariahStatus)}>
                  {statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label>
                {t('admin_shariah_reason')}
                <textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} />
              </label>
              <label>
                {t('admin_shariah_source')}
                <input value={source} onChange={event => setSource(event.target.value)} />
              </label>
              <button type="button" className="sharia-admin-save-button" onClick={() => void save()} disabled={saving} aria-busy={saving}>
                {saving ? t('admin_shariah_saving') : t('admin_shariah_save')}
              </button>
            </>
          ) : (
            <p className="sharia-admin-selection-empty">{t('admin_shariah_select')}</p>
          )}
        </aside>
      </section>
      <style jsx>{`
        .sharia-admin-page{display:grid;gap:20px;min-width:0;padding:clamp(16px,2.4vw,28px);color:var(--foreground);background:var(--background);font-family:var(--font-ui)}
        .sharia-admin-header{display:grid;gap:8px;min-width:0}.sharia-admin-header h1,.sharia-admin-header p,.sharia-admin-eyebrow{margin:0}.sharia-admin-header h1{color:var(--foreground);font-size:clamp(28px,4vw,42px);line-height:1.15;font-weight:600}.sharia-admin-header>p:last-child{max-width:76ch;color:var(--foreground-secondary);line-height:1.75}.sharia-admin-eyebrow{color:var(--primary);font-size:13px;font-weight:600}
        .sharia-admin-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:12px}.sharia-admin-stat{min-width:0;padding:16px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-sm)}.sharia-admin-stat strong{display:block;color:var(--foreground);font:600 26px/1 var(--font-data);font-variant-numeric:tabular-nums}.sharia-admin-stat p{margin:7px 0 0;color:var(--foreground-muted);font-size:13px;font-weight:500}.sharia-admin-stat.status-compliant{border-color:color-mix(in srgb,var(--success) 38%,var(--border))}.sharia-admin-stat.status-non_compliant{border-color:color-mix(in srgb,var(--danger) 38%,var(--border))}.sharia-admin-stat.status-needs_review{border-color:color-mix(in srgb,var(--warning) 38%,var(--border))}
        .sharia-admin-search{display:flex;flex-wrap:wrap;gap:10px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-xs)}.sharia-admin-search input{min-width:min(240px,100%);flex:1 1 280px;padding-inline:13px}.sharia-admin-search button,.sharia-admin-review-button,.sharia-admin-save-button{min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);padding-inline:16px;background:var(--primary);color:var(--primary-foreground);font:600 13px var(--font-ui);cursor:pointer}.sharia-admin-review-button{border-color:var(--border);background:var(--surface-elevated);color:var(--foreground)}.sharia-admin-search button:disabled,.sharia-admin-save-button:disabled{cursor:not-allowed;opacity:.72}
        .sharia-admin-message{margin:0;padding:11px 13px;border:1px solid;border-radius:var(--radius-control);font-weight:500}.sharia-admin-message.success{border-color:color-mix(in srgb,var(--success) 32%,transparent);background:var(--success-soft);color:var(--success)}.sharia-admin-message.error{border-color:color-mix(in srgb,var(--danger) 32%,transparent);background:var(--danger-soft);color:var(--danger)}
        .sharia-admin-workspace{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.72fr);gap:16px;align-items:start;min-width:0}.sharia-admin-table-shell{min-width:0;max-width:100%;overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-sm)}table{width:100%;min-width:760px;border-collapse:separate;border-spacing:0;color:var(--foreground);font-size:13px}th,td{padding:12px;border-bottom:1px solid var(--border);text-align:start;vertical-align:middle}th{position:sticky;top:0;z-index:2;background:var(--surface-muted);color:var(--foreground-secondary);font-size:12px;font-weight:600;white-space:nowrap}tbody tr{transition:background .16s ease}tbody tr:hover{background:var(--surface-hover)}.sharia-admin-symbol{font:600 13px var(--font-data);text-align:end;font-variant-numeric:tabular-nums}.sharia-admin-status{display:inline-flex;max-width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);font-size:12px;font-weight:600;white-space:normal}.sharia-admin-status.status-compliant{border-color:color-mix(in srgb,var(--success) 32%,transparent);background:var(--success-soft);color:var(--success)}.sharia-admin-status.status-non_compliant{border-color:color-mix(in srgb,var(--danger) 32%,transparent);background:var(--danger-soft);color:var(--danger)}.sharia-admin-status.status-needs_review{border-color:color-mix(in srgb,var(--warning) 32%,transparent);background:var(--warning-soft);color:var(--warning)}.sharia-admin-empty{padding:28px;text-align:center;color:var(--foreground-muted)}
        .sharia-admin-review-panel{display:grid;gap:12px;min-width:0;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-sm)}.sharia-admin-review-panel h2{margin:0;color:var(--foreground);font-size:20px;font-weight:600}.sharia-admin-selected-symbol{text-align:end;color:var(--primary);font:600 20px var(--font-data);font-variant-numeric:tabular-nums}.sharia-admin-review-panel label{display:grid;gap:7px;color:var(--foreground-secondary);font-size:13px;font-weight:600}.sharia-admin-review-panel :is(input,select,textarea){width:100%;padding-inline:11px}.sharia-admin-review-panel textarea{padding-block:10px;resize:vertical}.sharia-admin-page :is(button,input,select,textarea):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}.sharia-admin-selection-empty{min-height:180px;margin:0;display:grid;place-items:center;padding:18px;border:1px dashed var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground-muted);text-align:center}
        @media(max-width:960px){.sharia-admin-workspace{grid-template-columns:minmax(0,1fr)}.sharia-admin-review-panel{position:static}}
        @media(max-width:520px){.sharia-admin-page{padding:14px;gap:16px}.sharia-admin-search{display:grid}.sharia-admin-search input,.sharia-admin-search button{width:100%;min-width:0}.sharia-admin-table-shell{border-radius:var(--radius-control)}.sharia-admin-review-panel{padding:15px}}
        @media(prefers-reduced-motion:reduce){tbody tr{transition:none}}
      `}</style>
    </main>
  );
}
