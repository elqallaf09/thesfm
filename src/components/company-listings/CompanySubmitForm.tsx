'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, CreditCard, Send } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { COMPANY_CATEGORY_CONFIGS, COMPANY_CATEGORIES, normalizeCompanyCategory, type CompanyCategory } from '@/lib/companyListings';

type FormState = {
  companyName: string;
  category: CompanyCategory;
  country: string;
  city: string;
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

const initialForm: FormState = {
  companyName: '',
  category: 'investment',
  country: '',
  city: '',
  shortDescription: '',
  longDescription: '',
  websiteUrl: '',
  email: '',
  phone: '',
  whatsapp: '',
  linkedinUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  foundedYear: '',
  licenseNumber: '',
  regulatorName: '',
  services: '',
  logoUrl: '',
  coverImageUrl: '',
};

export function CompanySubmitForm() {
  const { t, dir } = useLanguage();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requestedCategory = normalizeCompanyCategory(new URLSearchParams(window.location.search).get('category'));
    if (!requestedCategory) return;
    setForm(prev => ({ ...prev, category: requestedCategory }));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      const nextPath = typeof window === 'undefined' ? '/company-listing/submit' : `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    let cancelled = false;
    setChecking(true);
    fetch('/api/company-listings/eligibility', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
      .then(response => response.json())
      .then(payload => {
        if (cancelled) return;
        setEligible(Boolean(payload.eligible));
      })
      .catch(() => {
        if (!cancelled) setEligible(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, router, session]);

  const categoryOptions = useMemo(() => COMPANY_CATEGORIES.map(category => ({
    value: category,
    label: t(COMPANY_CATEGORY_CONFIGS[category].labelKey),
  })), [t]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  async function startCheckout() {
    if (!session) return;
    setCheckoutLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: 'company',
          billingInterval: 'yearly',
          priceKey: 'STRIPE_PRICE_COMPANY_YEARLY',
        }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; url?: string; code?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setMessage({ type: 'error', text: payload.code === 'PAYMENT_UNAVAILABLE' ? t('company_listing_payment_unavailable') : t('company_listing_checkout_error') });
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setMessage({ type: 'error', text: t('company_listing_checkout_error') });
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || saving) return;
    if (!form.companyName.trim() || !form.category) {
      setMessage({ type: 'error', text: t('company_listing_required_error') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/company-listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; code?: string };
      if (!response.ok || !payload.ok) {
        setMessage({
          type: 'error',
          text: payload.code === 'PAYMENT_REQUIRED' ? t('company_listing_payment_required') : t('company_listing_submit_error'),
        });
        return;
      }
      setForm(initialForm);
      setMessage({ type: 'ok', text: t('company_listing_submit_success') });
    } catch {
      setMessage({ type: 'error', text: t('company_listing_submit_error') });
    } finally {
      setSaving(false);
    }
  }

  if (checking || authLoading) {
    return (
      <CompanyDashboardFrame>
      <DashboardPageShell ariaLabel={t('company_listing_submit_title')} className="company-submit-shell">
        <div className="company-submit-loading" />
        <style jsx>{`
          .company-submit-loading {
            min-height: 420px;
            border-radius: 24px;
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
            background-size: 400% 100%;
            animation: shimmer 1.4s ease infinite;
          }
          @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
        `}</style>
      </DashboardPageShell>
      </CompanyDashboardFrame>
    );
  }

  if (!eligible) {
    return (
      <CompanyDashboardFrame>
      <DashboardPageShell ariaLabel={t('company_listing_payment_required')} className="company-submit-shell" contentClassName="company-submit-content">
        <section className="company-submit-gate">
          <CreditCard size={34} />
          <h1>{t('company_listing_payment_required')}</h1>
          <p>{t('company_listing_success_body')}</p>
          {message ? <div className={`submit-message ${message.type}`}>{message.text}</div> : null}
          <button type="button" onClick={() => void startCheckout()} disabled={checkoutLoading}>
            {checkoutLoading ? t('company_listing_checkout_loading') : t('company_listing_add_company')}
          </button>
        </section>
        <SubmitStyles />
      </DashboardPageShell>
      </CompanyDashboardFrame>
    );
  }

  return (
    <CompanyDashboardFrame>
    <DashboardPageShell ariaLabel={t('company_listing_submit_title')} className="company-submit-shell" contentClassName="company-submit-content">
      <section className="company-submit-hero">
        <div>
          <span>THE SFM</span>
          <h1>{t('company_listing_submit_title')}</h1>
          <p>{t('company_listing_submit_subtitle')}</p>
        </div>
        <Building2 size={42} />
      </section>

      {message ? <div className={`submit-message ${message.type}`}>{message.type === 'ok' ? <CheckCircle2 size={16} /> : null}{message.text}</div> : null}

      <form className="company-submit-form" onSubmit={submitForm} dir={dir}>
        <FormSection title={t('company_listing_basic_info')}>
          <Field label={t('company_listing_company_name')} required value={form.companyName} onChange={value => updateField('companyName', value)} />
          <label className="submit-field">
            <span>{t('company_listing_company_type')} <b>*</b></span>
            <select value={form.category} onChange={event => updateField('category', event.target.value as CompanyCategory)}>
              {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <Field label={t('company_listing_country')} value={form.country} onChange={value => updateField('country', value)} />
          <Field label={t('company_listing_city')} value={form.city} onChange={value => updateField('city', value)} />
          <Field label={t('company_listing_short_description')} value={form.shortDescription} onChange={value => updateField('shortDescription', value)} span />
          <Field label={t('company_listing_long_description')} value={form.longDescription} onChange={value => updateField('longDescription', value)} span textarea />
        </FormSection>

        <FormSection title={t('company_listing_contact_info')}>
          <Field label={t('company_listing_website')} value={form.websiteUrl} onChange={value => updateField('websiteUrl', value)} />
          <Field label={t('company_listing_email')} value={form.email} onChange={value => updateField('email', value)} />
          <Field label={t('company_listing_phone')} value={form.phone} onChange={value => updateField('phone', value)} />
          <Field label={t('company_listing_whatsapp')} value={form.whatsapp} onChange={value => updateField('whatsapp', value)} />
          <Field label={t('company_listing_linkedin')} value={form.linkedinUrl} onChange={value => updateField('linkedinUrl', value)} />
          <Field label={t('company_listing_twitter')} value={form.twitterUrl} onChange={value => updateField('twitterUrl', value)} />
          <Field label={t('company_listing_instagram')} value={form.instagramUrl} onChange={value => updateField('instagramUrl', value)} />
        </FormSection>

        <FormSection title={t('company_listing_extra_info')}>
          <Field label={t('company_listing_founded_year')} value={form.foundedYear} onChange={value => updateField('foundedYear', value)} />
          <Field label={t('company_listing_license_number')} value={form.licenseNumber} onChange={value => updateField('licenseNumber', value)} />
          <Field label={t('company_listing_regulator_name')} value={form.regulatorName} onChange={value => updateField('regulatorName', value)} />
          <Field label={t('company_listing_services')} value={form.services} onChange={value => updateField('services', value)} span textarea />
          <Field label={t('company_listing_logo_url')} value={form.logoUrl} onChange={value => updateField('logoUrl', value)} />
          <Field label={t('company_listing_cover_url')} value={form.coverImageUrl} onChange={value => updateField('coverImageUrl', value)} />
        </FormSection>

        <div className="submit-sticky">
          <button type="submit" disabled={saving}>
            <Send size={17} />
            {saving ? t('saving') : t('company_listing_submit')}
          </button>
        </div>
      </form>
      <SubmitStyles />
    </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="submit-section">
      <h2>{title}</h2>
      <div className="submit-grid">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, textarea = false, span = false, required = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; span?: boolean; required?: boolean }) {
  return (
    <label className={span ? 'submit-field span-2' : 'submit-field'}>
      <span>{label} {required ? <b>*</b> : null}</span>
      {textarea ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} rows={4} />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)} />
      )}
    </label>
  );
}

function SubmitStyles() {
  return (
    <style jsx global>{`
      .company-submit-content {
        width: min(100%, 1040px);
      }
      .company-submit-hero,
      .company-submit-gate {
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 24px;
        background:
          linear-gradient(135deg, rgba(11, 118, 224, 0.08), rgba(24, 212, 212, 0.10)),
          #ffffff;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
        padding: 24px;
      }
      .company-submit-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .company-submit-hero span {
        color: #0b76e0;
        font-size: 12px;
        font-weight: 950;
      }
      .company-submit-hero h1,
      .company-submit-gate h1 {
        margin: 8px 0;
        color: #0f172a;
        font-size: clamp(26px, 3vw, 38px);
        line-height: 1.2;
        font-weight: 950;
      }
      .company-submit-hero p,
      .company-submit-gate p {
        margin: 0;
        color: #64748b;
        line-height: 1.8;
        font-weight: 750;
      }
      .company-submit-gate {
        text-align: center;
        max-width: 720px;
        margin: 0 auto;
      }
      .company-submit-gate svg {
        color: #0b76e0;
      }
      .company-submit-form {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }
      .submit-section {
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 20px;
        background: #ffffff;
        padding: 18px;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
      }
      .submit-section h2 {
        margin: 0 0 14px;
        color: #0f172a;
        font-size: 18px;
        font-weight: 950;
      }
      .submit-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .submit-field {
        min-width: 0;
        display: grid;
        gap: 6px;
      }
      .submit-field.span-2 {
        grid-column: 1 / -1;
      }
      .submit-field span {
        color: #475569;
        font-size: 13px;
        font-weight: 900;
      }
      .submit-field b {
        color: #dc2626;
      }
      .submit-field input,
      .submit-field textarea,
      .submit-field select {
        width: 100%;
        border: 1px solid rgba(15, 23, 42, 0.10);
        border-radius: 14px;
        background: #f8fbff;
        color: #0f172a;
        padding: 12px;
        font: 850 14px/1.5 Tajawal, Arial, sans-serif;
        outline: 0;
      }
      .submit-field input,
      .submit-field select {
        min-height: 44px;
      }
      .submit-message {
        margin-top: 14px;
        border-radius: 16px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 900;
      }
      .submit-message.ok {
        border: 1px solid rgba(22, 163, 74, 0.18);
        background: rgba(240, 253, 244, 0.92);
        color: #15803d;
      }
      .submit-message.error {
        border: 1px solid rgba(220, 38, 38, 0.18);
        background: rgba(254, 242, 242, 0.92);
        color: #991b1b;
      }
      .submit-sticky {
        position: sticky;
        bottom: 12px;
        z-index: 5;
        display: flex;
        justify-content: flex-end;
        padding: 12px;
        border-radius: 18px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(12px);
      }
      .submit-sticky button,
      .company-submit-gate button {
        border: 0;
        min-height: 48px;
        border-radius: 14px;
        padding: 0 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #ffffff;
        background: linear-gradient(135deg, #0b76e0, #18d4d4);
        box-shadow: 0 14px 28px rgba(11, 118, 224, 0.20);
        font: 950 14px/1 Tajawal, Arial, sans-serif;
        cursor: pointer;
      }
      .submit-sticky button:disabled,
      .company-submit-gate button:disabled {
        opacity: 0.72;
        cursor: not-allowed;
      }
      @media (max-width: 700px) {
        .company-submit-hero {
          align-items: flex-start;
          flex-direction: column;
        }
        .submit-grid {
          grid-template-columns: 1fr;
        }
        .submit-field.span-2 {
          grid-column: auto;
        }
        .submit-sticky button,
        .company-submit-gate button {
          width: 100%;
        }
      }
      /* ── Dark mode ── */
      .dark .company-submit-hero,
      .dark .company-submit-gate {
        background: linear-gradient(135deg, rgba(29, 140, 255, 0.12), rgba(24, 212, 212, 0.08)), #0B2A4A;
        border-color: rgba(47, 214, 192, 0.18);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
      }
      .dark .company-submit-hero h1,
      .dark .company-submit-gate h1 {
        color: #F8FAFC;
      }
      .dark .company-submit-hero > div > p,
      .dark .company-submit-gate p {
        color: #CBD5E1;
      }
      .dark .company-submit-hero > div > span {
        color: #7DD3FC;
      }
      .dark .company-submit-hero svg,
      .dark .company-submit-gate svg {
        color: #2FD6C0;
      }
      .dark .submit-section {
        background: #0B2A4A;
        border-color: rgba(47, 214, 192, 0.14);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
      }
      .dark .submit-section h2 {
        color: #F8FAFC;
      }
      .dark .submit-field span {
        color: #CBD5E1;
      }
      .dark .submit-sticky {
        background: rgba(11, 42, 74, 0.92);
        border-color: rgba(47, 214, 192, 0.16);
      }
    `}</style>
  );
}
