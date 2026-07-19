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
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { CompanyImageUploadField } from '@/components/company-listings/CompanyImageUploadField';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
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


const statusTone: Record<CompanyStatus, 'amber' | 'green' | 'red' | 'blue' | 'slate'> = {
  pending_review: 'amber',
  approved: 'green',
  rejected: 'red',
  needs_changes: 'blue',
  inactive: 'slate',
};

const toneClass: Record<string, string> = {
  amber: 'owner-status amber',
  green: 'owner-status green',
  red: 'owner-status red',
  blue: 'owner-status blue',
  slate: 'owner-status slate',
};

function formatDate(value?: string | null, locale = 'ar-KW-u-nu-latn', fallback = '') {
  if (!value) return fallback;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return fallback;
  }
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

export function OwnerCompaniesPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { dir, lang, t } = useLanguage();
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
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
  const statusLabels: Record<CompanyStatus, string> = {
    approved: t('company_status_approved'),
    pending_review: t('company_status_pending'),
    rejected: t('company_status_rejected'),
    needs_changes: t('company_status_changes'),
    inactive: t('company_status_inactive'),
  };

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace(loginHrefForCurrentLocation('/profile/companies'));
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
        if (!cancelled) setMessage({ type: 'error', text: t('company_load_mine_error') });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, session, t]);

  function openEdit(company: CompanyListing) {
    const nextForm = formFromCompany(company);
    setMessage(null);
    setForm(nextForm);
    setEditing(company);
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
        text: payload.pendingReview ? t('company_update_sent') : t('company_updated_sent'),
      });
    } catch {
      setMessage({ type: 'error', text: t('company_save_changes_error') });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(company: CompanyListing) {
    if (!session) return;
    const approved = company.status === 'approved';
    const prompt = approved
      ? t('company_confirm_unpublish')
      : t('company_confirm_delete');
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
        setMessage({ type: 'ok', text: t('company_request_deleted') });
      } else if (payload.item) {
        setCompanies(previous => previous.map(item => item.id === company.id ? payload.item : item));
        setMessage({ type: 'ok', text: t('company_deletion_sent') });
      }
    } catch {
      setMessage({ type: 'error', text: t('company_request_error') });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <DashboardPageShell ariaLabel={t('company_my_companies')} className="owner-companies-shell" contentClassName="owner-companies-content">
      <WorkspacePageContainer variant="wide" className="owner-companies-layout">
      <style>{`
        .owner-companies-shell{direction:${dir};}
        .owner-companies-content{max-width:none;margin:0;padding:0}.owner-companies-layout{display:flex;flex-direction:column;gap:1.25rem}
        .owner-hero{border:1px solid color-mix(in srgb,var(--accent) 32%,transparent);border-radius:var(--radius-panel);padding:clamp(1.25rem,3vw,2rem);background:var(--hero-gradient);color:var(--hero-foreground);box-shadow:var(--shadow-md);display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}
        .owner-hero h1{margin:0;font-size:clamp(2rem,5vw,3.4rem);font-weight:700;letter-spacing:0}
        .owner-hero p{margin:.5rem 0 0;color:var(--hero-foreground-muted);font-weight:400;line-height:1.8}
        .owner-add-btn,.owner-primary-btn,.owner-secondary-btn,.owner-danger-btn{min-height:44px;border-radius:var(--radius-control);border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;gap:.45rem;padding:.65rem 1rem;font-weight:600;text-decoration:none;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
        .owner-add-btn,.owner-primary-btn{background:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-sm)}
        .owner-secondary-btn{background:var(--surface);color:var(--foreground);border-color:var(--border)}
        .owner-danger-btn{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 28%,transparent)}
        .owner-add-btn:hover,.owner-primary-btn:hover,.owner-secondary-btn:hover,.owner-danger-btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-sm)}
        .owner-add-btn:focus-visible,.owner-primary-btn:focus-visible,.owner-secondary-btn:focus-visible,.owner-danger-btn:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
        .owner-message{border-radius:var(--radius-card);padding:.85rem 1rem;font-weight:500}
        .owner-message.ok{background:var(--success-soft);color:var(--success);border:1px solid color-mix(in srgb,var(--success) 28%,transparent)}.owner-message.error{background:var(--danger-soft);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 28%,transparent)}
        .owner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1rem;align-items:start}
        .owner-card{border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);padding:1rem;display:flex;flex-direction:column;gap:1rem;color:var(--foreground)}
        .owner-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .owner-company-main{display:flex;align-items:center;gap:.85rem;min-width:0}
        .owner-company-logo{width:58px;height:58px;border-radius:var(--radius-card);object-fit:cover;background:var(--surface-muted);border:1px solid var(--border);flex:0 0 auto}
        .owner-company-title{min-width:0}
        .owner-company-title h2{margin:0;font-size:1.08rem;font-weight:600;color:var(--foreground);overflow-wrap:anywhere}
        .owner-company-title p{margin:.3rem 0 0;color:var(--foreground-muted);font-weight:400;font-size:.86rem}
        .owner-status{display:inline-flex;align-items:center;gap:.35rem;border-radius:var(--radius-pill);padding:.35rem .75rem;font-size:.78rem;font-weight:600;white-space:nowrap}
        .owner-status.amber{background:var(--warning-soft);color:var(--warning)}.owner-status.green{background:var(--success-soft);color:var(--success)}.owner-status.red{background:var(--danger-soft);color:var(--danger)}.owner-status.blue{background:var(--info-soft);color:var(--info)}.owner-status.slate{background:var(--surface-muted);color:var(--foreground-secondary)}
        .owner-update-note{border:1px solid color-mix(in srgb,var(--warning) 28%,transparent);background:var(--warning-soft);color:var(--warning);border-radius:var(--radius-control);padding:.75rem .85rem;font-weight:500;font-size:.84rem}
        .owner-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
        .owner-fact{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-control);padding:.75rem}
        .owner-fact span{display:block;color:var(--foreground-muted);font-size:.76rem;font-weight:500}.owner-fact strong{display:block;margin-top:.25rem;color:var(--foreground);font-weight:600;overflow-wrap:anywhere}
        .owner-note{border-radius:var(--radius-control);background:var(--warning-soft);border:1px solid color-mix(in srgb,var(--warning) 28%,transparent);color:var(--warning);padding:.8rem;font-weight:500;line-height:1.7}
        .owner-actions{display:flex;gap:.6rem;flex-wrap:wrap}
        .owner-actions a,.owner-actions button{flex:1;min-width:135px}
        .owner-empty{border:1px dashed var(--border-strong);border-radius:var(--radius-panel);background:var(--surface);padding:2rem;text-align:center;color:var(--foreground);box-shadow:var(--shadow-card)}
        .owner-empty svg{color:var(--accent)}.owner-empty h2{margin:.75rem 0 .35rem;font-size:1.25rem}.owner-empty p{margin:0 0 1rem;color:var(--foreground-muted);font-weight:400}
        .owner-loading{display:flex;align-items:center;justify-content:center;gap:.6rem;min-height:180px;font-weight:500;color:var(--primary)}
        .owner-modal-overlay{position:fixed;inset:0;z-index:1000;background:var(--background-overlay);display:flex;align-items:center;justify-content:center;padding:1rem}
        .owner-modal{position:relative;z-index:1010;width:min(920px,100%);max-height:92dvh;overflow:visible;border-radius:var(--radius-panel);background:var(--surface-elevated);color:var(--foreground);box-shadow:var(--shadow-popover);display:flex;flex-direction:column}
        .owner-modal-head{position:relative;flex:0 0 auto;background:var(--surface-muted);border-bottom:1px solid var(--border);padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;z-index:1020;border-start-start-radius:var(--radius-panel);border-start-end-radius:var(--radius-panel)}
        .owner-modal-head h2{margin:0;font-size:1.25rem;font-weight:600}.owner-modal-close{width:44px;height:44px;border-radius:var(--radius-control);border:1px solid var(--border);background:var(--surface);color:var(--foreground);font-size:1.2rem;cursor:pointer}.owner-modal-close:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
        .owner-form{padding:1.25rem;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;overflow-y:auto;overflow-x:visible;overscroll-behavior:contain;max-height:calc(92dvh - 142px);min-height:0}
        .owner-field{display:flex;flex-direction:column;gap:.4rem;min-width:0;overflow:visible}.owner-field.full{grid-column:1/-1}.owner-field label,.owner-field>span{font-size:.82rem;font-weight:500;color:var(--foreground-secondary)}.owner-field input,.owner-field select,.owner-field textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--border-strong);background:var(--control-background);border-radius:var(--radius-control);min-height:46px;padding:.7rem .85rem;font:500 .9rem/1.5 var(--font-ui);color:var(--foreground)}.owner-field textarea{min-height:92px;resize:vertical}.owner-field input:focus,.owner-field select:focus,.owner-field textarea:focus{outline:2px solid var(--focus-ring);outline-offset:1px;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
        .owner-modal-actions{position:relative;z-index:1020;flex:0 0 auto;background:var(--surface-elevated);border-top:1px solid var(--border);padding:1rem 1.25rem;display:flex;gap:.75rem;justify-content:flex-start;flex-wrap:wrap;border-end-start-radius:var(--radius-panel);border-end-end-radius:var(--radius-panel)}
        @media(max-width:720px){.owner-hero{align-items:stretch;flex-direction:column}.owner-add-btn{width:100%}.owner-facts{grid-template-columns:1fr}.owner-actions{flex-direction:column}.owner-actions a,.owner-actions button{width:100%}.owner-form{grid-template-columns:1fr}.owner-modal-actions button{width:100%}}
      `}</style>

      <section className="owner-hero">
        <div>
          <p>THE SFM</p>
          <h1>{t('company_my_companies')}</h1>
          <p>{t('company_my_companies_desc')}</p>
        </div>
        <Link className="owner-add-btn" href="/company-listing/submit">
          <Plus size={18} />
          {t('company_add')}
        </Link>
      </section>

      {message ? <div className={`owner-message ${message.type}`}>{message.text}</div> : null}

      {loading || authLoading ? (
        <div className="owner-loading">
          <Loader2 size={18} className="animate-spin" />
          {t('company_loading_mine')}
        </div>
      ) : companies.length === 0 ? (
        <section className="owner-empty">
          <Building2 size={34} />
          <h2>{t('company_mine_empty')}</h2>
          <p>{t('company_mine_empty_body')}</p>
          <Link className="owner-primary-btn" href="/company-listing/submit">
            <Plus size={16} />
            {t('company_add')}
          </Link>
        </section>
      ) : (
        <section className="owner-grid">
          {companies.map(company => {
            const tone = statusTone[company.status];
            const categoryLabel = t(COMPANY_CATEGORY_CONFIGS[company.category].labelKey);
            const hasAdminNote = (company.status === 'rejected' || company.status === 'needs_changes') && company.admin_notes;
            return (
              <article className="owner-card" key={company.id}>
                <div className="owner-card-head">
                  <div className="owner-company-main">
                    <AssetIdentity
                      symbol={company.company_name}
                      name={company.company_name}
                      assetType="stock"
                      logoUrl={company.logo_url}
                      imageUrl={company.logo_url}
                      size="md"
                      className="owner-company-logo"
                    />
                    <div className="owner-company-title">
                      <h2>{company.company_name}</h2>
                      <p>{categoryLabel}</p>
                    </div>
                  </div>
                  <span className={toneClass[tone]}>
                    <BadgeCheck size={14} />
                    {statusLabels[company.status]}
                  </span>
                </div>

                {company.update_status === 'pending_update' ? (
                  <div className="owner-update-note">
                    {t('company_pending_updates')}
                  </div>
                ) : null}
                {company.deletion_requested ? (
                  <div className="owner-update-note">
                    {t('company_pending_deletion')}
                  </div>
                ) : null}
                {hasAdminNote ? (
                  <div className="owner-note">
                    <AlertCircle size={16} /> {t('company_admin_notes')} {company.admin_notes}
                  </div>
                ) : null}

                <div className="owner-facts">
                  <div className="owner-fact">
                    <span><MapPin size={13} /> {t('company_country_city')}</span>
                    <strong>{[company.country, company.city].filter(Boolean).join(' / ') || t('company_unspecified')}</strong>
                  </div>
                  <div className="owner-fact">
                    <span><CalendarDays size={13} /> {t('company_submission_date')}</span>
                    <strong>{formatDate(company.created_at, locale, t('company_unspecified'))}</strong>
                  </div>
                  <div className="owner-fact">
                    <span>{t('company_review_date')}</span>
                    <strong>{formatDate(company.reviewed_at, locale, t('company_unspecified'))}</strong>
                  </div>
                  <div className="owner-fact">
                    <span>{t('company_update_status')}</span>
                    <strong>{company.update_status === 'pending_update' ? t('company_update_pending') : company.deletion_requested ? t('company_delete_request') : t('company_none')}</strong>
                  </div>
                </div>

                <div className="owner-actions">
                  {company.status === 'approved' ? (
                    <Link className="owner-secondary-btn" href={`/companies/${company.id}`}>
                      <Eye size={16} />
                      {t('company_public_page')}
                    </Link>
                  ) : null}
                  <button type="button" className="owner-primary-btn" onClick={() => openEdit(company)}>
                    {company.status === 'approved' ? <FilePenLine size={16} /> : <Edit3 size={16} />}
                    {company.status === 'approved' ? t('company_request_edit') : company.status === 'needs_changes' || company.status === 'rejected' ? t('company_edit_resubmit') : t('company_edit_details')}
                  </button>
                  <button type="button" className="owner-danger-btn" disabled={deletingId === company.id} onClick={() => void deleteCompany(company)}>
                    {deletingId === company.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {company.status === 'approved' ? t('company_request_delete') : t('company_delete_application')}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {editing && form ? (
        <div className="owner-modal-overlay" onClick={event => { if (event.target === event.currentTarget) closeEdit(); }}>
          <section key={`company-edit-${editing.id}`} className="owner-modal" aria-modal="true" role="dialog" aria-label={t('company_edit_dialog')}>
            <div className="owner-modal-head">
              <h2>{editing.status === 'approved' ? t('company_request_edit') : t('company_edit_dialog')}</h2>
              <button type="button" className="owner-modal-close" onClick={closeEdit} aria-label={t('company_close')}>×</button>
            </div>
            <div className="owner-form">
              <Field label={t('company_listing_company_name')} value={form.companyName} onChange={value => updateForm('companyName', value)} />
              <label className="owner-field">
                <span>{t('company_type')}</span>
                <select value={form.category} onChange={event => updateForm('category', event.target.value as CompanyCategory)}>
                  {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <Field label={t('company_country')} value={form.country} onChange={value => updateForm('country', value)} />
              <Field label={t('company_city')} value={form.city} onChange={value => updateForm('city', value)} />
              <Field label={t('company_full_address')} value={form.fullAddress} onChange={value => updateForm('fullAddress', value)} full placeholder={t('company_address_placeholder')} />
              <Field label={t('company_google_maps')} value={form.googleMapsUrl} onChange={value => updateForm('googleMapsUrl', value)} dir="ltr" full placeholder="https://maps.google.com/..." />
              <Field label={t('company_latitude')} value={form.latitude} onChange={value => updateForm('latitude', value)} dir="ltr" />
              <Field label={t('company_longitude')} value={form.longitude} onChange={value => updateForm('longitude', value)} dir="ltr" />
              <Field label={t('company_short_description')} value={form.shortDescription} onChange={value => updateForm('shortDescription', value)} full />
              <Field label={t('company_detailed_description')} value={form.longDescription} onChange={value => updateForm('longDescription', value)} textarea full />
              <Field label={t('company_website')} value={form.websiteUrl} onChange={value => updateForm('websiteUrl', value)} dir="ltr" />
              <Field label={t('company_email')} value={form.email} onChange={value => updateForm('email', value)} dir="ltr" />
              <Field label={t('company_phone')} value={form.phone} onChange={value => updateForm('phone', value)} dir="ltr" placeholder="+965 12345678" />
              <Field label={t('company_whatsapp')} value={form.whatsapp} onChange={value => updateForm('whatsapp', value)} dir="ltr" placeholder="+965 12345678" />
              <Field label="LinkedIn" value={form.linkedinUrl} onChange={value => updateForm('linkedinUrl', value)} dir="ltr" />
              <Field label="X / Twitter" value={form.twitterUrl} onChange={value => updateForm('twitterUrl', value)} dir="ltr" />
              <Field label="Instagram" value={form.instagramUrl} onChange={value => updateForm('instagramUrl', value)} dir="ltr" />
              <Field label={t('company_founded_year')} value={form.foundedYear} onChange={value => updateForm('foundedYear', value)} dir="ltr" />
              <Field label={t('company_license_number')} value={form.licenseNumber} onChange={value => updateForm('licenseNumber', value)} />
              <Field label={t('company_regulator')} value={form.regulatorName} onChange={value => updateForm('regulatorName', value)} />
              <Field label={t('company_services')} value={form.services} onChange={value => updateForm('services', value)} textarea full />
              <CompanyImageUploadField key={`company-edit-${editing.id}-logo`} mode="edit" resetKey={`edit-${editing.id}-logo`} label={t('company_logo_link')} value={form.logoUrl} onChange={value => updateForm('logoUrl', value)} kind="logo" companyId={editing.id} />
              <CompanyImageUploadField key={`company-edit-${editing.id}-cover`} mode="edit" resetKey={`edit-${editing.id}-cover`} label={t('company_cover_link')} value={form.coverImageUrl} onChange={value => updateForm('coverImageUrl', value)} kind="cover" companyId={editing.id} />
            </div>
            <div className="owner-modal-actions">
              <button type="button" className="owner-primary-btn" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t('company_send_review')}
              </button>
              <button type="button" className="owner-secondary-btn" disabled={saving} onClick={closeEdit}>
                {t('company_cancel')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      </WorkspacePageContainer>
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
