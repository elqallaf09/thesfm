'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Edit3,
  Eye,
  FilePenLine,
  Loader2,
  MapPin,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { Sidebar } from '@/components/Sidebar';
import { CompanyImageUploadField } from '@/components/company-listings/CompanyImageUploadField';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  COMPANY_CATEGORIES,
  COMPANY_CATEGORY_CONFIGS,
  type CompanyCategory,
  type CompanyListing,
  type CompanyStatus,
} from '@/lib/companyListings';

type FormState = {
  companyName: string;
  category: CompanyCategory;
  country: string;
  city: string;
  fullAddress: string;
  googleMapsUrl: string;
  latitude: string;
  longitude: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedinUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  foundedYear: string;
  licenseNumber: string;
  regulatorName: string;
  services: string;
  logoUrl: string;
  coverImageUrl: string;
};

type CompanyFormMode = 'create' | 'edit';

const statusCopy: Record<CompanyStatus, { ar: string; en: string; tone: 'amber' | 'green' | 'red' | 'blue' | 'slate' }> = {
  pending_review: { ar: 'قيد المراجعة', en: 'Pending review', tone: 'amber' },
  approved: { ar: 'معتمدة', en: 'Approved', tone: 'green' },
  rejected: { ar: 'مرفوضة', en: 'Rejected', tone: 'red' },
  needs_changes: { ar: 'تحتاج تعديل', en: 'Needs changes', tone: 'blue' },
  inactive: { ar: 'غير نشطة', en: 'Inactive', tone: 'slate' },
};

const toneClass: Record<string, string> = {
  amber: 'owner-status amber',
  green: 'owner-status green',
  red: 'owner-status red',
  blue: 'owner-status blue',
  slate: 'owner-status slate',
};

function formatDate(value?: string | null, locale = 'ar-KW') {
  if (!value) return 'غير محدد';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return 'غير محدد';
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'S';
}

function formFromCompany(company: CompanyListing): FormState {
  return {
    companyName: company.company_name ?? '',
    category: company.category,
    country: company.country ?? '',
    city: company.city ?? '',
    fullAddress: company.full_address ?? '',
    googleMapsUrl: company.google_maps_url ?? '',
    latitude: company.latitude ? String(company.latitude) : '',
    longitude: company.longitude ? String(company.longitude) : '',
    shortDescription: company.short_description ?? '',
    longDescription: company.long_description ?? '',
    websiteUrl: company.website_url ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    whatsapp: company.whatsapp ?? '',
    linkedinUrl: company.linkedin_url ?? '',
    twitterUrl: company.twitter_url ?? '',
    instagramUrl: company.instagram_url ?? '',
    foundedYear: company.founded_year ? String(company.founded_year) : '',
    licenseNumber: company.license_number ?? '',
    regulatorName: company.regulator_name ?? '',
    services: (company.services ?? []).join(', '),
    logoUrl: company.logo_url ?? '',
    coverImageUrl: company.cover_image_url ?? '',
  };
}

function logCompanyFormInitialized(mode: CompanyFormMode, values: FormState, companyId?: string | null) {
  if (process.env.NODE_ENV !== 'development') return;
  console.log('Company form initialized', {
    mode,
    companyId: companyId ?? null,
    hasLogoUrl: Boolean(values.logoUrl),
    hasCoverUrl: Boolean(values.coverImageUrl),
    hasLogoFile: false,
    hasCoverFile: false,
  });
}

function formPayload(form: FormState) {
  return {
    companyName: form.companyName,
    category: form.category,
    country: form.country,
    city: form.city,
    fullAddress: form.fullAddress,
    googleMapsUrl: form.googleMapsUrl,
    latitude: form.latitude,
    longitude: form.longitude,
    shortDescription: form.shortDescription,
    longDescription: form.longDescription,
    websiteUrl: form.websiteUrl,
    email: form.email,
    phone: form.phone,
    whatsapp: form.whatsapp,
    linkedinUrl: form.linkedinUrl,
    twitterUrl: form.twitterUrl,
    instagramUrl: form.instagramUrl,
    foundedYear: form.foundedYear,
    licenseNumber: form.licenseNumber,
    regulatorName: form.regulatorName,
    services: form.services,
    logoUrl: form.logoUrl,
    coverImageUrl: form.coverImageUrl,
  };
}

