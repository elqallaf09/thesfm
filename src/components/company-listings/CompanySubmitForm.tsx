'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, CreditCard, Send } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';
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
  phoneCountryCode: string;
  whatsapp: string;
  whatsappCountryCode: string;
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
  phoneCountryCode: '+965',
  whatsapp: '',
  whatsappCountryCode: '+965',
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

const COUNTRY_CODES = [
  'KW','SA','AE','QA','BH','OM','US','GB','FR','DE','IT','ES','NL','BE','CH','AT','SE','NO','DK','FI','IE','PT','GR','CY','LU','MT','PL','CZ','SK','HU','RO','BG','HR','SI','EE','LV','LT','IS','LI','MC','SM','VA','AD','AL','BA','RS','ME','MK','XK','TR','RU','UA','BY','MD','GE','AM','AZ',
  'EG','JO','LB','SY','IQ','YE','PS','MA','DZ','TN','LY','SD','SS','SO','DJ','MR','KM','CN','JP','KR','IN','PK','BD','LK','NP','BT','MV','AF','IR','IL','ID','MY','SG','TH','VN','PH','KH','LA','MM','BN','TL','MN','KZ','UZ','KG','TJ','TM',
  'CA','MX','BR','AR','CL','CO','PE','UY','PY','BO','EC','VE','GY','SR','PA','CR','GT','HN','SV','NI','BZ','CU','DO','HT','JM','TT','BB','BS','AG','DM','GD','KN','LC','VC',
  'AU','NZ','FJ','PG','ZA','NG','GH','KE','TZ','UG','RW','ET','ER','CM','CI','SN','ML','NE','BF','TG','BJ','GA','CG','CD','AO','NA','BW','ZM','ZW','MZ','MW','MG','MU','SC','RE','LS','SZ','GM','GN','GW','SL','LR','CV','TD','CF','GQ','ST','BI',
] as const;

const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  KW: 'الكويت', SA: 'السعودية', AE: 'الإمارات', QA: 'قطر', BH: 'البحرين', OM: 'عمان', US: 'United States', GB: 'United Kingdom',
};

const CITY_OPTIONS_BY_COUNTRY: Record<string, string[]> = {
  KW: ['مدينة الكويت', 'حولي', 'السالمية', 'الفروانية', 'الجهراء', 'الأحمدي', 'الفحيحيل', 'صباح السالم', 'المهبولة'],
  SA: ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة المنورة', 'الخبر', 'الظهران', 'أبها', 'تبوك'],
  AE: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'العين'],
  QA: ['الدوحة', 'الريان', 'الوكرة', 'لوسيل', 'الخور'],
  BH: ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى', 'سترة'],
  OM: ['مسقط', 'صلالة', 'صحار', 'نزوى', 'السيب'],
  EG: ['القاهرة', 'الإسكندرية', 'الجيزة', 'المنصورة', 'شرم الشيخ'],
  JO: ['عمّان', 'إربد', 'الزرقاء', 'العقبة'],
  LB: ['بيروت', 'طرابلس', 'صيدا', 'جونية'],
  IQ: ['بغداد', 'البصرة', 'أربيل', 'الموصل', 'النجف'],
  MA: ['الدار البيضاء', 'الرباط', 'مراكش', 'طنجة', 'فاس'],
  DZ: ['الجزائر', 'وهران', 'قسنطينة', 'عنابة'],
  TN: ['تونس', 'صفاقس', 'سوسة', 'بنزرت'],
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco', 'Seattle'],
  GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse'],
  DE: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Düsseldorf'],
  TR: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'],
  IN: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai'],
  CN: ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Hangzhou'],
  JP: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya'],
  SG: ['Singapore'],
  MY: ['Kuala Lumpur', 'George Town', 'Johor Bahru'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
};

const DIAL_CODE_OPTIONS = [
  ['KW', '+965'], ['SA', '+966'], ['AE', '+971'], ['QA', '+974'], ['BH', '+973'], ['OM', '+968'], ['EG', '+20'], ['JO', '+962'], ['LB', '+961'], ['IQ', '+964'], ['MA', '+212'], ['DZ', '+213'], ['TN', '+216'], ['US', '+1'], ['CA', '+1'], ['GB', '+44'], ['FR', '+33'], ['DE', '+49'], ['IT', '+39'], ['ES', '+34'], ['NL', '+31'], ['CH', '+41'], ['TR', '+90'], ['IN', '+91'], ['CN', '+86'], ['JP', '+81'], ['KR', '+82'], ['SG', '+65'], ['MY', '+60'], ['TH', '+66'], ['ID', '+62'], ['PH', '+63'], ['AU', '+61'], ['NZ', '+64'], ['BR', '+55'], ['MX', '+52'], ['ZA', '+27'],
] as const;

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1800 + 1 }, (_, index) => String(currentYear - index));

