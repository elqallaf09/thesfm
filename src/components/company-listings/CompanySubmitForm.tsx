'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, ChevronRight, CreditCard, ExternalLink, MapPin, Send } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { CompanyImageUploadField } from '@/components/company-listings/CompanyImageUploadField';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { COMPANY_CATEGORY_CONFIGS, COMPANY_CATEGORIES, normalizeCompanyCategory, type CompanyCategory } from '@/lib/companyListings';
import { isValidCompanySocialInput, normalizeCompanySocialUrl } from '@/lib/companySocialLinks';
import { normalizeDigits } from '@/lib/locale';

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


const EMPTY_COMPANY_FORM: Readonly<FormState> = Object.freeze({
  companyName: '',
  category: 'investment',
  country: '',
  city: '',
  fullAddress: '',
  googleMapsUrl: '',
  latitude: '',
  longitude: '',
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
});

function createEmptyCompanyForm(overrides: Partial<FormState> = {}): FormState {
  return { ...EMPTY_COMPANY_FORM, ...overrides };
}

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

function parseGoogleMapsCoordinates(value: string) {
  const raw = value.trim();
  if (!raw) return { latitude: '', longitude: '' };
  const decoded = decodeURIComponent(raw);
  const atMatch = decoded.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (atMatch) return { latitude: atMatch[1], longitude: atMatch[2] };
  const bangMatch = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bangMatch) return { latitude: bangMatch[1], longitude: bangMatch[2] };

  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const queryMatch = query.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (queryMatch) return { latitude: queryMatch[1], longitude: queryMatch[2] };
  } catch {
    return { latitude: '', longitude: '' };
  }

  return { latitude: '', longitude: '' };
}