function CompanyLogo({ company }: { company: CompanyListing }) {
  const [failed, setFailed] = useState(false);
  if (company.logo_url && !failed) {
    return (
      <Image
        className="owner-company-logo"
        src={company.logo_url}
        alt={`${company.company_name || 'Company'} logo`}
        width={58}
        height={58}
        unoptimized
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="owner-company-logo fallback">{initials(company.company_name)}</span>;
}

export function OwnerCompaniesPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { dir, lang, t } = useLanguage();
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const [companies, setCompanies] = useState<CompanyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<CompanyListing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryOptions = useMemo(() => COMPANY_CATEGORIES.map(category => ({
    value: category,
    label: t(COMPANY_CATEGORY_CONFIGS[category].labelKey),
  })), [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/login?next=/profile/companies');
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch('/api/company-listings/owner', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
      .then(response => response.json())
      .then(payload => {
        if (cancelled) return;
        setCompanies(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: 'error', text: 'تعذر تحميل شركاتك حالياً.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, session]);

  function openEdit(company: CompanyListing) {
    const nextForm = formFromCompany(company);
    setMessage(null);
    setForm(nextForm);
    setEditing(company);
    logCompanyFormInitialized('edit', nextForm, company.id);
  }

  function closeEdit() {
    setEditing(null);
    setForm(null);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(previous => previous ? { ...previous, [key]: value } : previous);
  }

  async function saveEdit() {
    if (!session || !editing || !form) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/company-listings/owner/${editing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formPayload(form)),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.code ?? 'SAVE_FAILED');
      const nextItem = payload.item as CompanyListing;
      setCompanies(previous => previous.map(item => item.id === nextItem.id ? nextItem : item));
      closeEdit();
      setMessage({
        type: 'ok',
        text: payload.pendingReview ? 'تم إرسال التعديلات للمراجعة قبل نشرها.' : 'تم تحديث بيانات الشركة وإرسالها للمراجعة.',
      });
    } catch {
      setMessage({ type: 'error', text: 'تعذر حفظ التعديلات. تأكد من البيانات وحاول مرة أخرى.' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(company: CompanyListing) {
    if (!session) return;
    const approved = company.status === 'approved';
    const prompt = approved
      ? 'سيتم إرسال طلب حذف الشركة للإدارة قبل إلغاء النشر. هل تريد المتابعة؟'
      : 'هل أنت متأكد من حذف طلب الشركة؟ لا يمكن التراجع عن هذا الإجراء.';
    if (!window.confirm(prompt)) return;

    setDeletingId(company.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/company-listings/owner/${company.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.code ?? 'DELETE_FAILED');
      if (payload.deleted) {
        setCompanies(previous => previous.filter(item => item.id !== company.id));
        setMessage({ type: 'ok', text: 'تم حذف طلب الشركة.' });
      } else if (payload.item) {
        setCompanies(previous => previous.map(item => item.id === company.id ? payload.item : item));
        setMessage({ type: 'ok', text: 'تم إرسال طلب حذف الشركة للمراجعة.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'تعذر تنفيذ الطلب حالياً.' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Sidebar />
      <DashboardPageShell ariaLabel="شركاتي" className="owner-companies-shell" contentClassName="owner-companies-content">
      <style>{`
        .owner-companies-shell{direction:${dir};}
        .owner-companies-content{max-width:1180px;margin:0 auto;padding:clamp(1rem,3vw,2rem);display:flex;flex-direction:column;gap:1.25rem}
        .owner-hero{border:1px solid rgba(47,214,192,.24);border-radius:24px;padding:clamp(1.25rem,3vw,2rem);background:linear-gradient(135deg,#062238,#0b3150 52%,#0f6f78);color:#fff;box-shadow:0 18px 50px rgba(3,18,37,.16);display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}
        .owner-hero h1{margin:0;font-size:clamp(2rem,5vw,3.4rem);font-weight:950;letter-spacing:0}
        .owner-hero p{margin:.5rem 0 0;color:rgba(255,255,255,.78);font-weight:800;line-height:1.8}
        .owner-add-btn,.owner-primary-btn,.owner-secondary-btn,.owner-danger-btn{min-height:44px;border-radius:14px;border:1px solid rgba(47,214,192,.24);display:inline-flex;align-items:center;justify-content:center;gap:.45rem;padding:.65rem 1rem;font-weight:900;text-decoration:none;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
        .owner-add-btn,.owner-primary-btn{background:linear-gradient(135deg,#1d8cff,#18d4d4);color:#fff;box-shadow:0 12px 28px rgba(29,140,255,.20)}
        .owner-secondary-btn{background:rgba(255,255,255,.86);color:#0b2138;border-color:rgba(11,118,224,.18)}
        .owner-danger-btn{background:#fff1f2;color:#be123c;border-color:#fecdd3}
        .owner-add-btn:hover,.owner-primary-btn:hover,.owner-secondary-btn:hover,.owner-danger-btn:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(3,18,37,.14)}
        .owner-message{border-radius:16px;padding:.85rem 1rem;font-weight:900}
        .owner-message.ok{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}.owner-message.error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
        .owner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1rem;align-items:start}
        .owner-card{border:1px solid rgba(47,214,192,.22);border-radius:22px;background:rgba(255,255,255,.92);box-shadow:0 14px 34px rgba(3,18,37,.08);padding:1rem;display:flex;flex-direction:column;gap:1rem;color:#0b2138}
        .owner-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .owner-company-main{display:flex;align-items:center;gap:.85rem;min-width:0}
        .owner-company-logo{width:58px;height:58px;border-radius:18px;object-fit:cover;background:#e8f4fb;border:1px solid rgba(47,214,192,.22);flex:0 0 auto}
        .owner-company-logo.fallback{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0b76e0,#18d4d4);color:#fff;font-weight:950;font-size:1.1rem}
        .owner-company-title{min-width:0}
        .owner-company-title h2{margin:0;font-size:1.08rem;font-weight:950;color:#061b33;overflow-wrap:anywhere}
        .owner-company-title p{margin:.3rem 0 0;color:#64748b;font-weight:800;font-size:.86rem}
        .owner-status{display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;padding:.35rem .75rem;font-size:.78rem;font-weight:950;white-space:nowrap}
        .owner-status.amber{background:#fef3c7;color:#92400e}.owner-status.green{background:#dcfce7;color:#166534}.owner-status.red{background:#fee2e2;color:#991b1b}.owner-status.blue{background:#dbeafe;color:#1e40af}.owner-status.slate{background:#e2e8f0;color:#334155}
        .owner-update-note{border:1px solid rgba(245,158,11,.22);background:#fffbeb;color:#92400e;border-radius:14px;padding:.75rem .85rem;font-weight:900;font-size:.84rem}
        .owner-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
        .owner-fact{border:1px solid rgba(11,118,224,.12);background:#f8fbff;border-radius:14px;padding:.75rem}
        .owner-fact span{display:block;color:#64748b;font-size:.76rem;font-weight:850}.owner-fact strong{display:block;margin-top:.25rem;color:#061b33;font-weight:950;overflow-wrap:anywhere}
        .owner-note{border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:.8rem;font-weight:850;line-height:1.7}
        .owner-actions{display:flex;gap:.6rem;flex-wrap:wrap}
        .owner-actions a,.owner-actions button{flex:1;min-width:135px}
        .owner-empty{border:1px dashed rgba(11,118,224,.24);border-radius:22px;background:rgba(255,255,255,.82);padding:2rem;text-align:center;color:#0b2138;box-shadow:0 14px 34px rgba(3,18,37,.06)}
        .owner-empty svg{color:#17c6cb}.owner-empty h2{margin:.75rem 0 .35rem;font-size:1.25rem}.owner-empty p{margin:0 0 1rem;color:#64748b;font-weight:800}
        .owner-loading{display:flex;align-items:center;justify-content:center;gap:.6rem;min-height:180px;font-weight:900;color:#0b76e0}
        .owner-modal-overlay{position:fixed;inset:0;z-index:1000;background:rgba(3,18,37,.56);display:flex;align-items:center;justify-content:center;padding:1rem}
        .owner-modal{position:relative;z-index:1010;width:min(920px,100%);max-height:92dvh;overflow:visible;border-radius:24px;background:#fff;color:#0b2138;box-shadow:0 24px 70px rgba(0,0,0,.28);display:flex;flex-direction:column}
        .owner-modal-head{position:relative;flex:0 0 auto;background:linear-gradient(135deg,#f8fcff,#e8fbfb);border-bottom:1px solid rgba(47,214,192,.18);padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;z-index:1020;border-start-start-radius:24px;border-start-end-radius:24px}
        .owner-modal-head h2{margin:0;font-size:1.25rem;font-weight:950}.owner-modal-close{width:44px;height:44px;border-radius:14px;border:1px solid rgba(11,118,224,.14);background:#fff;font-size:1.2rem;cursor:pointer}
        .owner-form{padding:1.25rem;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;overflow-y:auto;overflow-x:visible;overscroll-behavior:contain;max-height:calc(92dvh - 142px);min-height:0}
        .owner-field{display:flex;flex-direction:column;gap:.4rem;min-width:0;overflow:visible}.owner-field.full{grid-column:1/-1}.owner-field label,.owner-field>span{font-size:.82rem;font-weight:950;color:#334155}.owner-field input,.owner-field select,.owner-field textarea{width:100%;box-sizing:border-box;border:1.5px solid #dbeafe;background:#f8fbff;border-radius:14px;min-height:46px;padding:.7rem .85rem;font:800 .9rem Tajawal,Arial,sans-serif;color:#0b2138}.owner-field textarea{min-height:92px;resize:vertical}.owner-field input:focus,.owner-field select:focus,.owner-field textarea:focus{outline:none;border-color:#18d4d4;box-shadow:0 0 0 4px rgba(47,214,192,.14)}
        .owner-modal-actions{position:relative;z-index:1020;flex:0 0 auto;background:rgba(255,255,255,.96);border-top:1px solid rgba(47,214,192,.18);padding:1rem 1.25rem;display:flex;gap:.75rem;justify-content:flex-start;flex-wrap:wrap;border-end-start-radius:24px;border-end-end-radius:24px}
        .dark .owner-card,.dark .owner-empty,.dark .owner-modal{background:#0f1d31;color:#e8eef6;border-color:#1d3050}.dark .owner-company-title h2,.dark .owner-fact strong,.dark .owner-empty{color:#e8eef6}.dark .owner-company-title p,.dark .owner-empty p,.dark .owner-fact span{color:#9fb2c8}.dark .owner-fact{background:#071a2e;border-color:#1d3050}.dark .owner-modal-head,.dark .owner-modal-actions{background:#0b1728;border-color:#1d3050}.dark .owner-field input,.dark .owner-field select,.dark .owner-field textarea{background:#071a2e;color:#e8eef6;border-color:#1d3050}.dark .owner-secondary-btn{background:#10243b;color:#e8eef6;border-color:#1d3050}
        @media(max-width:720px){.owner-companies-content{padding:1rem}.owner-hero{align-items:stretch;flex-direction:column}.owner-add-btn{width:100%}.owner-facts{grid-template-columns:1fr}.owner-actions{flex-direction:column}.owner-actions a,.owner-actions button{width:100%}.owner-form{grid-template-columns:1fr}.owner-modal-actions button{width:100%}}
      `}</style>

      <section className="owner-hero">
        <div>
          <p>THE SFM</p>
          <h1>شركاتي</h1>
          <p>تابع طلبات إدراج شركاتك، عدل البيانات، وأرسل التحديثات للمراجعة قبل النشر.</p>
        </div>
        <Link className="owner-add-btn" href="/company-listing/submit">
          <Plus size={18} />
          إضافة شركة
        </Link>
      </section>

      {message ? <div className={`owner-message ${message.type}`}>{message.text}</div> : null}

      {loading || authLoading ? (
        <div className="owner-loading">
          <Loader2 size={18} className="animate-spin" />
          جاري تحميل شركاتك...
        </div>
      ) : companies.length === 0 ? (
        <section className="owner-empty">
          <Building2 size={34} />
          <h2>لم تقم بإضافة أي شركة بعد.</h2>
          <p>أرسل بيانات شركتك للمراجعة حتى تظهر في دليل خدمات THE SFM بعد الاعتماد.</p>
          <Link className="owner-primary-btn" href="/company-listing/submit">
            <Plus size={16} />
            إضافة شركة
          </Link>
        </section>
      ) : (
        <section className="owner-grid">
          {companies.map(company => {
            const status = statusCopy[company.status];
            const categoryLabel = t(COMPANY_CATEGORY_CONFIGS[company.category].labelKey);
            const hasAdminNote = (company.status === 'rejected' || company.status === 'needs_changes') && company.admin_notes;
            return (
              <article className="owner-card" key={company.id}>
                <div className="owner-card-head">
                  <div className="owner-company-main">
                    <CompanyLogo company={company} />
                    <div className="owner-company-title">
                      <h2>{company.company_name}</h2>
                      <p>{categoryLabel}</p>
                    </div>
                  </div>
                  <span className={toneClass[status.tone]}>
                    <BadgeCheck size={14} />
                    {lang === 'ar' ? status.ar : status.en}
                  </span>
                </div>

                {company.update_status === 'pending_update' ? (
                  <div className="owner-update-note">
                    توجد تعديلات مرسلة بانتظار مراجعة الإدارة قبل نشرها.
                  </div>
                ) : null}
                {company.deletion_requested ? (
                  <div className="owner-update-note">
                    يوجد طلب حذف / إلغاء نشر بانتظار قرار الإدارة.
                  </div>
                ) : null}
                {hasAdminNote ? (
                  <div className="owner-note">
                    <AlertCircle size={16} /> ملاحظات الإدارة: {company.admin_notes}
                  </div>
                ) : null}

                <div className="owner-facts">
                  <div className="owner-fact">
                    <span><MapPin size={13} /> الدولة / المدينة</span>
                    <strong>{[company.country, company.city].filter(Boolean).join(' / ') || 'غير محدد'}</strong>
                  </div>
                  <div className="owner-fact">
                    <span><CalendarDays size={13} /> تاريخ التقديم</span>
                    <strong>{formatDate(company.created_at, locale)}</strong>
                  </div>
                  <div className="owner-fact">
                    <span>تاريخ المراجعة</span>
                    <strong>{formatDate(company.reviewed_at, locale)}</strong>
                  </div>
                  <div className="owner-fact">
                    <span>حالة التحديث</span>
                    <strong>{company.update_status === 'pending_update' ? 'تعديل بانتظار المراجعة' : company.deletion_requested ? 'طلب حذف' : 'لا يوجد'}</strong>
                  </div>
                </div>

                <div className="owner-actions">
                  {company.status === 'approved' ? (
                    <Link className="owner-secondary-btn" href={`/companies/${company.id}`}>
                      <Eye size={16} />
                      عرض الصفحة العامة
                    </Link>
                  ) : null}
                  <button type="button" className="owner-primary-btn" onClick={() => openEdit(company)}>
                    {company.status === 'approved' ? <FilePenLine size={16} /> : <Edit3 size={16} />}
                    {company.status === 'approved' ? 'طلب تعديل البيانات' : company.status === 'needs_changes' || company.status === 'rejected' ? 'تعديل وإعادة الإرسال' : 'تعديل البيانات'}
                  </button>
                  <button type="button" className="owner-danger-btn" disabled={deletingId === company.id} onClick={() => void deleteCompany(company)}>
                    {deletingId === company.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {company.status === 'approved' ? 'طلب حذف الشركة' : 'حذف الطلب'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {editing && form ? (
        <div className="owner-modal-overlay" onClick={event => { if (event.target === event.currentTarget) closeEdit(); }}>
          <section key={`company-edit-${editing.id}`} className="owner-modal" aria-modal="true" role="dialog" aria-label="تعديل بيانات الشركة">
            <div className="owner-modal-head">
              <h2>{editing.status === 'approved' ? 'طلب تعديل بيانات الشركة' : 'تعديل بيانات الشركة'}</h2>
              <button type="button" className="owner-modal-close" onClick={closeEdit} aria-label="إغلاق">×</button>
            </div>
            <div className="owner-form">
              <Field label="اسم الشركة" value={form.companyName} onChange={value => updateForm('companyName', value)} />
              <label className="owner-field">
                <span>نوع الشركة</span>
                <select value={form.category} onChange={event => updateForm('category', event.target.value as CompanyCategory)}>
                  {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <Field label="الدولة" value={form.country} onChange={value => updateForm('country', value)} />
              <Field label="المدينة" value={form.city} onChange={value => updateForm('city', value)} />
              <Field label="عنوان الشركة بالكامل" value={form.fullAddress} onChange={value => updateForm('fullAddress', value)} full placeholder="المنطقة، الشارع، المبنى، الدور أو المكتب" />
              <Field label="رابط Google Maps / موقع الدبوس" value={form.googleMapsUrl} onChange={value => updateForm('googleMapsUrl', value)} dir="ltr" full placeholder="https://maps.google.com/..." />
              <Field label="خط العرض" value={form.latitude} onChange={value => updateForm('latitude', value)} dir="ltr" />
              <Field label="خط الطول" value={form.longitude} onChange={value => updateForm('longitude', value)} dir="ltr" />
              <Field label="وصف مختصر" value={form.shortDescription} onChange={value => updateForm('shortDescription', value)} full />
              <Field label="وصف تفصيلي" value={form.longDescription} onChange={value => updateForm('longDescription', value)} textarea full />
              <Field label="الموقع الإلكتروني" value={form.websiteUrl} onChange={value => updateForm('websiteUrl', value)} dir="ltr" />
              <Field label="البريد الإلكتروني" value={form.email} onChange={value => updateForm('email', value)} dir="ltr" />
              <Field label="رقم الهاتف" value={form.phone} onChange={value => updateForm('phone', value)} dir="ltr" placeholder="+965 12345678" />
              <Field label="واتساب" value={form.whatsapp} onChange={value => updateForm('whatsapp', value)} dir="ltr" placeholder="+965 12345678" />
              <Field label="LinkedIn" value={form.linkedinUrl} onChange={value => updateForm('linkedinUrl', value)} dir="ltr" />
              <Field label="X / Twitter" value={form.twitterUrl} onChange={value => updateForm('twitterUrl', value)} dir="ltr" />
              <Field label="Instagram" value={form.instagramUrl} onChange={value => updateForm('instagramUrl', value)} dir="ltr" />
              <Field label="سنة التأسيس" value={form.foundedYear} onChange={value => updateForm('foundedYear', value)} dir="ltr" />
              <Field label="رقم الترخيص" value={form.licenseNumber} onChange={value => updateForm('licenseNumber', value)} />
              <Field label="الجهة المنظمة" value={form.regulatorName} onChange={value => updateForm('regulatorName', value)} />
              <Field label="الخدمات المقدمة" value={form.services} onChange={value => updateForm('services', value)} textarea full />
              <CompanyImageUploadField key={`company-edit-${editing.id}-logo`} mode="edit" resetKey={`edit-${editing.id}-logo`} label="رابط شعار الشركة" value={form.logoUrl} onChange={value => updateForm('logoUrl', value)} kind="logo" companyId={editing.id} />
              <CompanyImageUploadField key={`company-edit-${editing.id}-cover`} mode="edit" resetKey={`edit-${editing.id}-cover`} label="رابط صورة الغلاف" value={form.coverImageUrl} onChange={value => updateForm('coverImageUrl', value)} kind="cover" companyId={editing.id} />
            </div>
            <div className="owner-modal-actions">
              <button type="button" className="owner-primary-btn" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                إرسال للمراجعة
              </button>
              <button type="button" className="owner-secondary-btn" disabled={saving} onClick={closeEdit}>
                إلغاء
              </button>
            </div>
          </section>
        </div>
      ) : null}
      </DashboardPageShell>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  full,
  dir,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  full?: boolean;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
}) {
  return (
    <label className={`owner-field${full ? ' full' : ''}`}>
      <span>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} dir={dir} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)} dir={dir} placeholder={placeholder} />
      )}
    </label>
  );
}