function hasLetter(value: string) {
  return /\p{L}/u.test(value.trim());
}

function isAsciiUrl(value: string) {
  const raw = value.trim();
  if (!raw) return true;
  if (/[^\x00-\x7F]/.test(raw)) return false;
  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname.includes('.'));
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  const raw = value.trim();
  return !raw || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

function isValidHandle(value: string) {
  const raw = value.trim();
  return !raw || /^@?[A-Za-z0-9._-]{2,80}$/.test(raw) || isAsciiUrl(raw);
}

function normalizeHandle(value: string, network: 'linkedin' | 'twitter' | 'instagram') {
  const raw = value.trim();
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const handle = raw.replace(/^@+/, '');
  if (network === 'linkedin') return `https://www.linkedin.com/company/${handle}`;
  if (network === 'twitter') return `https://x.com/${handle}`;
  return `https://www.instagram.com/${handle}`;
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

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
  const countryOptions = useMemo(() => {
    const locale = dir === 'rtl' ? 'ar' : 'en';
    const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null;
    return COUNTRY_CODES
      .map(code => ({ code, label: displayNames?.of(code) ?? FALLBACK_COUNTRY_NAMES[code] ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [dir]);
  const selectedCountryCode = countryOptions.find(option => option.label === form.country)?.code ?? '';
  const cityOptions = selectedCountryCode ? (CITY_OPTIONS_BY_COUNTRY[selectedCountryCode] ?? []) : [];

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  function updateCountry(countryLabel: string) {
    const countryCode = countryOptions.find(option => option.label === countryLabel)?.code;
    const dialCode = countryCode ? DIAL_CODE_OPTIONS.find(([code]) => code === countryCode)?.[1] : null;
    setForm(prev => ({
      ...prev,
      country: countryLabel,
      city: '',
      phoneCountryCode: dialCode ?? prev.phoneCountryCode,
      whatsappCountryCode: dialCode ?? prev.whatsappCountryCode,
    }));
    setMessage(null);
  }

  function validateForm() {
    const imageUrls = [
      [form.logoUrl, 'رابط شعار الشركة'],
      [form.coverImageUrl, 'رابط صورة الغلاف'],
    ] as const;
    if (!hasLetter(form.companyName)) return 'اسم الشركة يجب أن يحتوي على أحرف واضحة.';
    if (!form.country.trim()) return 'اختر الدولة من القائمة.';
    if (form.shortDescription.trim() && !hasLetter(form.shortDescription)) return 'الوصف المختصر يجب أن يكون أحرف أو جملة واضحة.';
    if (form.longDescription.trim() && !hasLetter(form.longDescription)) return 'الوصف التفصيلي يجب أن يحتوي على أحرف أو جملة واضحة.';
    if (!isAsciiUrl(form.websiteUrl)) return 'الموقع الإلكتروني يجب أن يكون رابطاً صحيحاً باللغة الإنجليزية.';
    if (!isValidEmail(form.email)) return 'البريد الإلكتروني يجب أن يكون بصيغة EXAMPLE@EXAMPLE.COM.';
    if (form.phone.trim() && digitsOnly(form.phone).length < 5) return 'رقم الهاتف يجب أن يحتوي على أرقام كافية مع رمز الدولة.';
    if (form.whatsapp.trim() && digitsOnly(form.whatsapp).length < 5) return 'رقم واتساب يجب أن يحتوي على أرقام كافية مع رمز الدولة.';
    if (!isValidHandle(form.linkedinUrl)) return 'رابط LinkedIn يجب أن يكون @EXAMPLE أو رابطاً صحيحاً.';
    if (!isValidHandle(form.twitterUrl)) return 'رابط X / Twitter يجب أن يكون @EXAMPLE أو رابطاً صحيحاً.';
    if (!isValidHandle(form.instagramUrl)) return 'رابط Instagram يجب أن يكون @EXAMPLE أو رابطاً صحيحاً.';
    if (form.regulatorName.trim() && !hasLetter(form.regulatorName)) return 'الجهة المنظمة يجب أن تكون أحرف أو جملة.';
    if (form.services.trim() && !hasLetter(form.services)) return 'الخدمات المقدمة يجب أن تكون أحرف أو جمل.';
    for (const [url, label] of imageUrls) {
      if (url.trim() && !isAsciiUrl(url)) return `${label} يجب أن يكون رابط صورة صحيحاً.`;
    }
    return '';
  }

  function submissionPayload() {
    return {
      ...form,
      email: form.email.trim().toUpperCase(),
      phone: form.phone.trim() ? `${form.phoneCountryCode} ${digitsOnly(form.phone)}` : '',
      whatsapp: form.whatsapp.trim() ? `${form.whatsappCountryCode} ${digitsOnly(form.whatsapp)}` : '',
      linkedinUrl: normalizeHandle(form.linkedinUrl, 'linkedin'),
      twitterUrl: normalizeHandle(form.twitterUrl, 'twitter'),
      instagramUrl: normalizeHandle(form.instagramUrl, 'instagram'),
    };
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
    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
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
        body: JSON.stringify(submissionPayload()),
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
          <Field label={t('company_listing_company_name')} required value={form.companyName} placeholder="شركة المثال المالية" onChange={value => updateField('companyName', value)} />
          <label className="submit-field">
            <span>{t('company_listing_company_type')} <b>*</b></span>
            <select value={form.category} onChange={event => updateField('category', event.target.value as CompanyCategory)}>
              {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <SelectField label={t('company_listing_country')} required value={form.country} onChange={updateCountry} options={countryOptions.map(option => option.label)} placeholder="اختر الدولة" />
          <Field label={t('company_listing_city')} value={form.city} onChange={value => updateField('city', value)} listId="company-city-options" placeholder={cityOptions[0] ?? 'اكتب المدينة'} />
          <datalist id="company-city-options">
            {cityOptions.map(city => <option key={city} value={city} />)}
          </datalist>
          <Field label={t('company_listing_short_description')} value={form.shortDescription} placeholder="وصف مختصر عن نشاط الشركة" onChange={value => updateField('shortDescription', value)} span />
          <Field label={t('company_listing_long_description')} value={form.longDescription} placeholder="وصف تفصيلي يشمل الخبرة والخدمات والأرقام المهمة" onChange={value => updateField('longDescription', value)} span textarea />
        </FormSection>

        <FormSection title={t('company_listing_contact_info')}>
          <Field label={t('company_listing_website')} value={form.websiteUrl} dir="ltr" inputMode="url" placeholder="https://example.com" onChange={value => updateField('websiteUrl', value)} />
          <Field label={t('company_listing_email')} value={form.email} dir="ltr" inputMode="email" placeholder="EXAMPLE@EXAMPLE.COM" onChange={value => updateField('email', value.toUpperCase())} />
          <PhoneField label={t('company_listing_phone')} code={form.phoneCountryCode} value={form.phone} onCodeChange={value => updateField('phoneCountryCode', value)} onChange={value => updateField('phone', digitsOnly(value))} />
          <PhoneField label={t('company_listing_whatsapp')} code={form.whatsappCountryCode} value={form.whatsapp} onCodeChange={value => updateField('whatsappCountryCode', value)} onChange={value => updateField('whatsapp', digitsOnly(value))} />
          <Field label={t('company_listing_linkedin')} value={form.linkedinUrl} dir="ltr" placeholder="@EXAMPLE" onChange={value => updateField('linkedinUrl', value)} />
          <Field label={t('company_listing_twitter')} value={form.twitterUrl} dir="ltr" placeholder="@EXAMPLE" onChange={value => updateField('twitterUrl', value)} />
          <Field label={t('company_listing_instagram')} value={form.instagramUrl} dir="ltr" placeholder="@EXAMPLE" onChange={value => updateField('instagramUrl', value)} />
        </FormSection>

        <FormSection title={t('company_listing_extra_info')}>
          <SelectField label={t('company_listing_founded_year')} value={form.foundedYear} onChange={value => updateField('foundedYear', value)} options={YEAR_OPTIONS} placeholder="اختر السنة" />
          <Field label={t('company_listing_license_number')} value={form.licenseNumber} placeholder="رقم أو أحرف الترخيص" onChange={value => updateField('licenseNumber', value)} />
          <Field label={t('company_listing_regulator_name')} value={form.regulatorName} placeholder="اسم الجهة المنظمة أو الرقابية" onChange={value => updateField('regulatorName', value)} />
          <Field label={t('company_listing_services')} value={form.services} placeholder="اكتب الخدمات مفصولة بفواصل" onChange={value => updateField('services', value)} span textarea />
          <ImageUrlField label={t('company_listing_logo_url')} value={form.logoUrl} onChange={value => updateField('logoUrl', value)} />
          <ImageUrlField label={t('company_listing_cover_url')} value={form.coverImageUrl} onChange={value => updateField('coverImageUrl', value)} />
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

function SelectField({ label, value, onChange, options, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder?: string; required?: boolean }) {
  return (
    <label className="submit-field">
      <span>{label} {required ? <b>*</b> : null}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        <option value="">{placeholder ?? label}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function PhoneField({ label, code, value, onCodeChange, onChange }: { label: string; code: string; value: string; onCodeChange: (value: string) => void; onChange: (value: string) => void }) {
  return (
    <label className="submit-field">
      <span>{label}</span>
      <div className="phone-field">
        <select value={code} onChange={event => onCodeChange(event.target.value)} aria-label={`${label} رمز الدولة`}>
          {DIAL_CODE_OPTIONS.map(([country, dial]) => (
            <option key={`${country}-${dial}`} value={dial}>{dial} {country}</option>
          ))}
        </select>
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          inputMode="numeric"
          dir="ltr"
          placeholder="12345678"
        />
      </div>
    </label>
  );
}

function ImageUrlField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const valid = isAsciiUrl(value);
  const { imageUrl, loading, failed, setFailed } = useResolvedImageUrl(valid ? value : '');
  return (
    <label className="submit-field image-url-field">
      <span>{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} inputMode="url" dir="ltr" placeholder="https://example.com/logo.png" />
      {value.trim() ? (
        <div className={`image-preview ${valid && !failed ? '' : 'invalid'}`}>
          {valid && imageUrl && !failed ? <img src={imageUrl} alt={label} loading="lazy" onError={() => setFailed(true)} /> : null}
          {valid && loading ? <span className="image-preview-loader">...</span> : null}
          <small>
            {!valid
              ? 'الرابط غير صحيح'
              : loading
                ? 'جاري التحقق من الصورة'
                : failed
                  ? 'تعذر عرض صورة من هذا الرابط'
                  : 'معاينة الصورة'}
          </small>
        </div>
      ) : null}
    </label>
  );
}

function Field({ label, value, onChange, textarea = false, span = false, required = false, placeholder, listId, dir, inputMode }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; span?: boolean; required?: boolean; placeholder?: string; listId?: string; dir?: 'rtl' | 'ltr'; inputMode?: 'text' | 'url' | 'email' | 'numeric' }) {
  return (
    <label className={span ? 'submit-field span-2' : 'submit-field'}>
      <span>{label} {required ? <b>*</b> : null}</span>
      {textarea ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} rows={4} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} list={listId} dir={dir} inputMode={inputMode} />
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
      .phone-field {
        display: grid;
        grid-template-columns: 132px minmax(0, 1fr);
        gap: 8px;
      }
      .phone-field select,
      .phone-field input {
        min-width: 0;
      }
      .image-url-field {
        align-content: start;
      }
      .image-preview {
        border: 1px solid rgba(15, 23, 42, 0.10);
        border-radius: 16px;
        background: #f8fbff;
        padding: 10px;
        display: grid;
        gap: 8px;
      }
      .image-preview img {
        width: 100%;
        max-height: 160px;
        border-radius: 12px;
        object-fit: contain;
        background: #ffffff;
      }
      .image-preview small {
        color: #0f766e;
        font-weight: 900;
      }
      .image-preview-loader {
        min-height: 52px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #0f766e;
        background: rgba(20, 184, 166, 0.08);
        font-size: 24px;
        font-weight: 950;
        letter-spacing: 2px;
      }
      .image-preview.invalid {
        border-color: rgba(220, 38, 38, 0.24);
        background: rgba(254, 242, 242, 0.88);
      }
      .image-preview.invalid small {
        color: #991b1b;
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
        .phone-field {
          grid-template-columns: 118px minmax(0, 1fr);
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
      .dark .submit-field input,
      .dark .submit-field textarea,
      .dark .submit-field select,
      .dark .image-preview {
        background: #0A1F36;
        border-color: rgba(47, 214, 192, 0.16);
        color: #F8FAFC;
      }
      .dark .image-preview img {
        background: #07172A;
      }
      .dark .image-preview small {
        color: #7DD3FC;
      }
      .dark .submit-sticky {
        background: rgba(11, 42, 74, 0.92);
        border-color: rgba(47, 214, 192, 0.16);
      }
    `}</style>
  );
}
