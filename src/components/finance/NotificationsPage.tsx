'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Home, Trash2, Eye, Share2, FileDown, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sidebar } from '@/components/Sidebar';
import {
  NotificationService,
  type NotificationRecord,
  type NotificationType,
  type NotificationSeverity,
} from '@/lib/notifications';

type TKey = Parameters<ReturnType<typeof useLanguage>['t']>[0];

const severityColor: Record<NotificationSeverity, string> = {
  info: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
};

const TYPE_OPTIONS: NotificationType[] = ['analysis', 'alert', 'system', 'goal', 'investment', 'expense'];
const SEVERITY_OPTIONS: NotificationSeverity[] = ['info', 'success', 'warning', 'critical'];

const typeKey: Record<NotificationType, TKey> = {
  analysis: 'notif_type_analysis',
  alert: 'notif_type_alert',
  system: 'notif_type_system',
  goal: 'notif_type_goal',
  investment: 'notif_type_investment',
  expense: 'notif_type_expense',
};
const sevKey: Record<NotificationSeverity, TKey> = {
  info: 'sev_info',
  success: 'sev_success',
  warning: 'sev_warning',
  critical: 'sev_critical',
};

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { dir, lang, t } = useLanguage();
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';

  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [sevFilter, setSevFilter] = useState<NotificationSeverity | 'all'>('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<NotificationRecord | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (!user) return;
      setDataLoading(true);
      setError('');
      try {
        const res = await NotificationService.list(user.id, {
          type: typeFilter === 'all' ? undefined : typeFilter,
          severity: sevFilter === 'all' ? undefined : sevFilter,
          limit: PAGE_SIZE,
          cursor: reset ? undefined : cursor ?? undefined,
        });
        setItems(prev => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
        setHasMore(Boolean(res.nextCursor));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'));
      } finally {
        setDataLoading(false);
      }
    },
    [user, typeFilter, sevFilter, cursor, t],
  );

  // Reload from scratch when filters or user change
  useEffect(() => {
    if (!user) return;
    load(true);
    const unsubscribe = NotificationService.subscribe(user.id, () => load(true));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, typeFilter, sevFilter]);

  const groups = useMemo(() => {
    const grouped: Record<string, NotificationRecord[]> = {};
    for (const n of items) {
      const label = groupLabel(n.created_at, locale, t);
      (grouped[label] ??= []).push(n);
    }
    return grouped;
  }, [items, locale, t]);

  const unread = items.filter(n => !n.read).length;

  async function markAsRead(id: string) {
    try {
      await NotificationService.markAsRead(id);
      setItems(cur => cur.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function markAll() {
    if (!user) return;
    try {
      await NotificationService.markAllAsRead(user.id);
      setItems(cur => cur.map(n => ({ ...n, read: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function remove(id: string) {
    try {
      await NotificationService.delete(id);
      setItems(cur => cur.filter(n => n.id !== id));
      setSelected(cur => (cur?.id === id ? null : cur));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  function openDetail(n: NotificationRecord) {
    setSelected(n);
    if (!n.read) markAsRead(n.id);
  }

  async function share(n: NotificationRecord) {
    const text = `${n.title}\n\n${n.body ?? n.summary ?? ''}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: n.title, text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled share — ignore */
    }
  }

  function exportPdf(n: NotificationRecord) {
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) return;
    const safe = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    win.document.write(`<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
      <title>${safe(n.title)}</title>
      <style>body{font-family:Tajawal,Arial,sans-serif;color:#111;padding:40px;line-height:1.8}
      h1{color:#9A6C3C}small{color:#9A6C3C}hr{border:0;border-top:1px solid #e5d9c2;margin:18px 0}</style>
      </head><body>
      <h1>${safe(n.title)}</h1>
      <small>${n.created_at ? new Date(n.created_at).toLocaleString(locale) : ''}</small><hr/>
      <div>${safe(n.body ?? n.summary ?? '').replace(/\n/g, '<br/>')}</div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  if (loading) {
    return <div className="notif-shell" dir={dir}><div className="spinner" /><style>{styles}</style></div>;
  }

  return (
    <main className="notif-shell" dir={dir}>
      <Sidebar />
      <section className="notif-page">
        <header className="notif-header">
          <button className="back-btn" onClick={() => router.push('/')}>
            <Home size={17} />
            {t('nav_home')}
          </button>
          <div className="title">
            <span><Bell size={22} /></span>
            <div>
              <p>THE SFM</p>
              <h1>{t('nav_notif')}</h1>
            </div>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow">{t('notif_center')}</span>
            <h2>{t('notif_subtitle')}</h2>
          </div>
          <div className="counter">
            <strong>{unread.toLocaleString(locale)}</strong>
            <span>{t('notif_unread')}</span>
          </div>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="list">
          <div className="list-head">
            <div className="filters">
              <label>
                <span>{t('notif_filter_type')}</span>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as NotificationType | 'all')}>
                  <option value="all">{t('notif_all')}</option>
                  {TYPE_OPTIONS.map(o => <option key={o} value={o}>{t(typeKey[o])}</option>)}
                </select>
              </label>
              <label>
                <span>{t('notif_filter_sev')}</span>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value as NotificationSeverity | 'all')}>
                  <option value="all">{t('notif_all')}</option>
                  {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{t(sevKey[o])}</option>)}
                </select>
              </label>
            </div>
            <button className="mark-all" onClick={markAll} disabled={unread === 0}>
              <CheckCheck size={16} />{t('notif_mark_all')}
            </button>
          </div>

          {!dataLoading && items.length === 0 ? (
            <div className="empty">
              <Bell size={42} />
              <strong>{t('notif_empty')}</strong>
            </div>
          ) : (
            Object.entries(groups).map(([label, group]) => (
              <div key={label} className="group">
                <h4>{label}</h4>
                {group.map(n => (
                  <article key={n.id} className={n.read ? 'notice' : 'notice unread'}>
                    <div className="dot" style={{ background: severityColor[n.severity] ?? '#D8AE63' }} />
                    <div className="notice-body">
                      <div className="notice-top">
                        <strong>{n.title}</strong>
                        <span>{n.created_at ? new Date(n.created_at).toLocaleString(locale) : ''}</span>
                      </div>
                      <div className="tags">
                        <span className="tag">{t(typeKey[n.type] ?? 'notif_type_system')}</span>
                        <span className="tag" style={{ color: severityColor[n.severity], borderColor: `${severityColor[n.severity]}55` }}>
                          {t(sevKey[n.severity] ?? 'sev_info')}
                        </span>
                      </div>
                      {(n.summary || n.body) && <p>{n.summary ?? n.body}</p>}
                    </div>
                    <div className="notice-actions">
                      {n.type === 'analysis' && (
                        <button onClick={() => openDetail(n)} aria-label={t('notif_view')} title={t('notif_view')}>
                          <Eye size={16} />
                        </button>
                      )}
                      {!n.read && (
                        <button onClick={() => markAsRead(n.id)} aria-label={t('notif_mark_read')} title={t('notif_mark_read')}>
                          <CheckCheck size={16} />
                        </button>
                      )}
                      <button onClick={() => remove(n.id)} aria-label={t('delete')} title={t('delete')}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))
          )}

          {dataLoading && <span className="loading">{t('loading')}</span>}
          {hasMore && !dataLoading && (
            <button className="load-more" onClick={() => load(false)}>{t('notif_load_more')}</button>
          )}
        </section>
      </section>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" dir={dir} onClick={e => e.stopPropagation()}>
            <header className="modal-head">
              <div className="dot" style={{ background: severityColor[selected.severity] }} />
              <h3>{selected.title}</h3>
              <button onClick={() => setSelected(null)} aria-label={t('close')}><X size={18} /></button>
            </header>
            <div className="modal-meta">
              <span className="tag">{t(typeKey[selected.type] ?? 'notif_type_system')}</span>
              <span className="tag" style={{ color: severityColor[selected.severity], borderColor: `${severityColor[selected.severity]}55` }}>
                {t(sevKey[selected.severity] ?? 'sev_info')}
              </span>
              <span className="when">{selected.created_at ? new Date(selected.created_at).toLocaleString(locale) : ''}</span>
            </div>
            {selected.body && <div className="modal-body">{selected.body}</div>}
            <AnalysisData data={selected.data} locale={locale} t={t} />
            <footer className="modal-actions">
              <button onClick={() => share(selected)}><Share2 size={16} />{t('notif_share')}</button>
              <button onClick={() => exportPdf(selected)}><FileDown size={16} />{t('notif_export_pdf')}</button>
              <button className="danger" onClick={() => remove(selected.id)}><Trash2 size={16} />{t('delete')}</button>
            </footer>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  );
}

function AnalysisData({
  data,
  locale,
  t,
}: {
  data: Record<string, unknown> | null;
  locale: string;
  t: (key: TKey) => string;
}) {
  if (!data) return null;
  const metrics = Array.isArray((data as { metrics?: unknown }).metrics)
    ? ((data as { metrics: Array<{ label?: string; value?: unknown }> }).metrics)
    : [];
  const recs = Array.isArray((data as { recommendations?: unknown }).recommendations)
    ? ((data as { recommendations: string[] }).recommendations)
    : [];
  if (metrics.length === 0 && recs.length === 0) return null;
  return (
    <div className="analysis-data">
      {metrics.length > 0 && (
        <>
          <h4>{t('notif_metrics')}</h4>
          <div className="metrics">
            {metrics.map((m, i) => (
              <div key={i} className="metric">
                <span>{m.label ?? ''}</span>
                <strong>{typeof m.value === 'number' ? m.value.toLocaleString(locale) : String(m.value ?? '')}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {recs.length > 0 && (
        <>
          <h4>{t('notif_recommend')}</h4>
          <ul className="recs">
            {recs.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function groupLabel(date: string | null, locale: string, t: (key: TKey) => string) {
  if (!date) return t('notif_no_date');
  const now = new Date();
  const value = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return t('notif_today');
  if (diff === 1) return t('notif_yesterday');
  if (diff <= 7) return t('notif_this_week');
  return value.toLocaleDateString(locale);
}

const styles = `
  .notif-shell{min-height:100vh;background:#F7F3EA;color:#111;font-family:Tajawal,Arial,sans-serif}
  .spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.2);border-top-color:#D8AE63;animation:spin 1s linear infinite;margin:20vh auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .notif-page{max-width:1180px;margin-inline-start:230px;padding:24px 20px 60px}
  .notif-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:22px;flex-wrap:wrap}
  .back-btn,.notice-actions button,.mark-all{border:1.5px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;border-radius:13px;height:40px;padding:0 14px;display:inline-flex;align-items:center;gap:8px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
  .mark-all:disabled{opacity:.45;cursor:not-allowed}
  .title{display:flex;align-items:center;gap:12px;flex:1;min-width:220px}.title>span{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);display:grid;place-items:center;color:#111}.title p{margin:0 0 3px;font-size:11px;color:#9A6C3C;font-weight:800}.title h1{margin:0;font-size:26px;font-weight:900}
  .hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;background:linear-gradient(135deg,#111,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:28px;margin-bottom:18px;box-shadow:0 18px 45px rgba(45,26,10,.16)}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(216,174,99,.15);color:#D8AE63;font-size:11px;font-weight:900;margin-bottom:12px}.hero h2{margin:0;font-size:31px}.counter{min-width:118px;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px}.counter strong{display:block;font-size:34px;color:#D8AE63}.counter span{font-size:12px;color:rgba(255,255,255,.62)}
  .list{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 4px 22px rgba(90,67,51,.06);padding:18px}
  .list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
  .filters{display:flex;gap:12px;flex-wrap:wrap}.filters label{display:flex;flex-direction:column;gap:4px;font:900 11px Tajawal,Arial,sans-serif;color:#9A6C3C}
  .filters select{height:38px;border:1.5px solid rgba(216,174,99,.22);border-radius:12px;background:#FFFDFC;color:#111;padding:0 10px;font:700 13px Tajawal,Arial,sans-serif;cursor:pointer}
  .loading{color:#9A6C3C;font-size:12px;font-weight:900;display:block;margin-top:12px}
  .load-more{margin:14px auto 0;display:block;border:1.5px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;border-radius:13px;height:40px;padding:0 20px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}
  .group h4{margin:18px 0 8px;color:#9A6C3C;font-size:13px}
  .notice{position:relative;display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(216,174,99,.11);border-radius:17px;padding:15px;margin-top:10px;background:#FFFDFC}.notice.unread{background:rgba(216,174,99,.07);border-color:rgba(216,174,99,.24)}.dot{width:9px;height:9px;border-radius:50%;margin-top:7px;flex-shrink:0}.notice-body{flex:1;min-width:0}.notice-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.notice strong{font-size:14px}.notice-top span{font-size:11px;color:#9A6C3C}.notice p{margin:7px 0 0;color:#6F6258;line-height:1.7;font-size:13px}
  .tags{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.tag{font:900 10px Tajawal,Arial,sans-serif;color:#9A6C3C;border:1px solid rgba(216,174,99,.28);border-radius:999px;padding:2px 9px}
  .notice-actions{display:flex;gap:6px}.notice-actions button{width:36px;height:36px;padding:0;justify-content:center;color:#9A6C3C}.notice-actions button:last-child{color:#EF4444}
  .empty{text-align:center;padding:54px 20px;color:#9A6C3C}.empty svg{color:#D8AE63;margin-bottom:12px}.empty strong{display:block;color:#111;font-size:18px}
  .error{padding:12px 14px;border-radius:14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;margin-bottom:14px;font-weight:800}
  .modal-overlay{position:fixed;inset:0;z-index:9999;background:rgba(17,12,8,.55);display:flex;align-items:center;justify-content:center;padding:18px}
  .modal{width:min(620px,100%);max-height:88vh;overflow:auto;background:#FFFDFC;border-radius:22px;border:1px solid rgba(216,174,99,.2);box-shadow:0 24px 70px rgba(43,26,13,.3);padding:22px}
  .modal-head{display:flex;align-items:center;gap:10px}.modal-head h3{flex:1;margin:0;font-size:19px}.modal-head button{border:none;background:rgba(216,174,99,.12);width:34px;height:34px;border-radius:10px;color:#5B4332;cursor:pointer;display:grid;place-items:center}
  .modal-meta{display:flex;align-items:center;gap:8px;margin:12px 0;flex-wrap:wrap}.modal-meta .when{font-size:11px;color:#9A6C3C;margin-inline-start:auto}
  .modal-body{white-space:pre-wrap;line-height:1.85;color:#5B4332;font-size:14px;border-top:1px solid rgba(216,174,99,.14);padding-top:14px}
  .analysis-data h4{margin:16px 0 8px;color:#9A6C3C;font-size:13px}.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{background:#F7F3EA;border:1px solid rgba(216,174,99,.13);border-radius:14px;padding:12px}.metric span{display:block;font-size:11px;color:#9A6C3C;font-weight:800}.metric strong{font-size:16px;font-family:'IBM Plex Sans Arabic',sans-serif}
  .recs{margin:0;padding-inline-start:18px;color:#5B4332;line-height:1.9;font-size:13.5px}
  .modal-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}.modal-actions button{border:1.5px solid rgba(216,174,99,.24);background:#FFFDFC;color:#5B4332;border-radius:13px;height:42px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}.modal-actions .danger{color:#EF4444;border-color:rgba(239,68,68,.3);margin-inline-start:auto}
  @media(max-width:1024px){.notif-page{margin-inline-start:0}}
  @media(max-width:820px){.hero{display:block}.counter{margin-top:18px}.list-head{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:1fr}}
  @media(max-width:560px){.hero h2{font-size:25px}.notice{flex-wrap:wrap}.notice-actions{width:100%;justify-content:flex-end}}
`;