function isValidCoordinate(value: string, min: number, max: number) {
  const raw = value.trim();
  if (!raw) return true;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

function digitsOnly(value: string) {
  return normalizeDigits(value).replace(/[^\d]/g, '');
}

export function CompanySubmitForm() {
  const { t, dir, lang } = useLanguage();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => createEmptyCompanyForm());
  const [uploadResetVersion, setUploadResetVersion] = useState(0);
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requestedCategory = normalizeCompanyCategory(new URLSearchParams(window.location.search).get('category'));
    const nextForm = createEmptyCompanyForm(requestedCategory ? { category: requestedCategory } : undefined);
    setForm(nextForm);
    setUploadResetVersion(version => version + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace(loginHrefForCurrentLocation('/company-listing/submit'));
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
    const locale = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
    const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null;
    return COUNTRY_CODES
      .map(code => ({ code, label: displayNames?.of(code) ?? FALLBACK_COUNTRY_NAMES[code] ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [lang]);
  const selectedCountryCode = countryOptions.find(option => option.label === form.country)?.code ?? '';
  const cityOptions = selectedCountryCode
    ? (CITY_OPTIONS_BY_COUNTRY[selectedCountryCode] ?? []).filter(city => lang === 'ar' ? /[\u0600-\u06ff]/.test(city) : !/[\u0600-\u06ff]/.test(city))
    : [];

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  const servicesBackHref = COMPANY_CATEGORY_CONFIGS[form.category]?.path ?? '/services';

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

  function updateMapsUrl(value: string) {
    const coords = parseGoogleMapsCoordinates(value);
    setForm(prev => ({
      ...prev,
      googleMapsUrl: value,
      latitude: coords.latitude || prev.latitude,
      longitude: coords.longitude || prev.longitude,
    }));
    setMessage(null);
  }

  function openGoogleMapsPicker() {
    if (typeof window === 'undefined') return;
    const query = [form.fullAddress, form.city, form.country].map(part => part.trim()).filter(Boolean).join(', ') || 'Kuwait';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  }

  function validateForm() {
    if (!hasLetter(form.companyName)) return t('company_validation_name');
    if (!form.country.trim()) return t('company_validation_country');
    if (form.fullAddress.trim() && !hasLetter(form.fullAddress)) return t('company_validation_address');
    if (!isAsciiUrl(form.googleMapsUrl)) return t('company_validation_maps');
    if (!isValidCoordinate(form.latitude, -90, 90)) return t('company_validation_latitude');
    if (!isValidCoordinate(form.longitude, -180, 180)) return t('company_validation_longitude');
    if (form.shortDescription.trim() && !hasLetter(form.shortDescription)) return t('company_validation_short_description');
    if (form.longDescription.trim() && !hasLetter(form.longDescription)) return t('company_validation_long_description');
    if (!isAsciiUrl(form.websiteUrl)) return t('company_validation_website');
    if (!isValidEmail(form.email)) return t('company_validation_email');
    if (form.phone.trim() && digitsOnly(form.phone).length < 5) return t('company_validation_phone');
    if (form.whatsapp.trim() && digitsOnly(form.whatsapp).length < 5) return t('company_validation_whatsapp');
    if (!isValidCompanySocialInput(form.linkedinUrl, 'linkedin')) return t('company_validation_linkedin');
    if (!isValidCompanySocialInput(form.twitterUrl, 'twitter')) return t('company_validation_twitter');
    if (!isValidCompanySocialInput(form.instagramUrl, 'instagram')) return t('company_validation_instagram');
    if (form.regulatorName.trim() && !hasLetter(form.regulatorName)) return t('company_validation_regulator');
    if (form.services.trim() && !hasLetter(form.services)) return t('company_validation_services');
    if (form.logoUrl.trim() && !isAsciiUrl(form.logoUrl)) return t('company_validation_logo');
    if (form.coverImageUrl.trim() && !isAsciiUrl(form.coverImageUrl)) return t('company_validation_cover');
    return '';
  }
  function submissionPayload() {
    return {
      ...form,
      email: form.email.trim().toUpperCase(),
      phone: form.phone.trim() ? `${form.phoneCountryCode} ${digitsOnly(form.phone)}` : '',
      whatsapp: form.whatsapp.trim() ? `${form.whatsappCountryCode} ${digitsOnly(form.whatsapp)}` : '',
      linkedinUrl: normalizeCompanySocialUrl(form.linkedinUrl, 'linkedin') ?? '',
      twitterUrl: normalizeCompanySocialUrl(form.twitterUrl, 'twitter') ?? '',
      instagramUrl: normalizeCompanySocialUrl(form.instagramUrl, 'instagram') ?? '',
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
      const nextForm = createEmptyCompanyForm();
      setForm(nextForm);
      setUploadResetVersion(version => version + 1);
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
            border-radius: var(--radius-panel);
            background: var(--skeleton-gradient);
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
        <BackToServicesButton href={servicesBackHref} label={t('company_listing_back_services')} />
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
      <BackToServicesButton href={servicesBackHref} label={t('company_listing_back_services')} />
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
          <Field label={t('company_listing_company_name')} required value={form.companyName} placeholder={t('company_example_name')} onChange={value => updateField('companyName', value)} />
          <label className="submit-field">
            <span>{t('company_listing_company_type')} <b>*</b></span>
            <select value={form.category} onChange={event => updateField('category', event.target.value as CompanyCategory)}>
              {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <SelectField label={t('company_listing_country')} required value={form.country} onChange={updateCountry} options={countryOptions.map(option => option.label)} placeholder={t('company_select_country')} />
          <Field label={t('company_listing_city')} value={form.city} onChange={value => updateField('city', value)} listId="company-city-options" placeholder={cityOptions[0] ?? t('company_enter_city')} />
          <datalist id="company-city-options">
            {cityOptions.map(city => <option key={city} value={city} />)}
          </datalist>
          <Field label={t('company_full_address')} value={form.fullAddress} placeholder={t('company_address_placeholder')} onChange={value => updateField('fullAddress', value)} span />
          <MapLocationField
            mapsUrl={form.googleMapsUrl}
            latitude={form.latitude}
            longitude={form.longitude}
            onMapsUrlChange={updateMapsUrl}
            onLatitudeChange={value => updateField('latitude', value)}
            onLongitudeChange={value => updateField('longitude', value)}
            onOpenMaps={openGoogleMapsPicker}
          />
          <Field label={t('company_listing_short_description')} value={form.shortDescription} placeholder={t('company_short_description_placeholder')} onChange={value => updateField('shortDescription', value)} span />
          <Field label={t('company_listing_long_description')} value={form.longDescription} placeholder={t('company_detailed_description_placeholder')} onChange={value => updateField('longDescription', value)} span textarea />
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
          <SelectField label={t('company_listing_founded_year')} value={form.foundedYear} onChange={value => updateField('foundedYear', value)} options={YEAR_OPTIONS} placeholder={t('company_select_year')} />
          <Field label={t('company_listing_license_number')} value={form.licenseNumber} placeholder={t('company_license_placeholder')} onChange={value => updateField('licenseNumber', value)} />
          <Field label={t('company_listing_regulator_name')} value={form.regulatorName} placeholder={t('company_regulator_placeholder')} onChange={value => updateField('regulatorName', value)} />
          <Field label={t('company_listing_services')} value={form.services} placeholder={t('company_services_placeholder')} onChange={value => updateField('services', value)} span textarea />
          <CompanyImageUploadField key={`company-create-logo-${uploadResetVersion}`} mode="create" resetKey={uploadResetVersion} label={t('company_listing_logo_url')} value={form.logoUrl} onChange={value => updateField('logoUrl', value)} kind="logo" />
          <CompanyImageUploadField key={`company-create-cover-${uploadResetVersion}`} mode="create" resetKey={uploadResetVersion} label={t('company_listing_cover_url')} value={form.coverImageUrl} onChange={value => updateField('coverImageUrl', value)} kind="cover" />
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

function BackToServicesButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="company-submit-backbar">
      <Link className="company-submit-back" href={href} aria-label={label}>
        <ChevronRight size={18} />
        <span>{label}</span>
      </Link>
    </div>
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
  const { t } = useLanguage();
  return (
    <label className="submit-field">
      <span>{label}</span>
      <div className="phone-field">
        <select value={code} onChange={event => onCodeChange(event.target.value)} aria-label={`${label} — ${t('company_country_code')}`}>
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

function MapLocationField({
  mapsUrl,
  latitude,
  longitude,
  onMapsUrlChange,
  onLatitudeChange,
  onLongitudeChange,
  onOpenMaps,
}: {
  mapsUrl: string;
  latitude: string;
  longitude: string;
  onMapsUrlChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onOpenMaps: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="map-location-field span-2">
      <div className="map-location-head">
        <div>
          <span>{t('company_map_picker_title')}</span>
          <small>{t('company_map_picker_help')}</small>
        </div>
        <button type="button" onClick={onOpenMaps}>
          <ExternalLink size={16} />
          {t('company_open_google_maps')}
        </button>
      </div>
      <label>
        <span>{t('company_map_share_link')}</span>
        <div className="map-url-input">
          <MapPin size={17} />
          <input value={mapsUrl} onChange={event => onMapsUrlChange(event.target.value)} inputMode="url" dir="ltr" placeholder="https://maps.google.com/..." />
        </div>
      </label>
      <div className="map-coordinate-grid">
        <label>
          <span>{t('company_latitude')}</span>
          <input value={latitude} onChange={event => onLatitudeChange(event.target.value)} inputMode="decimal" dir="ltr" placeholder="29.3759" />
        </label>
        <label>
          <span>{t('company_longitude')}</span>
          <input value={longitude} onChange={event => onLongitudeChange(event.target.value)} inputMode="decimal" dir="ltr" placeholder="47.9774" />
        </label>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea = false, span = false, required = false, placeholder, listId, dir, inputMode }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; span?: boolean; required?: boolean; placeholder?: string; listId?: string; dir?: 'rtl' | 'ltr'; inputMode?: 'text' | 'url' | 'email' | 'numeric' | 'decimal' | 'tel' }) {
  const normalizeInput = (nextValue: string) => inputMode === 'numeric' || inputMode === 'decimal' || inputMode === 'tel'
    ? normalizeDigits(nextValue)
    : nextValue;

  return (
    <label className={span ? 'submit-field span-2' : 'submit-field'}>
      <span>{label} {required ? <b>*</b> : null}</span>
      {textarea ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} rows={4} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={event => onChange(normalizeInput(event.target.value))} placeholder={placeholder} list={listId} dir={dir} inputMode={inputMode} />
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
      .company-submit-backbar {
        display: flex;
        justify-content: flex-start;
        margin-bottom: 14px;
      }
      .company-submit-back {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: var(--radius-card);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--foreground);
        padding: 0 16px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        box-shadow: var(--shadow-xs);
        transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease, color .16s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .company-submit-back svg {
        color: var(--primary);
        flex: 0 0 auto;
      }
      .company-submit-back:hover,
      .company-submit-back:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
        border-color: var(--primary);
        background: var(--surface-hover);
        color: var(--foreground);
        box-shadow: var(--focus-shadow);
        transform: translateY(-1px);
      }
      .company-submit-back:active {
        transform: translateY(0) scale(.98);
      }
      .company-submit-hero,
      .company-submit-gate {
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        box-shadow: var(--shadow-card);
        padding: 24px;
      }
      .company-submit-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .company-submit-hero span {
        color: var(--primary);
        font-size: 12px;
        font-weight: 600;
      }
      .company-submit-hero h1,
      .company-submit-gate h1 {
        margin: 8px 0;
        color: var(--foreground);
        font-size: clamp(26px, 3vw, 38px);
        line-height: 1.2;
        font-weight: 700;
      }
      .company-submit-hero p,
      .company-submit-gate p {
        margin: 0;
        color: var(--foreground-muted);
        line-height: 1.8;
        font-weight: 400;
      }
      .company-submit-gate {
        text-align: center;
        max-width: 720px;
        margin: 0 auto;
      }
      .company-submit-gate svg {
        color: var(--primary);
      }
      .company-submit-form {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }
      .submit-section {
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface);
        padding: 18px;
        box-shadow: var(--shadow-card);
      }
      .submit-section h2 {
        margin: 0 0 14px;
        color: var(--foreground);
        font-size: 18px;
        font-weight: 600;
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
      .map-location-field {
        grid-column: 1 / -1;
        display: grid;
        gap: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 14px;
      }
      .map-location-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .map-location-head > div {
        display: grid;
        gap: 3px;
      }
      .map-location-field span,
      .map-location-head span {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
      }
      .map-location-head small {
        color: var(--foreground-muted);
        font-weight: 400;
        line-height: 1.6;
      }
      .map-location-head button {
        min-height: 44px;
        border: 1px solid var(--border);
        border-radius: var(--radius-control);
        background: var(--surface);
        color: var(--primary);
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font: 600 13px/1.25 var(--font-ui);
        cursor: pointer;
        box-shadow: var(--shadow-xs);
      }
      .map-location-head button:hover,
      .map-location-head button:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
        border-color: var(--focus-ring);
        background: var(--surface-hover);
      }
      .map-location-field label {
        display: grid;
        gap: 6px;
      }
      .map-url-input {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr);
        align-items: center;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-control);
        background: var(--control-background);
      }
      .map-url-input svg {
        justify-self: center;
        color: var(--primary);
      }
      .map-url-input input {
        border: 0;
        background: transparent;
      }
      .map-coordinate-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .submit-field span {
        color: var(--foreground-secondary);
        font-size: 13px;
        font-weight: 500;
      }
      .submit-field b {
        color: var(--danger);
      }
      .submit-field input,
      .submit-field textarea,
      .submit-field select {
        width: 100%;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-control);
        background: var(--control-background);
        color: var(--foreground);
        padding: 12px;
        font: 500 14px/1.5 var(--font-ui);
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
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 10px;
        display: grid;
        gap: 8px;
      }
      .image-preview img {
        width: 100%;
        max-height: 160px;
        border-radius: var(--radius-control);
        object-fit: contain;
        background: var(--surface);
      }
      .image-preview small {
        color: var(--accent-hover);
        font-weight: 500;
      }
      .image-preview-loader {
        min-height: 52px;
        border-radius: var(--radius-control);
        display: grid;
        place-items: center;
        color: var(--accent-hover);
        background: var(--accent-soft);
        font-size: 24px;
        font-weight: 600;
        letter-spacing: 2px;
      }
      .image-preview.invalid {
        border-color: color-mix(in srgb, var(--danger) 30%, transparent);
        background: var(--danger-soft);
      }
      .image-preview.invalid small {
        color: var(--danger);
      }
      .submit-message {
        margin-top: 14px;
        border-radius: var(--radius-card);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      .submit-message.ok {
        border: 1px solid color-mix(in srgb, var(--success) 28%, transparent);
        background: var(--success-soft);
        color: var(--success);
      }
      .submit-message.error {
        border: 1px solid color-mix(in srgb, var(--danger) 28%, transparent);
        background: var(--danger-soft);
        color: var(--danger);
      }
      .submit-sticky {
        position: sticky;
        bottom: 12px;
        z-index: 5;
        display: flex;
        justify-content: flex-end;
        padding: 12px;
        border-radius: var(--radius-card);
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface) 92%, transparent);
        backdrop-filter: blur(12px);
      }
      .submit-sticky button,
      .company-submit-gate button {
        border: 0;
        min-height: 48px;
        border-radius: var(--radius-control);
        padding: 0 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--primary-foreground);
        background: var(--primary);
        box-shadow: var(--shadow-sm);
        font: 600 14px/1.25 var(--font-ui);
        cursor: pointer;
      }
      .submit-sticky button:disabled,
      .company-submit-gate button:disabled {
        opacity: 0.72;
        cursor: not-allowed;
      }
      .submit-sticky button:focus-visible,
      .company-submit-gate button:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
        box-shadow: var(--focus-shadow);
      }
      @media (max-width: 700px) {
        .company-submit-backbar {
          display: block;
        }
        .company-submit-back {
          width: 100%;
        }
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
        .map-location-head {
          align-items: stretch;
          flex-direction: column;
        }
        .map-location-head button {
          width: 100%;
        }
        .map-coordinate-grid {
          grid-template-columns: 1fr;
        }
        .phone-field {
          grid-template-columns: 118px minmax(0, 1fr);
        }
        .submit-sticky button,
        .company-submit-gate button {
          width: 100%;
        }
      }
    `}</style>
  );
}
