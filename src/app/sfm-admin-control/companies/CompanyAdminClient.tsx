'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';

type CompanyStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_changes' | 'inactive';
type Tab = CompanyStatus;

interface Company {
  id: string;
  company_name: string;
  category: string | null;
  country: string | null;
  city: string | null;
  status: CompanyStatus;
  update_status: 'none' | 'pending_update' | 'deletion_requested' | null;
  deletion_requested: boolean | null;
  deletion_requested_at: string | null;
  last_owner_update_at: string | null;
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

const TABS: Tab[] = ['pending_review', 'needs_changes', 'approved', 'rejected', 'inactive'];

const STATUS_COLORS: Record<CompanyStatus, string> = {
  pending_review: '#F59E0B',
  needs_changes: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  inactive: '#6B7280',
};

const COPY = {
  ar: {
    adminFallback: 'أدمن THE SFM',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    title: 'مراجعة طلبات الشركات',
    subtitle: 'مراجعة وإدارة طلبات إدراج الشركات في الدليل',
    empty: 'لا توجد شركات في هذه الفئة',
    company: 'الشركة',
    category: 'الفئة',
    location: 'الموقع',
    submittedAt: 'تاريخ التقديم',
    status: 'الحالة',
    review: 'مراجعة',
    country: 'الدولة',
    city: 'المدينة',
    email: 'البريد',
    website: 'الموقع',
    reviewedBy: 'راجعه',
    reviewedAt: 'وقت المراجعة',
    notesLabel: 'ملاحظات الأدمن',
    notesHint: 'مطلوبة للرفض أو طلب التعديل',
    notesPlaceholder: 'أضف ملاحظة للمراجع أو صاحب الشركة...',
    noteRequired: 'يجب إضافة ملاحظة عند الرفض أو طلب التعديل.',
    serverError: 'خطأ في الخادم',
    unknownError: 'حدث خطأ',
    updated: 'تم تحديث الحالة إلى:',
    approve: 'قبول',
    requestChanges: 'طلب تعديل',
    reject: 'رفض',
    dash: 'غير محدد',
    statuses: {
      pending_review: 'قيد المراجعة',
      needs_changes: 'تحتاج تعديل',
      approved: 'مقبولة',
      rejected: 'مرفوضة',
      inactive: 'غير نشطة',
    },
    pendingUpdate: 'تعديل بانتظار المراجعة',
    deletionRequest: 'طلب حذف / إلغاء نشر',
    acceptUpdate: 'قبول التعديلات',
    acceptDeletion: 'قبول الحذف',
  },
  en: {
    adminFallback: 'THE SFM Admin',
    signIn: 'Sign in',
    signOut: 'Sign out',
    title: 'Company Requests Review',
    subtitle: 'Review and manage company listing requests in the directory',
    empty: 'No companies in this category',
    company: 'Company',
    category: 'Category',
    location: 'Location',
    submittedAt: 'Submitted',
    status: 'Status',
    review: 'Review',
    country: 'Country',
    city: 'City',
    email: 'Email',
    website: 'Website',
    reviewedBy: 'Reviewed by',
    reviewedAt: 'Reviewed at',
    notesLabel: 'Admin notes',
    notesHint: 'Required for rejection or change requests',
    notesPlaceholder: 'Add a note for the reviewer or company owner...',
    noteRequired: 'Please add a note when rejecting or requesting changes.',
    serverError: 'Server error',
    unknownError: 'Something went wrong',
    updated: 'Status updated to:',
    approve: 'Approve',
    requestChanges: 'Request changes',
    reject: 'Reject',
    dash: 'Not set',
    statuses: {
      pending_review: 'Pending review',
      needs_changes: 'Needs changes',
      approved: 'Approved',
      rejected: 'Rejected',
      inactive: 'Inactive',
    },
    pendingUpdate: 'Pending update',
    deletionRequest: 'Deletion request',
    acceptUpdate: 'Approve update',
    acceptDeletion: 'Approve deletion',
  },
  fr: {
    adminFallback: 'Admin THE SFM',
    signIn: 'Connexion',
    signOut: 'Déconnexion',
    title: 'Révision des demandes de sociétés',
    subtitle: 'Réviser et gérer les demandes d’ajout de sociétés dans l’annuaire',
    empty: 'Aucune société dans cette catégorie',
    company: 'Société',
    category: 'Catégorie',
    location: 'Emplacement',
    submittedAt: 'Soumise le',
    status: 'Statut',
    review: 'Réviser',
    country: 'Pays',
    city: 'Ville',
    email: 'E-mail',
    website: 'Site web',
    reviewedBy: 'Révisé par',
    reviewedAt: 'Révisé le',
    notesLabel: 'Notes admin',
    notesHint: 'Requises pour refuser ou demander des modifications',
    notesPlaceholder: 'Ajoutez une note pour le réviseur ou le propriétaire...',
    noteRequired: 'Ajoutez une note pour refuser ou demander des modifications.',
    serverError: 'Erreur serveur',
    unknownError: 'Une erreur est survenue',
    updated: 'Statut mis à jour :',
    approve: 'Approuver',
    requestChanges: 'Demander modifications',
    reject: 'Refuser',
    dash: 'Non défini',
    statuses: {
      pending_review: 'En révision',
      needs_changes: 'Modifications requises',
      approved: 'Approuvée',
      rejected: 'Refusée',
      inactive: 'Inactive',
    },
    pendingUpdate: 'Modification en attente',
    deletionRequest: 'Demande de suppression',
    acceptUpdate: 'Approuver la modification',
    acceptDeletion: 'Approuver la suppression',
  },
} satisfies Record<Lang, Record<string, unknown> & { statuses: Record<CompanyStatus, string> }>;

function formatDate(iso: string | null, lang: Lang) {
  if (!iso) return COPY[lang].dash as string;
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function CompanyAdminLogo({ company }: { company: Company }) {
  const [failed, setFailed] = useState(false);
  if (company.logo_url && !failed) {
    return (
      <Image
        src={company.logo_url}
        alt={company.company_name ? `${company.company_name} logo` : 'Company logo'}
        className="ca-logo"
        width={36}
        height={36}
        unoptimized
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <div className="ca-logo-placeholder">{company.company_name?.[0] ?? '?'}</div>;
}

export default function CompanyAdminClient({ companies: initial, adminEmail }: Props) {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const text = COPY[lang] ?? COPY.ar;
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [activeTab, setActiveTab] = useState<Tab>('pending_review');
  const [selected, setSelected] = useState<Company | null>(null);
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const tabCounts = useMemo(() => {
    const map: Partial<Record<Tab, number>> = {};
    for (const company of companies) {
      map[company.status] = (map[company.status] ?? 0) + 1;
    }
    return map;
  }, [companies]);

  const filtered = companies.filter(company => company.status === activeTab);

  async function handleSignOut() {
    await signOut();
    router.replace('/login?next=/sfm-admin-control/companies');
  }

  function openPanel(company: Company) {
    setSelected(company);
    setNote(company.admin_notes ?? '');
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
      setFeedback({ type: 'err', msg: text.noteRequired as string });
      return;
    }
    const visibleReviewNote = newStatus === 'rejected' || newStatus === 'needs_changes'
      ? note.trim() || null
      : null;

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/companies/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selected.id,
            status: newStatus,
            adminNotes: visibleReviewNote,
            adminEmail,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? text.serverError);
        setCompanies(previous =>
          previous.map(company =>
            company.id === selected.id
              ? {
                  ...company,
                  status: newStatus,
                  admin_notes: visibleReviewNote,
                  reviewed_by: adminEmail,
                  reviewed_at: new Date().toISOString(),
                  update_status: 'none',
                  deletion_requested: newStatus === 'approved' || newStatus === 'inactive' ? false : company.deletion_requested,
                  deletion_requested_at: newStatus === 'approved' || newStatus === 'inactive' ? null : company.deletion_requested_at,
                }
              : company,
          ),
        );
        setFeedback({ type: 'ok', msg: `${text.updated} ${text.statuses[newStatus]}` });
        setTimeout(closePanel, 1200);
      } catch (error: unknown) {
        setFeedback({ type: 'err', msg: error instanceof Error ? error.message : text.unknownError as string });
      }
    });
  }

  return (
    <>
      <style>{`
        .ca-page{min-height:100vh;background:var(--sfm-background);padding:2rem 1.5rem;direction:${dir};font-family:inherit;color:var(--sfm-foreground)}
        .ca-topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.35rem;flex-wrap:wrap}
        .ca-admin-chip{min-height:42px;border-radius:999px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.12);color:var(--sfm-foreground);padding:0 .95rem;display:inline-flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:900}
        .ca-toolbar{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}
        .ca-toolbar .sfm-language-trigger{background:#fff;color:#061b33;border-color:rgba(29,140,255,.28);box-shadow:0 10px 26px rgba(3,18,37,.12)}
        .ca-toolbar .sfm-language-trigger:hover,.ca-toolbar .sfm-language-trigger:focus-visible{border-color:rgba(47,214,192,.60);color:#075985;box-shadow:0 0 0 4px rgba(47,214,192,.14),0 12px 28px rgba(3,18,37,.14)}
        .ca-auth-action{min-height:44px;border:1px solid rgba(47,214,192,.22);border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;padding:0 .95rem;display:inline-flex;align-items:center;justify-content:center;gap:.45rem;font:900 .84rem Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer;box-shadow:0 12px 28px rgba(29,140,255,.18);transition:transform .18s ease,box-shadow .18s ease}
        .ca-auth-action:hover,.ca-auth-action:focus-visible{transform:translateY(-1px);outline:none;box-shadow:0 14px 34px rgba(29,140,255,.26)}
        .ca-auth-action.secondary{background:#405766;color:#fff;border-color:rgba(47,214,192,.24);box-shadow:0 12px 24px rgba(15,29,49,.12)}
        .dark .ca-auth-action.secondary,.dark .ca-admin-chip{background:#0f1d31;border-color:#1d3050;color:#e8eef6}
        .dark .ca-toolbar .sfm-language-trigger{background:#0f1d31;border-color:#1d3050;color:#e8eef6;box-shadow:0 10px 24px rgba(0,0,0,.18)}
        .ca-header{margin-bottom:2rem}
        .ca-header h1{font-size:1.6rem;font-weight:800;color:var(--sfm-foreground);margin:0 0 .3rem}
        .ca-header p{color:#64748b;font-size:.9rem;margin:0}.dark .ca-header p{color:#94a3b8}
        .ca-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap}
        .ca-tab{padding:.45rem 1rem;border-radius:999px;border:1.5px solid transparent;font-size:.85rem;font-weight:800;cursor:pointer;transition:all .15s;background:var(--sfm-card);color:var(--sfm-foreground)}
        .ca-tab:hover{border-color:var(--sfm-primary)}.ca-tab.active{background:var(--sfm-primary);color:#fff;border-color:var(--sfm-primary)}
        .ca-badge{display:inline-flex;align-items:center;justify-content:center;min-width:1.2rem;height:1.2rem;border-radius:999px;font-size:.72rem;font-weight:800;padding:0 .35rem;background:rgba(255,255,255,.25);margin-inline-start:.35rem}
        .ca-tab:not(.active) .ca-badge{background:var(--sfm-primary);color:#fff}
        .ca-card{background:var(--sfm-card);border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06)}.dark .ca-card{box-shadow:0 4px 18px rgba(0,0,0,.22)}
        .ca-table{width:100%;border-collapse:collapse;font-size:.87rem}.ca-table th{padding:.75rem 1rem;text-align:start;background:rgba(11,118,224,.06);color:#64748b;font-weight:800;font-size:.78rem;border-bottom:1px solid rgba(0,0,0,.06)}
        .dark .ca-table th{background:rgba(11,118,224,.08);color:#94a3b8;border-bottom-color:rgba(255,255,255,.06)}
        .ca-table td{padding:.75rem 1rem;border-bottom:1px solid rgba(0,0,0,.05);color:var(--sfm-foreground);vertical-align:middle}.dark .ca-table td{border-bottom-color:rgba(255,255,255,.05)}
        .ca-table tr:last-child td{border-bottom:none}.ca-table tr:hover td{background:rgba(11,118,224,.04)}.dark .ca-table tr:hover td{background:rgba(11,118,224,.08)}
        .ca-logo{width:36px;height:36px;border-radius:8px;object-fit:cover;background:#e2e8f0}.dark .ca-logo{background:#1e3a5f}
        .ca-logo-placeholder{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#0b76e0,#18d4d4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.95rem;font-weight:800}
        .ca-status-badge{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .7rem;border-radius:999px;font-size:.78rem;font-weight:800}
        .ca-request-badge{display:inline-flex;align-items:center;gap:.35rem;margin-top:.35rem;padding:.25rem .6rem;border-radius:999px;background:rgba(245,158,11,.14);color:#b45309;font-size:.72rem;font-weight:900}
        .ca-review-btn{min-height:36px;padding:.35rem .9rem;border-radius:8px;border:1.5px solid var(--sfm-primary);color:var(--sfm-primary);background:transparent;font-size:.82rem;font-weight:800;cursor:pointer;transition:all .15s}.ca-review-btn:hover{background:var(--sfm-primary);color:#fff}
        .ca-empty{text-align:center;padding:3rem 1rem;color:#64748b;font-size:.95rem;font-weight:800}.dark .ca-empty{color:#94a3b8}
        .ca-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem}
        .ca-panel{background:var(--sfm-card);border-radius:18px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);direction:${dir}}
        .ca-panel-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(0,0,0,.07)}.dark .ca-panel-header{border-bottom-color:rgba(255,255,255,.07)}
        .ca-panel-header h2{margin:0;font-size:1.1rem;font-weight:800;color:var(--sfm-foreground)}.ca-close{background:none;border:0;font-size:1.4rem;color:#64748b;cursor:pointer;line-height:1;padding:0}.ca-close:hover{color:var(--sfm-foreground)}
        .ca-panel-body{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}.ca-info-row{display:flex;gap:.5rem;font-size:.87rem;color:var(--sfm-foreground);overflow-wrap:anywhere}.ca-info-row strong{color:#64748b;min-width:92px}.dark .ca-info-row strong{color:#94a3b8}
        .ca-desc{font-size:.85rem;color:#64748b;line-height:1.6;background:rgba(11,118,224,.04);padding:.75rem 1rem;border-radius:10px}.dark .ca-desc{color:#94a3b8;background:rgba(11,118,224,.08)}
        .ca-note-label{font-size:.85rem;font-weight:800;color:var(--sfm-foreground);margin-bottom:.4rem}.ca-note-textarea{width:100%;border-radius:10px;border:1.5px solid rgba(0,0,0,.12);padding:.75rem 1rem;font-size:.87rem;font-family:inherit;resize:vertical;min-height:80px;background:var(--sfm-input-bg,#f8fbff);color:var(--sfm-foreground);box-sizing:border-box}.dark .ca-note-textarea{border-color:rgba(255,255,255,.12)}.ca-note-textarea:focus{outline:none;border-color:var(--sfm-primary)}
        .ca-actions{display:flex;gap:.75rem;flex-wrap:wrap}.ca-action-btn{flex:1;min-width:100px;padding:.6rem 1rem;border-radius:10px;border:0;font-size:.87rem;font-weight:900;cursor:pointer;transition:all .15s}.ca-action-btn:disabled{opacity:.5;cursor:not-allowed}
        .ca-btn-approve{background:#10b981;color:#fff}.ca-btn-changes{background:#3b82f6;color:#fff}.ca-btn-reject{background:#ef4444;color:#fff}
        .ca-feedback{padding:.65rem 1rem;border-radius:10px;font-size:.85rem;font-weight:800}.ca-feedback.ok{background:#d1fae5;color:#065f46}.ca-feedback.err{background:#fee2e2;color:#991b1b}.dark .ca-feedback.ok{background:rgba(16,185,129,.15);color:#6ee7b7}.dark .ca-feedback.err{background:rgba(239,68,68,.15);color:#fca5a5}
        @media(max-width:700px){.ca-page{padding:1rem}.ca-topbar{align-items:stretch}.ca-toolbar,.ca-admin-chip,.ca-auth-action{width:100%}.ca-toolbar{display:grid;grid-template-columns:1fr 44px}.ca-auth-action{grid-column:1/-1}.ca-card{overflow-x:auto}.ca-table{min-width:620px}}
      `}</style>

      <div className="ca-page">
        <div className="ca-topbar">
          <div className="ca-admin-chip">{adminEmail || user?.email || text.adminFallback as string}</div>
          <div className="ca-toolbar">
            <LanguageSwitcher variant="light" compact />
            <ThemeToggle />
            {user ? (
              <button type="button" className="ca-auth-action secondary" onClick={() => void handleSignOut()} disabled={authLoading}>
                <LogOut size={16} />
                {text.signOut as string}
              </button>
            ) : (
              <Link className="ca-auth-action" href="/login?next=/sfm-admin-control/companies">
                <LogIn size={16} />
                {text.signIn as string}
              </Link>
            )}
          </div>
        </div>

        <div className="ca-header">
          <h1>{text.title as string}</h1>
          <p>{text.subtitle as string}</p>
        </div>

        <div className="ca-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`ca-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tabCounts[tab] ? <span className="ca-badge">{tabCounts[tab]}</span> : null}
              {text.statuses[tab]}
            </button>
          ))}
        </div>

        <div className="ca-card">
          {filtered.length === 0 ? (
            <div className="ca-empty">{text.empty as string}</div>
          ) : (
            <table className="ca-table">
              <thead>
                <tr>
                  <th>{text.company as string}</th>
                  <th>{text.category as string}</th>
                  <th>{text.location as string}</th>
                  <th>{text.submittedAt as string}</th>
                  <th>{text.status as string}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(company => (
                  <tr key={company.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <CompanyAdminLogo company={company} />
                        <div>
                          <div style={{ fontWeight: 800 }}>{company.company_name}</div>
                          {company.update_status === 'pending_update' && <div className="ca-request-badge">{text.pendingUpdate as string}</div>}
                          {company.deletion_requested && <div className="ca-request-badge">{text.deletionRequest as string}</div>}
                          {company.email && <div style={{ fontSize: '.75rem', color: '#94A3B8' }}>{company.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{company.category ?? text.dash as string}</td>
                    <td>{[company.city, company.country].filter(Boolean).join(lang === 'ar' ? '، ' : ', ') || text.dash as string}</td>
                    <td style={{ fontSize: '.8rem', color: '#94A3B8' }}>{formatDate(company.created_at, lang)}</td>
                    <td>
                      <span className="ca-status-badge" style={{ background: `${STATUS_COLORS[company.status]}18`, color: STATUS_COLORS[company.status] }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[company.status], display: 'inline-block' }} />
                        {text.statuses[company.status]}
                      </span>
                    </td>
                    <td>
                      <button className="ca-review-btn" onClick={() => openPanel(company)}>
                        {text.review as string}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="ca-overlay" onClick={event => { if (event.target === event.currentTarget) closePanel(); }}>
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2>{selected.company_name}</h2>
              <button className="ca-close" onClick={closePanel} aria-label="Close">×</button>
            </div>
            <div className="ca-panel-body">
              <div className="ca-info-row"><strong>{text.category as string}:</strong> {selected.category ?? text.dash as string}</div>
              <div className="ca-info-row"><strong>{text.country as string}:</strong> {selected.country ?? text.dash as string}</div>
              <div className="ca-info-row"><strong>{text.city as string}:</strong> {selected.city ?? text.dash as string}</div>
              {selected.email && <div className="ca-info-row"><strong>{text.email as string}:</strong> {selected.email}</div>}
              {selected.website_url && (
                <div className="ca-info-row">
                  <strong>{text.website as string}:</strong>
                  <a href={selected.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sfm-primary)' }}>
                    {selected.website_url}
                  </a>
                </div>
              )}
              {selected.short_description && <div className="ca-desc">{selected.short_description}</div>}
              {selected.update_status === 'pending_update' && <div className="ca-desc">{text.pendingUpdate as string}</div>}
              {selected.deletion_requested && <div className="ca-desc">{text.deletionRequest as string}</div>}
              <div className="ca-info-row">
                <strong>{text.status as string}:</strong>
                <span className="ca-status-badge" style={{ background: `${STATUS_COLORS[selected.status]}18`, color: STATUS_COLORS[selected.status] }}>
                  {text.statuses[selected.status]}
                </span>
              </div>
              {selected.reviewed_by && <div className="ca-info-row"><strong>{text.reviewedBy as string}:</strong> {selected.reviewed_by}</div>}
              {selected.reviewed_at && <div className="ca-info-row"><strong>{text.reviewedAt as string}:</strong> {formatDate(selected.reviewed_at, lang)}</div>}

              <div>
                <div className="ca-note-label">
                  {text.notesLabel as string} <span style={{ color: '#EF4444' }}>*</span> ({text.notesHint as string})
                </div>
                <textarea
                  className="ca-note-textarea"
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder={text.notesPlaceholder as string}
                  rows={3}
                />
              </div>

              {feedback && <div className={`ca-feedback ${feedback.type}`}>{feedback.msg}</div>}

              <div className="ca-actions">
                {selected.update_status === 'pending_update' ? (
                  <button className="ca-action-btn ca-btn-approve" disabled={isPending} onClick={() => submitAction('approved')}>
                    {text.acceptUpdate as string}
                  </button>
                ) : null}
                {selected.deletion_requested ? (
                  <button className="ca-action-btn ca-btn-reject" disabled={isPending} onClick={() => submitAction('inactive')}>
                    {text.acceptDeletion as string}
                  </button>
                ) : null}
                <button className="ca-action-btn ca-btn-approve" disabled={isPending} onClick={() => submitAction('approved')}>
                  {text.approve as string}
                </button>
                <button className="ca-action-btn ca-btn-changes" disabled={isPending} onClick={() => submitAction('needs_changes')}>
                  {text.requestChanges as string}
                </button>
                <button className="ca-action-btn ca-btn-reject" disabled={isPending} onClick={() => submitAction('rejected')}>
                  {text.reject as string}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
