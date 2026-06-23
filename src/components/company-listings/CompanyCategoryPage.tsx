'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Globe2,
  Mail,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { ActionButtonLink } from '@/components/company-listings/ActionButtonLink';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';
import type { TranslationKey } from '@/components/navigationConfig';
import { useLanguage } from '@/hooks/useLanguage';
import type { CompanyAnalyticsEventType, CompanyAnalyticsSummary } from '@/lib/companyAnalytics';
import { COMPANY_CATEGORY_CONFIGS, type CompanyCategory, type CompanyListing, type CompanyStatus } from '@/lib/companyListings';

type ApiResponse = {
  ok?: boolean;
  items?: CompanyListing[];
  stats?: {
    total: number;
    approved: number;
    pending: number;
    addedThisMonth: number;
  } | null;
  code?: string;
};

type CompanyCategoryPageProps = {
  category: CompanyCategory;
};

const statusOptions: Array<'all' | CompanyStatus> = ['all', 'approved', 'pending_review', 'inactive'];
const PAGE_SIZE = 12;

async function trackCompanyEvent(companyId: string, eventType: CompanyAnalyticsEventType) {
  try {
    const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType }),
      keepalive: true,
    });
    const payload = await response.json().catch(() => ({})) as { inserted?: boolean };
    return Boolean(response.ok && payload.inserted);
  } catch {
    return false;
  }
}

function uniqueValues(items: CompanyListing[], key: 'country' | 'city') {
  return Array.from(new Set(items.map(item => (item[key] ?? '').trim()).filter(Boolean))).sort();
}

