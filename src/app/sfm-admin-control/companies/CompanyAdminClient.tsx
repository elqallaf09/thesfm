'use client';

import { useState, useTransition, useMemo } from 'react';

type CompanyStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_changes' | 'inactive';

interface Company {
  id: string;
  company_name: string;
  category: string | null;
  country: string | null;
  city: string | null;
  status: CompanyStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  email: string | null;
  website_url: string | null;
  short_description: string | null;
  logo_url: string | null;
}

interface Props {
  companies: Company[];
  adminEmail: string;
}

type Tab = 'pending_review' | 'needs_changes' | 'approved' | 'rejected' | 'inactive';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending_review', label: 'قيد المراجعة' },
  { id: 'needs_changes', label: 'تحتاج تعديل' },
  { id: 'approved', label: 'مقبولة' },
  { id: 'rejected', label: 'مرفوضة' },
  { id: 'inactive', label: 'غير نشطة' },
];

const STATUS_COLORS: Record<CompanyStatus, string> = {
  pending_review: '#F59E0B',
  needs_changes:  '#3B82F6',
  approved:       '#10B981',
  rejected:       '#EF4444',
  inactive:       '#6B7280',
};

const STATUS_LABELS: Record<CompanyStatus, string> = {
  pending_review: 'قيد المراجعة',
  needs_changes:  'تحتاج تعديل',
  approved:       'مقبولة',
  rejected:       'مرفوضة',
  inactive:       'غير نشطة',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export default function CompanyAdminClient({ companies: initial, adminEmail }: Props) {
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [activeTab, setActiveTab] = useState<Tab>('pending_review');
  const [selected, setSelected] = useState<Company | null>(null);
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const tabCounts = useMemo(() => {
    const map: Partial<Record<Tab, number>> = {};
    for (const c of companies) {
      const k = c.status as Tab;
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [companies]);

  const filtered = companies.filter(c => c.status === activeTab);

  function openPanel(c: Company) {
    setSelected(c);
    setNote(c.admin_notes ?? '');
    setFeedback(null);
  }

  function closePanel() {
    setSelected(null);
    setNote('');
    setFeedback(null);
  }

  async function submitAction(newStatus: CompanyStatus) {
    if (!selected) return;
    if ((newStatus === 'rejected' || newStatus === 'needs_changes') && !note.trim()) {
      setFeedback({ type: 'err', msg: 'يجب إضافة ملاحظة عند الرفض أو طلب التعديل.' });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/companies/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selected.id,
            status: newStatus,
            adminNotes: note.trim() || null,
            adminEmail,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'خطأ في الخادم');
        setCompanies(prev =>
          prev.map(c =>
            c.id === selected.id
              ? { ...c, status: newStatus, admin_notes: note.trim() || null, reviewed_by: adminEmail, reviewed_at: new Date().toISOString() }
              : c
          )
        );
        setFeedback({ type: 'ok', msg: `تم تحديث الحالة إلى: ${STATUS_LABELS[newStatus]}` });
        setTimeout(closePanel, 1200);
      } catch (e: unknown) {
        setFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'حدث خطأ' });
      }
    });
  }

  return (
    <>
      <style>{`
        .ca-page { min-height: 100vh; background: var(--sfm-background); padding: 2rem 1.5rem; direction: rtl; font-family: inherit; }
        .ca-header { margin-bottom: 2rem; }
        .ca-header h1 { font-size: 1.6rem; font-weight: 700; color: var(--sfm-foreground); margin: 0 0 .3rem; }
        .ca-header p  { color: #64748B; font-size: .9rem; margin: 0; }
        .dark .ca-header p { color: #94A3B8; }

        /* Tabs */
        .ca-tabs { display: flex; gap: .5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .ca-tab { padding: .45rem 1rem; border-radius: 999px; border: 1.5px solid transparent; font-size: .85rem; font-weight: 600; cursor: pointer; transition: all .15s; background: var(--sfm-card); color: var(--sfm-foreground); }
        .ca-tab:hover { border-color: var(--sfm-primary); }
        .ca-tab.active { background: var(--sfm-primary); color: #fff; border-color: var(--sfm-primary); }
        .ca-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.2rem; height: 1.2rem; border-radius: 999px; font-size: .72rem; font-weight: 700; padding: 0 .35rem; background: rgba(255,255,255,.25); margin-right: .35rem; }
        .ca-tab:not(.active) .ca-badge { background: var(--sfm-primary); color: #fff; }

        /* Table */
        .ca-card { background: var(--sfm-card); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,.06); }
        .dark .ca-card { box-shadow: 0 4px 18px rgba(0,0,0,.22); }
        .ca-table { width: 100%; border-collapse: collapse; font-size: .87rem; }
        .ca-table th { padding: .75rem 1rem; text-align: right; background: rgba(11,118,224,.06); color: #64748B; font-weight: 600; font-size: .78rem; border-bottom: 1px solid rgba(0,0,0,.06); }
        .dark .ca-table th { background: rgba(11,118,224,.08); color: #94A3B8; border-bottom-color: rgba(255,255,255,.06); }
        .ca-table td { padding: .75rem 1rem; border-bottom: 1px solid rgba(0,0,0,.05); color: var(--sfm-foreground); vertical-align: middle; }
        .dark .ca-table td { border-bottom-color: rgba(255,255,255,.05); }
        .ca-table tr:last-child td { border-bottom: none; }
        .ca-table tr:hover td { background: rgba(11,118,224,.04); }
        .dark .ca-table tr:hover td { background: rgba(11,118,224,.08); }
        .ca-logo { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: #e2e8f0; }
        .dark .ca-logo { background: #1e3a5f; }
        .ca-logo-placeholder { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg,#0b76e0,#18d4d4); display: flex; align-items: center; justify-content: center; color: #fff; font-size: .95rem; font-weight: 700; }
        .ca-status-badge { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem .7rem; border-radius: 999px; font-size: .78rem; font-weight: 600; }
        .ca-review-btn { padding: .35rem .9rem; border-radius: 8px; border: 1.5px solid var(--sfm-primary); color: var(--sfm-primary); background: transparent; font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .15s; }
        .ca-review-btn:hover { background: var(--sfm-primary); color: #fff; }
        .ca-empty { text-align: center; padding: 3rem 1rem; color: #94A3B8; font-size: .95rem; }

        /* Panel overlay */
        .ca-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .ca-panel { background: var(--sfm-card); border-radius: 18px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.25); direction: rtl; }
        .dark .ca-panel { box-shadow: 0 20px 60px rgba(0,0,0,.5); }
        .ca-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,.07); }
        .dark .ca-panel-header { border-bottom-color: rgba(255,255,255,.07); }
        .ca-panel-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--sfm-foreground); }
        .ca-close { background: none; border: none; font-size: 1.4rem; color: #94A3B8; cursor: pointer; line-height: 1; padding: 0; }
        .ca-close:hover { color: var(--sfm-foreground); }
        .ca-panel-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .ca-info-row { display: flex; gap: .5rem; font-size: .87rem; color: var(--sfm-foreground); }
        .ca-info-row strong { color: #64748B; min-width: 80px; }
        .dark .ca-info-row strong { color: #94A3B8; }
        .ca-desc { font-size: .85rem; color: #64748B; line-height: 1.6; background: rgba(11,118,224,.04); padding: .75rem 1rem; border-radius: 10px; }
        .dark .ca-desc { color: #94A3B8; background: rgba(11,118,224,.08); }
        .ca-note-label { font-size: .85rem; font-weight: 600; color: var(--sfm-foreground); margin-bottom: .4rem; }
        .ca-note-textarea { width: 100%; border-radius: 10px; border: 1.5px solid rgba(0,0,0,.12); padding: .75rem 1rem; font-size: .87rem; font-family: inherit; resize: vertical; min-height: 80px; background: var(--sfm-input-bg, #f8fbff); color: var(--sfm-foreground); box-sizing: border-box; }
        .dark .ca-note-textarea { border-color: rgba(255,255,255,.12); }
        .ca-note-textarea:focus { outline: none; border-color: var(--sfm-primary); }
        .ca-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
        .ca-action-btn { flex: 1; min-width: 100px; padding: .6rem 1rem; border-radius: 10px; border: none; font-size: .87rem; font-weight: 700; cursor: pointer; transition: all .15s; opacity: 1; }
        .ca-action-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ca-btn-approve { background: #10B981; color: #fff; }
        .ca-btn-approve:hover:not(:disabled) { background: #059669; }
        .ca-btn-changes { background: #3B82F6; color: #fff; }
        .ca-btn-changes:hover:not(:disabled) { background: #2563EB; }
        .ca-btn-reject { background: #EF4444; color: #fff; }
        .ca-btn-reject:hover:not(:disabled) { background: #DC2626; }
        .ca-feedback { padding: .65rem 1rem; border-radius: 10px; font-size: .85rem; font-weight: 600; }
        .ca-feedback.ok  { background: #D1FAE5; color: #065F46; }
        .ca-feedback.err { background: #FEE2E2; color: #991B1B; }
        .dark .ca-feedback.ok  { background: rgba(16,185,129,.15); color: #6EE7B7; }
        .dark .ca-feedback.err { background: rgba(239,68,68,.15);  color: #FCA5A5; }

        @media (max-width: 700px) {
          .ca-page { padding: 1rem; }
          .ca-table th:nth-child(3),
          .ca-table td:nth-child(3),
          .ca-table th:nth-child(4),
          .ca-table td:nth-child(4) { display: none; }
        }
      `}</style>

      <div className="ca-page">
        <div className="ca-header">
          <h1>مراجعة طلبات الشركات</h1>
          <p>مراجعة وإدارة طلبات إدراج الشركات في الدليل</p>
        </div>

        {/* Tabs */}
        <div className="ca-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ca-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {tabCounts[t.id] ? <span className="ca-badge">{tabCounts[t.id]}</span> : null}
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="ca-card">
          {filtered.length === 0 ? (
            <div className="ca-empty">لا توجد شركات في هذه الفئة</div>
          ) : (
            <table className="ca-table">
              <thead>
                <tr>
                  <th>الشركة</th>
                  <th>الفئة</th>
                  <th>الموقع</th>
                  <th>تاريخ التقديم</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        {c.logo_url
                          // Company logos come from arbitrary submitted URLs, so native img avoids blocking unconfigured hosts.
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={c.logo_url} alt={c.company_name ? `${c.company_name} logo` : ''} className="ca-logo" loading="lazy" decoding="async" />
                          : <div className="ca-logo-placeholder">{c.company_name?.[0] ?? '?'}</div>
                        }
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.company_name}</div>
                          {c.email && <div style={{ fontSize: '.75rem', color: '#94A3B8' }}>{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.category ?? '—'}</td>
                    <td>{[c.city, c.country].filter(Boolean).join('، ') || '—'}</td>
                    <td style={{ fontSize: '.8rem', color: '#94A3B8' }}>{fmtDate(c.created_at)}</td>
                    <td>
                      <span
                        className="ca-status-badge"
                        style={{
                          background: STATUS_COLORS[c.status] + '18',
                          color: STATUS_COLORS[c.status],
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[c.status], display: 'inline-block' }} />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>
                      <button className="ca-review-btn" onClick={() => openPanel(c)}>
                        مراجعة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Panel */}
      {selected && (
        <div className="ca-overlay" onClick={e => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2>{selected.company_name}</h2>
              <button className="ca-close" onClick={closePanel}>×</button>
            </div>
            <div className="ca-panel-body">
              <div className="ca-info-row"><strong>الفئة:</strong> {selected.category ?? '—'}</div>
              <div className="ca-info-row"><strong>الدولة:</strong> {selected.country ?? '—'}</div>
              <div className="ca-info-row"><strong>المدينة:</strong> {selected.city ?? '—'}</div>
              {selected.email && <div className="ca-info-row"><strong>البريد:</strong> {selected.email}</div>}
              {selected.website_url && (
                <div className="ca-info-row">
                  <strong>الموقع:</strong>
                  <a href={selected.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sfm-primary)' }}>
                    {selected.website_url}
                  </a>
                </div>
              )}
              {selected.short_description && (
                <div className="ca-desc">{selected.short_description}</div>
              )}
              <div className="ca-info-row">
                <strong>الحالة:</strong>
                <span
                  className="ca-status-badge"
                  style={{ background: STATUS_COLORS[selected.status] + '18', color: STATUS_COLORS[selected.status] }}
                >
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              {selected.reviewed_by && (
                <div className="ca-info-row"><strong>راجعه:</strong> {selected.reviewed_by}</div>
              )}
              {selected.reviewed_at && (
                <div className="ca-info-row"><strong>وقت المراجعة:</strong> {fmtDate(selected.reviewed_at)}</div>
              )}

              {/* Notes */}
              <div>
                <div className="ca-note-label">ملاحظات الأدمن <span style={{ color: '#EF4444' }}>*</span> (مطلوبة للرفض أو طلب التعديل)</div>
                <textarea
                  className="ca-note-textarea"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="أضف ملاحظة للمراجع أو صاحب الشركة..."
                  rows={3}
                />
              </div>

              {feedback && (
                <div className={`ca-feedback ${feedback.type}`}>{feedback.msg}</div>
              )}

              <div className="ca-actions">
                <button
                  className="ca-action-btn ca-btn-approve"
                  disabled={isPending}
                  onClick={() => submitAction('approved')}
                >
                  ✓ قبول
                </button>
                <button
                  className="ca-action-btn ca-btn-changes"
                  disabled={isPending}
                  onClick={() => submitAction('needs_changes')}
                >
                  ✎ طلب تعديل
                </button>
                <button
                  className="ca-action-btn ca-btn-reject"
                  disabled={isPending}
                  onClick={() => submitAction('rejected')}
                >
                  ✕ رفض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