function statusClass(status: CompanyStatus) {
  if (status === 'approved') return 'approved';
  if (status === 'inactive') return 'inactive';
  return 'pending';
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function CompanyCategoryPage({ category }: CompanyCategoryPageProps) {
  const config = COMPANY_CATEGORY_CONFIGS[category];
  const { t, lang, dir } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<CompanyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('all');
  const [city, setCity] = useState('all');
  const [status, setStatus] = useState<'all' | CompanyStatus>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [analyticsByCompany, setAnalyticsByCompany] = useState<Record<string, CompanyAnalyticsSummary>>({});

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/company-listings?category=${encodeURIComponent(category)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.code || 'LOAD_FAILED');
      setItems(payload.items ?? []);
    } catch {
      setItems([]);
      setError(t('company_listing_error_body'));
    } finally {
      setLoading(false);
    }
  }, [category, t]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const openCompanySubmit = useCallback(() => {
    router.push(`/company-listing/submit?category=${encodeURIComponent(category)}`);
  }, [category, router]);

  const countries = useMemo(() => uniqueValues(items, 'country'), [items]);
  const cities = useMemo(() => uniqueValues(items.filter(item => country === 'all' || item.country === country), 'city'), [country, items]);

  const filteredItems = useMemo(() => {
    const cleanQuery = normalizeText(query);
    return items.filter(item => {
      if (country !== 'all' && item.country !== country) return false;
      if (city !== 'all' && item.city !== city) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!cleanQuery) return true;
      const haystack = normalizeText(`${item.company_name} ${item.short_description ?? ''} ${item.country ?? ''} ${item.city ?? ''} ${(item.services ?? []).join(' ')}`);
      return haystack.includes(cleanQuery);
    });
  }, [city, country, items, query, status]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const visibleCompanyIds = useMemo(
    () => filteredItems.slice(0, visibleCount).map(item => item.id).join(','),
    [filteredItems, visibleCount],
  );
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const stats = [
    { label: t('company_listing_total'), value: filteredItems.length },
    { label: t('company_listing_approved'), value: filteredItems.filter(item => item.status === 'approved').length },
    { label: t('company_listing_pending'), value: filteredItems.filter(item => item.status === 'pending_review').length },
    { label: t('company_listing_added_month'), value: filteredItems.filter(item => item.created_at?.startsWith(monthPrefix)).length },
  ];

  useEffect(() => {
    if (!visibleCompanyIds) return;
    let cancelled = false;
    fetch(`/api/companies/analytics?ids=${encodeURIComponent(visibleCompanyIds)}`, { cache: 'no-store' })
      .then(response => response.json())
      .then((payload: { ok?: boolean; items?: Record<string, CompanyAnalyticsSummary> }) => {
        if (!cancelled && payload.ok && payload.items) {
          setAnalyticsByCompany(previous => ({ ...previous, ...payload.items }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visibleCompanyIds]);

  const incrementAnalytics = useCallback((companyId: string, eventType: CompanyAnalyticsEventType) => {
    setAnalyticsByCompany(previous => {
      const current = previous[companyId] ?? {
        companyId,
        cardViews: 0,
        profileViews: 0,
        websiteClicks: 0,
        contactClicks: 0,
        lastViewedAt: null,
      };
      const next = { ...current, lastViewedAt: new Date().toISOString() };
      if (eventType === 'company_card_view') next.cardViews += 1;
      if (eventType === 'company_profile_view') next.profileViews += 1;
      if (eventType === 'company_website_click') next.websiteClicks += 1;
      if (eventType === 'company_contact_click') next.contactClicks += 1;
      return { ...previous, [companyId]: next };
    });
  }, []);

  return (
    <CompanyDashboardFrame>
    <DashboardPageShell ariaLabel={t(config.titleKey)} className="company-directory-shell" contentClassName="company-directory-content">
      <section className="company-directory-hero">
        <div>
          <span className="company-directory-kicker">THE SFM</span>
          <h1>{t(config.titleKey)}</h1>
          <p>{t(config.descriptionKey)}</p>
        </div>
        <button type="button" className="company-primary-action" onClick={openCompanySubmit}>
          <Plus size={18} />
          {t('company_listing_add_company')}
        </button>
      </section>

      <section className="company-stats-grid" aria-label={t('company_listing_total')}>
        {stats.map(stat => (
          <article key={stat.label} className="company-stat-card">
            <span>{stat.label}</span>
            <strong>{new Intl.NumberFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US').format(stat.value)}</strong>
          </article>
        ))}
      </section>

      <section className="company-filter-bar">
        <label className="company-search">
          <Search size={17} />
          <input value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder={t('company_listing_search')} />
        </label>
        <CompanySelect label={t('company_listing_country')} value={country} onChange={value => { setCountry(value); setCity('all'); setVisibleCount(PAGE_SIZE); }} options={[['all', t('company_listing_all_countries')], ...countries.map(value => [value, value] as [string, string])]} />
        <CompanySelect label={t('company_listing_city')} value={city} onChange={value => { setCity(value); setVisibleCount(PAGE_SIZE); }} options={[['all', t('company_listing_all_cities')], ...cities.map(value => [value, value] as [string, string])]} />
        <CompanySelect
          label={t('company_listing_status')}
          value={status}
          onChange={value => { setStatus(value as 'all' | CompanyStatus); setVisibleCount(PAGE_SIZE); }}
          options={statusOptions.map(value => [value, value === 'all' ? t('company_listing_all_statuses') : t(`company_listing_status_${value}` as TranslationKey)] as [string, string])}
        />
      </section>

      {loading ? <CompanySkeleton /> : null}
      {!loading && error ? <CompanyError message={error} onRetry={loadListings} /> : null}
      {!loading && !error && filteredItems.length === 0 ? <CompanyEmpty onAdd={openCompanySubmit} /> : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <>
          <section className="company-grid" dir={dir}>
            {visibleItems.map(item => (
              <CompanyCard
                key={item.id}
                item={item}
                categoryLabel={t(COMPANY_CATEGORY_CONFIGS[item.category]?.labelKey ?? config.labelKey)}
                t={t}
                analytics={analyticsByCompany[item.id]}
                onTracked={incrementAnalytics}
              />
            ))}
          </section>
          {visibleCount < filteredItems.length ? (
            <div className="company-load-row">
              <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>{t('company_listing_load_more')}</button>
            </div>
          ) : null}
        </>
      ) : null}

      <style jsx>{`
        .company-directory-content {
          width: min(100%, 1280px);
        }
        .company-directory-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(11, 118, 224, 0.08), rgba(24, 212, 212, 0.10)),
            #ffffff;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
        }
        .company-directory-kicker {
          display: inline-flex;
          color: #0b76e0;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0;
          margin-bottom: 8px;
        }
        .company-directory-hero h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.2;
          font-weight: 950;
        }
        .company-directory-hero p {
          margin: 10px 0 0;
          max-width: 720px;
          color: #64748b;
          line-height: 1.8;
          font-size: 15px;
          font-weight: 750;
        }
        .company-primary-action,
        .company-load-row button,
        .company-empty button,
        .company-error button {
          border: 0;
          border-radius: 14px;
          min-height: 46px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #ffffff;
          background: linear-gradient(135deg, #0b76e0, #18d4d4);
          box-shadow: 0 14px 28px rgba(11, 118, 224, 0.20);
          font: 950 14px/1 Tajawal, Arial, sans-serif;
          cursor: pointer;
          white-space: nowrap;
        }
        .company-primary-action:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }
        .company-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }
        .company-stat-card {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #ffffff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }
        .company-stat-card span {
          color: #64748b;
          font-size: 13px;
          font-weight: 850;
        }
        .company-stat-card strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 26px;
          line-height: 1;
          font-weight: 950;
        }
        .company-filter-bar {
          display: grid;
          grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
        }
        .company-search {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 14px;
          padding: 0 12px;
          background: #f8fbff;
          color: #64748b;
        }
        .company-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font: 850 14px/1.4 Tajawal, Arial, sans-serif;
        }
        .company-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }
        .company-load-row {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        @media (max-width: 1024px) {
          .company-directory-hero {
            align-items: flex-start;
            flex-direction: column;
          }
          .company-stats-grid,
          .company-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .company-filter-bar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .company-directory-hero,
          .company-filter-bar {
            padding: 16px;
          }
          .company-stats-grid,
          .company-grid,
          .company-filter-bar {
            grid-template-columns: 1fr;
          }
          .company-primary-action {
            width: 100%;
          }
        }
      `}</style>
    </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}

function CompanySelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label className="company-select">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
      <style jsx>{`
        .company-select {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .company-select span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }
        .company-select select {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 14px;
          background: #f8fbff;
          color: #0f172a;
          padding: 0 12px;
          font: 850 14px/1.4 Tajawal, Arial, sans-serif;
          outline: 0;
        }
      `}</style>
    </label>
  );
}

function CompanyCard({
  item,
  categoryLabel,
  t,
  analytics,
  onTracked,
}: {
  item: CompanyListing;
  categoryLabel: string;
  t: (key: TranslationKey) => string;
  analytics?: CompanyAnalyticsSummary;
  onTracked: (companyId: string, eventType: CompanyAnalyticsEventType) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const trackedRef = useRef(false);
  const contactHref = item.email ? `mailto:${item.email}` : item.phone ? `tel:${item.phone}` : item.whatsapp ? `https://wa.me/${item.whatsapp.replace(/[^\d]/g, '')}` : '';
  const visibleViews = analytics?.profileViews ?? 0;

  useEffect(() => {
    if (trackedRef.current || typeof IntersectionObserver === 'undefined') return;
    const element = cardRef.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
        timer = setTimeout(() => {
          if (trackedRef.current) return;
          trackedRef.current = true;
          void trackCompanyEvent(item.id, 'company_card_view').then(inserted => {
            if (inserted) onTracked(item.id, 'company_card_view');
          });
          observer.disconnect();
        }, 1000);
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }, { threshold: [0, 0.5, 1] });
    observer.observe(element);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [item.id, onTracked]);

  const trackClick = (eventType: CompanyAnalyticsEventType) => {
    void trackCompanyEvent(item.id, eventType).then(inserted => {
      if (inserted) onTracked(item.id, eventType);
    });
  };

  return (
    <article className="company-card" ref={cardRef}>
      <div className="company-card-top">
        <div className="company-logo">
          <CompanyLogo item={item} />
        </div>
        <span className={`company-status ${statusClass(item.status)}`}>
          {item.status === 'approved' ? <CheckCircle2 size={13} /> : item.status === 'inactive' ? <ShieldCheck size={13} /> : <Clock3 size={13} />}
          {t(`company_listing_status_${item.status}` as TranslationKey)}
        </span>
      </div>
      <h2>{item.company_name}</h2>
      <div className="company-meta">
        <span>{categoryLabel}</span>
        {(item.country || item.city) ? <span><MapPin size={13} />{[item.country, item.city].filter(Boolean).join(' / ')}</span> : null}
        <span className="company-view-counter"><Eye size={13} />{new Intl.NumberFormat('ar-KW').format(visibleViews)} مشاهدة</span>
      </div>
      <p>{item.short_description || item.long_description || t('company_listing_info_note')}</p>
      <div className="company-actions">
        <ActionButtonLink
          className="company-card-action-main"
          href={`/companies/${item.id}`}
          icon={<Eye size={15} />}
          label={t('company_listing_view_details')}
          ariaLabel={`عرض تفاصيل الشركة ${item.company_name}`}
          variant="primary"
          onClick={() => trackClick('company_profile_view')}
        />
        {item.website_url ? (
          <ActionButtonLink
            href={item.website_url}
            icon={<Globe2 size={15} />}
            label={t('company_listing_visit_website')}
            ariaLabel={`زيارة موقع ${item.company_name}`}
            variant="secondary"
            external
            onClick={() => trackClick('company_website_click')}
          />
        ) : null}
        {contactHref ? (
          <ActionButtonLink
            href={contactHref}
            icon={<Mail size={15} />}
            label={t('company_listing_contact')}
            ariaLabel={`تواصل مع ${item.company_name}`}
            variant="secondary"
            external
            onClick={() => trackClick('company_contact_click')}
          />
        ) : null}
      </div>
      <style jsx>{`
        .company-card {
          min-width: 0;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
          padding: 16px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 250px;
        }
        .company-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .company-logo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(11, 118, 224, 0.10), rgba(24, 212, 212, 0.12));
          color: #0b76e0;
        }
        .company-logo :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .company-logo :global(.company-logo-initials) {
          font-size: 18px;
          font-weight: 950;
          color: #0b76e0;
        }
        .company-logo :global(.company-logo-initials.resolving) {
          color: rgba(11, 118, 224, 0.58);
        }
        .company-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }
        .company-status.approved {
          background: rgba(22, 163, 74, 0.10);
          color: #15803d;
        }
        .company-status.pending {
          background: rgba(245, 158, 11, 0.13);
          color: #b45309;
        }
        .company-status.inactive {
          background: rgba(100, 116, 139, 0.12);
          color: #475569;
        }
        h2 {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.35;
          font-weight: 950;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .company-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .company-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #475569;
          background: #f8fbff;
          border: 1px solid rgba(15, 23, 42, 0.07);
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 12px;
          font-weight: 850;
        }
        .company-meta .company-view-counter {
          color: #0b76e0;
          background: rgba(11, 118, 224, 0.08);
          border-color: rgba(11, 118, 224, 0.14);
        }
        p {
          margin: 0;
          color: #64748b;
          line-height: 1.7;
          font-size: 13px;
          font-weight: 750;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .company-actions {
          margin-top: auto;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .company-actions :global(.sfm-action-link) {
          min-height: 42px;
          border-radius: 12px;
          padding: 0 12px;
          font-size: 12px;
        }
        .company-actions :global(.company-card-action-main) {
          flex: 1 1 150px;
        }
        @media (max-width: 520px) {
          .company-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
          .company-actions :global(.sfm-action-link) {
            width: 100%;
            min-height: 44px;
          }
        }
      `}</style>
    </article>
  );
}

function CompanyLogo({ item }: { item: CompanyListing }) {
  const { imageUrl, loading, failed, setFailed } = useResolvedImageUrl(item.logo_url);

  if (imageUrl && !failed) {
    return <img src={imageUrl} alt={item.company_name ? `${item.company_name} logo` : ''} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
  }

  if (item.logo_url && loading) {
    return <span className="company-logo-initials resolving">{item.company_name?.trim()?.[0] ?? 'S'}</span>;
  }

  return <Building2 size={24} />;
}

function CompanySkeleton() {
  return (
    <section className="company-grid skeleton-grid" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => <div key={index} className="company-skeleton" />)}
      <style jsx>{`
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }
        .company-skeleton {
          min-height: 240px;
          border-radius: 18px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }
        @media (max-width: 1024px) {
          .skeleton-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .skeleton-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}

function CompanyEmpty({ onAdd }: { onAdd: () => void }) {
  const { t } = useLanguage();
  return (
    <section className="company-empty">
      <Building2 size={30} />
      <h2>{t('company_listing_empty_title')}</h2>
      <p>{t('company_listing_empty_body')}</p>
      <button type="button" className="company-add-btn" onClick={onAdd}><Plus size={16} /><span>{t('company_listing_add_company')}</span></button>
      <style jsx>{`
        .company-empty,
        .company-error {
          margin-top: 18px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(11, 118, 224, 0.05), rgba(24, 212, 212, 0.07)),
            #ffffff;
          padding: 26px 22px;
          text-align: center;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
        }
        .company-empty > svg {
          width: 54px;
          height: 54px;
          margin: 0 auto;
          border-radius: 18px;
          padding: 13px;
          background: rgba(11, 118, 224, 0.08);
          color: #0b76e0;
        }
        h2 {
          margin: 12px 0 8px;
          color: #0f172a;
          font-size: 22px;
          font-weight: 950;
        }
        p {
          margin: 0 auto 16px;
          max-width: 520px;
          color: #64748b;
          line-height: 1.8;
          font-weight: 750;
        }
        .company-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 180px;
          min-height: 48px;
          padding: 0 22px;
          border: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, #0b76e0, #18d4d4);
          color: #ffffff;
          font: 950 14px/1 Tajawal, Arial, sans-serif;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(11, 118, 224, 0.22);
          white-space: nowrap;
          transition: transform .15s, box-shadow .15s, filter .15s;
        }
        .company-add-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.06);
          box-shadow: 0 18px 36px rgba(11, 118, 224, 0.28);
        }
        .company-add-btn:active {
          transform: translateY(0) scale(.97);
        }
        @media (max-width: 640px) {
          .company-add-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}

function CompanyError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <section className="company-error">
      <h2>{t('company_listing_error_title')}</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>{t('company_listing_retry')}</button>
      <style jsx>{`
        .company-error {
          margin-top: 18px;
          border: 1px solid rgba(220, 38, 38, 0.16);
          border-radius: 20px;
          background: #ffffff;
          padding: 28px;
          text-align: center;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
        }
        h2 {
          margin: 0 0 8px;
          color: #991b1b;
          font-size: 22px;
          font-weight: 950;
        }
        p {
          margin: 0 auto 16px;
          max-width: 520px;
          color: #64748b;
          line-height: 1.8;
          font-weight: 750;
        }
      `}</style>
    </section>
  );
}
