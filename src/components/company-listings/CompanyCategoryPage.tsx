'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FilterX,
  Grid2X2,
  Globe2,
  List,
  Mail,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { ActionButtonLink } from '@/components/company-listings/ActionButtonLink';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import type { TranslationKey } from '@/components/navigationConfig';
import { useLanguage } from '@/hooks/useLanguage';
import type { CompanyAnalyticsEventType, CompanyAnalyticsSummary } from '@/lib/companyAnalytics';
import { COMPANY_CATEGORY_CONFIGS, type CompanyCategory, type CompanyListing, type CompanyStatus } from '@/lib/companyListings';
import { normalizeDigits } from '@/lib/locale';

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

type SortMode = 'newest' | 'oldest' | 'name_asc' | 'approved_first';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 12;
const VIEW_MODE_STORAGE_KEY = 'the-sfm-company-directory-view-mode';
const statusOptions: Array<'all' | CompanyStatus> = ['all', 'approved', 'pending_review', 'needs_changes', 'rejected', 'inactive'];
const sortOptions: SortMode[] = ['approved_first', 'newest', 'oldest', 'name_asc'];

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
  if (status === 'rejected') return 'rejected';
  if (status === 'needs_changes') return 'needs-changes';
  if (status === 'inactive') return 'inactive';
  return 'pending';
}

function statusIcon(status: CompanyStatus) {
  if (status === 'approved') return <CheckCircle2 size={14} />;
  if (status === 'rejected') return <XCircle size={14} />;
  if (status === 'needs_changes') return <ShieldCheck size={14} />;
  if (status === 'inactive') return <ShieldCheck size={14} />;
  return <Clock3 size={14} />;
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function cleanDisplayText(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const normalized = text.toLowerCase();
  if (['for review', 'no', 'n/a', 'null', 'undefined', '-', '—'].includes(normalized)) return '';
  return text;
}

function getCompanyDescription(item: CompanyListing, fallback: string) {
  return cleanDisplayText(item.short_description) || cleanDisplayText(item.long_description) || fallback;
}

function localeForLang(lang: string) {
  if (lang === 'ar') return 'ar-KW-u-nu-latn';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

function formatNumber(value: number, lang: string) {
  return new Intl.NumberFormat(localeForLang(lang)).format(value);
}

function formatCompanyCount(value: number, lang: string) {
  const formatted = formatNumber(value, lang);
  if (lang === 'ar') return value === 1 ? '1 شركة' : `${formatted} شركات`;
  if (lang === 'fr') return value === 1 ? '1 société' : `${formatted} sociétés`;
  return value === 1 ? '1 company' : `${formatted} companies`;
}

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeForLang(lang), { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function sortCompanies(items: CompanyListing[], sortMode: SortMode) {
  return [...items].sort((a, b) => {
    if (sortMode === 'approved_first') {
      const approvedDelta = Number(b.status === 'approved') - Number(a.status === 'approved');
      if (approvedDelta !== 0) return approvedDelta;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    }

    if (sortMode === 'oldest') {
      return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    }

    if (sortMode === 'name_asc') {
      return a.company_name.localeCompare(b.company_name, ['ar', 'en', 'fr'], { sensitivity: 'base' });
    }

    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
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
  const [sortMode, setSortMode] = useState<SortMode>('approved_first');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${VIEW_MODE_STORAGE_KEY}:${category}`);
      if (stored === 'grid' || stored === 'list') setViewMode(stored);
    } catch {
      // View mode is a progressive preference; storage failures should not block the page.
    }
  }, [category]);

  const openCompanySubmit = useCallback(() => {
    router.push(`/company-listing/submit?category=${encodeURIComponent(category)}`);
  }, [category, router]);

  const updateViewMode = useCallback((nextMode: ViewMode) => {
    setViewMode(nextMode);
    try {
      window.localStorage.setItem(`${VIEW_MODE_STORAGE_KEY}:${category}`, nextMode);
    } catch {
      // Ignore localStorage failures; the selected mode still works for this session.
    }
  }, [category]);

  const countries = useMemo(() => uniqueValues(items, 'country'), [items]);
  const cities = useMemo(() => uniqueValues(items.filter(item => country === 'all' || item.country === country), 'city'), [country, items]);

  const filteredItems = useMemo(() => {
    const cleanQuery = normalizeText(query);
    return items.filter(item => {
      if (country !== 'all' && item.country !== country) return false;
      if (city !== 'all' && item.city !== city) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!cleanQuery) return true;
      const haystack = normalizeText(`${item.company_name} ${item.short_description ?? ''} ${item.long_description ?? ''} ${item.country ?? ''} ${item.city ?? ''} ${(item.services ?? []).join(' ')}`);
      return haystack.includes(cleanQuery);
    });
  }, [city, country, items, query, status]);

  const sortedItems = useMemo(() => sortCompanies(filteredItems, sortMode), [filteredItems, sortMode]);
  const visibleItems = sortedItems.slice(0, visibleCount);
  const visibleCompanyIds = useMemo(
    () => sortedItems.slice(0, visibleCount).map(item => item.id).join(','),
    [sortedItems, visibleCount],
  );
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const stats = [
    { label: t('company_listing_total'), value: items.length, icon: <Building2 size={18} />, tone: 'total' },
    { label: t('company_listing_approved'), value: items.filter(item => item.status === 'approved').length, icon: <BadgeCheck size={18} />, tone: 'approved' },
    { label: t('company_listing_pending'), value: items.filter(item => item.status === 'pending_review').length, icon: <Clock3 size={18} />, tone: 'pending' },
    { label: t('company_listing_added_month'), value: items.filter(item => item.created_at?.startsWith(monthPrefix)).length, icon: <CalendarDays size={18} />, tone: 'month' },
  ];
  const hasActiveFilters = Boolean(query.trim()) || country !== 'all' || city !== 'all' || status !== 'all';
  const resultCountLabel = formatCompanyCount(filteredItems.length, lang);

  const clearFilters = useCallback(() => {
    setQuery('');
    setCountry('all');
    setCity('all');
    setStatus('all');
    setVisibleCount(PAGE_SIZE);
  }, []);

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
        <WorkspacePageContainer variant="wide" className="company-directory-layout">
        <div className="company-directory-page" dir={dir}>
          <section className="company-directory-hero">
            <div className="company-hero-copy">
              <span className="company-directory-kicker"><Sparkles size={13} />THE SFM</span>
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
              <article key={stat.label} className={`company-stat-card ${stat.tone}`}>
                <span className="company-stat-icon">{stat.icon}</span>
                <span className="company-stat-label">{stat.label}</span>
                {loading ? <span className="company-stat-skeleton" aria-hidden="true" /> : <strong>{formatNumber(stat.value, lang)}</strong>}
              </article>
            ))}
          </section>

          <section className="company-filter-panel" aria-label={t('company_listing_active_filters')}>
            <div className="company-filter-heading">
              <SlidersHorizontal size={18} />
              <div>
                <h2>{t('company_listing_results_count')}</h2>
                <p>{t(config.descriptionKey)}</p>
              </div>
            </div>
            <div className="company-filter-bar">
              <label className="company-search">
                <span>{t('company_listing_search')}</span>
                <div className="company-search-control">
                  <Search size={17} />
                  <input value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder={t('company_listing_search')} suppressHydrationWarning />
                </div>
              </label>
              <CompanySelect label={t('company_listing_country')} value={country} onChange={value => { setCountry(value); setCity('all'); setVisibleCount(PAGE_SIZE); }} options={[['all', t('company_listing_all_countries')], ...countries.map(value => [value, value] as [string, string])]} />
              <CompanySelect label={t('company_listing_city')} value={city} onChange={value => { setCity(value); setVisibleCount(PAGE_SIZE); }} options={[['all', t('company_listing_all_cities')], ...cities.map(value => [value, value] as [string, string])]} />
              <CompanySelect
                label={t('company_listing_status')}
                value={status}
                onChange={value => { setStatus(value as 'all' | CompanyStatus); setVisibleCount(PAGE_SIZE); }}
                options={statusOptions.map(value => [value, value === 'all' ? t('company_listing_all_statuses') : t(`company_listing_status_${value}` as TranslationKey)] as [string, string])}
              />
              {hasActiveFilters ? (
                <button type="button" className="company-clear-filters" onClick={clearFilters}>
                  <FilterX size={16} />
                  {t('company_listing_clear_filters')}
                </button>
              ) : null}
            </div>
          </section>

          {loading ? <CompanySkeleton /> : null}
          {!loading && error ? <CompanyError message={error} onRetry={loadListings} /> : null}

          {!loading && !error ? (
            <section className="company-results-panel">
              <div className="company-results-toolbar">
                <div className="company-results-title">
                  <span>{t('company_listing_available_companies')}</span>
                  <h2>{resultCountLabel}</h2>
                  {hasActiveFilters ? <p>{t('company_listing_active_filters')}</p> : null}
                </div>
                <div className="company-results-controls">
                  <CompanySelect
                    compact
                    label={t('company_listing_sort')}
                    value={sortMode}
                    onChange={value => { setSortMode(value as SortMode); setVisibleCount(PAGE_SIZE); }}
                    options={sortOptions.map(value => [value, t(`company_listing_sort_${value}` as TranslationKey)] as [string, string])}
                  />
                  <div className="company-view-toggle" role="group" aria-label={t('company_listing_view_grid')}>
                    <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => updateViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label={t('company_listing_view_grid')}>
                      <Grid2X2 size={16} />
                    </button>
                    <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => updateViewMode('list')} aria-pressed={viewMode === 'list'} aria-label={t('company_listing_view_list')}>
                      <List size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {sortedItems.length === 0 ? (
                <CompanyEmpty filtered={hasActiveFilters && items.length > 0} onAdd={openCompanySubmit} onClear={clearFilters} />
              ) : (
                <>
                  <section className={`company-grid ${viewMode === 'list' ? 'company-grid-list' : ''} ${visibleItems.length === 1 ? 'company-grid-single' : ''}`} dir={dir}>
                    {visibleItems.map(item => (
                      <CompanyCard
                        key={item.id}
                        item={item}
                        categoryLabel={t(COMPANY_CATEGORY_CONFIGS[item.category]?.labelKey ?? config.labelKey)}
                        t={t}
                        lang={lang}
                        layout={viewMode}
                        analytics={analyticsByCompany[item.id]}
                        onTracked={incrementAnalytics}
                      />
                    ))}
                  </section>
                  {visibleCount < sortedItems.length ? (
                    <div className="company-load-row">
                      <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>{t('company_listing_load_more')}</button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}
        </div>

        <style jsx>{`
          :global(.company-directory-content) {
            width: 100%;
            max-width: none;
            padding: 0;
          }
          .company-directory-page {
            display: grid;
            gap: 20px;
            color: var(--foreground);
          }
          .company-directory-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 24px;
            padding: 24px 26px;
            border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
            border-radius: var(--radius-panel);
            background: var(--hero-gradient);
            box-shadow: var(--shadow-md);
          }
          .company-hero-copy {
            min-width: 0;
          }
          .company-directory-kicker {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: var(--hero-foreground-muted);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0;
            margin-bottom: 8px;
          }
          .company-directory-hero h1 {
            margin: 0;
            color: var(--hero-foreground);
            font-size: clamp(28px, 3vw, 40px);
            line-height: 1.18;
            font-weight: 700;
          }
          .company-directory-hero p {
            margin: 10px 0 0;
            max-width: 760px;
            color: var(--hero-foreground-muted);
            line-height: 1.8;
            font-size: 15.5px;
            font-weight: 400;
          }
          .company-primary-action,
          .company-load-row button,
          .company-empty button,
          .company-error button {
            border: 0;
            border-radius: var(--radius-control);
            min-height: 46px;
            padding: 0 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--primary-foreground);
            background: var(--primary);
            box-shadow: var(--shadow-sm);
            font: 600 14px/1.25 var(--font-ui);
            cursor: pointer;
            white-space: nowrap;
            transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
          }
          .company-primary-action:hover,
          .company-load-row button:hover,
          .company-empty button:hover,
          .company-error button:hover {
            transform: translateY(-1px);
            background: var(--primary-hover);
          }
          .company-primary-action:focus-visible,
          .company-load-row button:focus-visible,
          .company-empty button:focus-visible,
          .company-error button:focus-visible {
            outline: 2px solid var(--focus-ring);
            outline-offset: 2px;
            box-shadow: var(--focus-shadow);
          }
          .company-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }
          .company-stat-card {
            position: relative;
            overflow: hidden;
            border: 1px solid var(--border);
            background: var(--surface);
            border-radius: var(--radius-card);
            padding: 18px;
            box-shadow: var(--shadow-card);
            min-height: 132px;
          }
          .company-stat-card::after {
            content: "";
            position: absolute;
            inset-block: 0;
            inset-inline-end: 0;
            width: 4px;
            background: var(--primary);
          }
          .company-stat-card.approved::after { background: var(--success); }
          .company-stat-card.pending::after { background: var(--warning); }
          .company-stat-card.month::after { background: var(--accent); }
          .company-stat-icon {
            width: 38px;
            height: 38px;
            border-radius: var(--radius-control);
            display: inline-grid;
            place-items: center;
            color: var(--primary);
            background: var(--primary-soft);
            margin-bottom: 12px;
          }
          .company-stat-card.approved .company-stat-icon {
            color: var(--success);
            background: var(--success-soft);
          }
          .company-stat-card.pending .company-stat-icon {
            color: var(--warning);
            background: var(--warning-soft);
          }
          .company-stat-card.month .company-stat-icon {
            color: var(--accent);
            background: var(--accent-soft);
          }
          .company-stat-label {
            display: block;
            color: var(--foreground-muted);
            font-size: 13px;
            font-weight: 500;
          }
          .company-stat-card strong {
            display: block;
            margin-top: 8px;
            color: var(--foreground);
            font-size: 30px;
            line-height: 1;
            font-family: var(--font-data);
            font-weight: 600;
          }
          .company-stat-skeleton {
            display: block;
            width: 72px;
            height: 26px;
            margin-top: 10px;
            border-radius: var(--radius-pill);
            background: var(--skeleton-gradient);
            background-size: 220% 100%;
            animation: shimmer 1.4s ease infinite;
          }
          .company-filter-panel,
          .company-results-panel {
            border: 1px solid var(--border);
            border-radius: var(--radius-panel);
            background: var(--surface);
            box-shadow: var(--shadow-card);
          }
          .company-filter-panel {
            padding: 16px;
          }
          .company-filter-heading {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
            color: var(--primary);
          }
          .company-filter-heading h2 {
            margin: 0;
            color: var(--foreground);
            font-size: 18px;
            font-weight: 600;
          }
          .company-filter-heading p {
            margin: 4px 0 0;
            color: var(--foreground-muted);
            font-size: 13px;
            line-height: 1.6;
            font-weight: 400;
          }
          .company-filter-bar {
            display: grid;
            grid-template-columns: minmax(260px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto;
            gap: 12px;
            align-items: end;
          }
          .company-search {
            min-width: 0;
            display: grid;
            gap: 5px;
          }
          .company-search > span {
            color: var(--foreground-muted);
            font-size: 12px;
            font-weight: 500;
          }
          .company-search-control {
            min-height: 46px;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-control);
            padding: 0 12px;
            background: var(--control-background);
            color: var(--foreground-muted);
          }
          .company-search-control:focus-within {
            border-color: var(--focus-ring);
            box-shadow: var(--focus-shadow);
          }
          .company-search-control input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: var(--foreground);
            font: 500 14px/1.4 var(--font-ui);
          }
          .company-clear-filters {
            min-height: 46px;
            border: 1px solid var(--border);
            border-radius: var(--radius-control);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0 14px;
            background: var(--primary-soft);
            color: var(--primary-hover);
            font: 600 13px/1.25 var(--font-ui);
            cursor: pointer;
            white-space: nowrap;
          }
          .company-results-panel {
            padding: 18px;
          }
          .company-results-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
          }
          .company-results-title span {
            display: inline-flex;
            color: var(--primary);
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .company-results-title h2 {
            margin: 0;
            color: var(--foreground);
            font-size: 24px;
            line-height: 1.2;
            font-weight: 600;
          }
          .company-results-title p {
            margin: 6px 0 0;
            color: var(--foreground-muted);
            font-size: 13px;
            font-weight: 400;
          }
          .company-results-controls {
            display: flex;
            align-items: end;
            gap: 10px;
          }
          .company-view-toggle {
            min-height: 46px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px;
            border: 1px solid var(--border);
            border-radius: var(--radius-control);
            background: var(--surface-muted);
          }
          .company-view-toggle button {
            width: 38px;
            height: 36px;
            border: 0;
            border-radius: var(--radius-sm);
            display: inline-grid;
            place-items: center;
            color: var(--foreground-muted);
            background: transparent;
            cursor: pointer;
          }
          .company-view-toggle button.active {
            color: var(--primary-foreground);
            background: var(--primary);
            box-shadow: var(--shadow-xs);
          }
          .company-view-toggle button:focus-visible,
          .company-clear-filters:focus-visible {
            outline: 3px solid var(--focus-ring);
            outline-offset: 2px;
          }
          .company-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
            margin-top: 18px;
            align-items: stretch;
          }
          .company-grid-single {
            grid-template-columns: minmax(0, min(100%, 860px));
            justify-content: center;
          }
          .company-grid-list {
            grid-template-columns: 1fr;
          }
          .company-load-row {
            display: flex;
            justify-content: center;
            margin-top: 20px;
          }
          @media (max-width: 1024px) {
            .company-directory-hero,
            .company-results-toolbar {
              align-items: flex-start;
              grid-template-columns: 1fr;
              flex-direction: column;
            }
            .company-stats-grid,
            .company-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .company-filter-bar {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .company-results-controls {
              width: 100%;
              justify-content: space-between;
            }
          }
          @media (max-width: 640px) {
            .company-directory-hero,
            .company-filter-panel,
            .company-results-panel {
              padding: 16px;
            }
            .company-stats-grid,
            .company-grid,
            .company-filter-bar {
              grid-template-columns: 1fr;
            }
            .company-results-controls {
              display: grid;
              grid-template-columns: 1fr;
            }
            .company-view-toggle {
              width: 100%;
              justify-content: center;
            }
            .company-primary-action {
              width: 100%;
            }
          }
          @keyframes shimmer {
            0% { background-position: 100% 0; }
            100% { background-position: 0 0; }
          }
        `}</style>
        </WorkspacePageContainer>
      </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}

function CompanySelect({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className={`company-select ${compact ? 'compact' : ''}`}>
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
          width: 100%;
        }
        .company-select span {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 500;
        }
        .company-select select {
          width: 100%;
          min-height: 46px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-control);
          background: var(--control-background);
          color: var(--foreground);
          padding: 0 12px;
          font: 500 14px/1.4 var(--font-ui);
          outline: 0;
        }
        .company-select.compact {
          min-width: 210px;
        }
        .company-select.compact select {
          background: var(--surface);
        }
        .company-select select:focus-visible {
          border-color: var(--focus-ring);
          box-shadow: var(--focus-shadow);
        }
      `}</style>
    </label>
  );
}

function CompanyCard({
  item,
  categoryLabel,
  t,
  lang,
  layout,
  analytics,
  onTracked,
}: {
  item: CompanyListing;
  categoryLabel: string;
  t: (key: TranslationKey) => string;
  lang: string;
  layout: ViewMode;
  analytics?: CompanyAnalyticsSummary;
  onTracked: (companyId: string, eventType: CompanyAnalyticsEventType) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const trackedRef = useRef(false);
  const contactHref = item.email ? `mailto:${item.email}` : item.phone ? `tel:${normalizeDigits(item.phone).replace(/[^\d+]/g, '')}` : item.whatsapp ? `https://wa.me/${normalizeDigits(item.whatsapp).replace(/[^\d]/g, '')}` : '';
  const visibleViews = analytics?.profileViews ?? 0;
  const location = [cleanDisplayText(item.country), cleanDisplayText(item.city)].filter(Boolean).join(' / ');
  const description = getCompanyDescription(item, t('company_listing_no_description'));
  const serviceChips = (item.services ?? []).map(cleanDisplayText).filter(Boolean).slice(0, 3);
  const addedDate = formatDate(item.created_at, lang);
  const statusLabel = t(`company_listing_status_${item.status}` as TranslationKey);

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
    <article className={`company-card company-card-${layout}`} ref={cardRef}>
      <div className="company-card-body">
        <div className="company-card-header">
          <AssetIdentity
            symbol={item.company_name}
            name={item.company_name}
            assetType="stock"
            logoUrl={item.logo_url}
            imageUrl={item.logo_url}
            size="md"
            className="company-logo"
          />
          <div className="company-title">
            <div className="company-title-row">
              <h2>{cleanDisplayText(item.company_name) || 'THE SFM'}</h2>
              {item.status === 'approved' ? <span className="company-verified" aria-label={statusLabel}><BadgeCheck size={15} /></span> : null}
            </div>
            <div className="company-subtitle">
              <span>{categoryLabel}</span>
              {location ? <span><MapPin size={13} />{location}</span> : null}
            </div>
          </div>
        </div>

        <div className="company-card-badges">
          <span className={`company-status ${statusClass(item.status)}`}>
            {statusIcon(item.status)}
            {statusLabel}
          </span>
          <span className="company-view-counter"><Eye size={13} />{formatNumber(visibleViews, lang)} {t('company_listing_views')}</span>
          {addedDate ? <span className="company-added"><CalendarDays size={13} />{addedDate}</span> : null}
        </div>

        <p>{description}</p>

        {serviceChips.length > 0 ? (
          <div className="company-services" aria-label={t('company_listing_services')}>
            {serviceChips.map(service => <span key={service}>{service}</span>)}
          </div>
        ) : null}
      </div>

      <div className="company-actions">
        <ActionButtonLink
          className="company-card-action-main"
          href={`/companies/${item.id}`}
          icon={<Eye size={15} />}
          label={t('company_listing_view_details')}
          ariaLabel={`${t('company_listing_view_details')} ${item.company_name}`}
          variant="primary"
          onClick={() => trackClick('company_profile_view')}
        />
        {item.website_url ? (
          <ActionButtonLink
            href={item.website_url}
            icon={<Globe2 size={15} />}
            label={t('company_listing_visit_website')}
            ariaLabel={`${t('company_listing_visit_website')} ${item.company_name}`}
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
            ariaLabel={`${t('company_listing_contact')} ${item.company_name}`}
            variant="secondary"
            external
            onClick={() => trackClick('company_contact_click')}
          />
        ) : null}
      </div>
      <style jsx>{`
        .company-card {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          padding: 18px;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 310px;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .company-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
          box-shadow: var(--shadow-md);
        }
        .company-card-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 13px;
          flex: 1;
        }
        .company-card-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .company-logo {
          flex: 0 0 auto;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-card);
          display: grid;
          place-items: center;
          overflow: hidden;
          background: var(--primary-soft);
          color: var(--primary);
          border: 1px solid var(--border);
        }
        .company-logo :global(img) {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .company-title {
          min-width: 0;
          flex: 1;
          display: grid;
          gap: 8px;
        }
        .company-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .company-verified {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-pill);
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--success);
          background: var(--success-soft);
        }
        .company-subtitle,
        .company-card-badges,
        .company-services {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .company-subtitle span,
        .company-card-badges span,
        .company-services span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: var(--radius-pill);
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 500;
          color: var(--foreground-secondary);
          background: var(--surface-muted);
          border: 1px solid var(--border);
        }
        .company-status {
          font-weight: 600 !important;
          white-space: nowrap;
        }
        .company-status.approved {
          background: var(--success-soft);
          color: var(--success);
        }
        .company-status.pending {
          background: var(--warning-soft);
          color: var(--warning);
        }
        .company-status.rejected {
          background: var(--danger-soft);
          color: var(--danger);
        }
        .company-status.needs-changes {
          background: var(--info-soft);
          color: var(--info);
        }
        .company-status.inactive {
          background: var(--surface-muted);
          color: var(--foreground-secondary);
        }
        .company-view-counter {
          color: var(--primary) !important;
          background: var(--primary-soft) !important;
          border-color: var(--border) !important;
        }
        .company-added {
          color: var(--foreground-muted) !important;
        }
        h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 20px;
          line-height: 1.35;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        p {
          margin: 0;
          color: var(--foreground-secondary);
          line-height: 1.7;
          font-size: 14px;
          font-weight: 400;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .company-services span {
          color: var(--accent-hover);
          background: var(--accent-soft);
          border-color: color-mix(in srgb, var(--accent) 28%, transparent);
        }
        .company-actions {
          margin-top: auto;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .company-actions :global(.sfm-action-link) {
          min-height: 44px;
          border-radius: var(--radius-control);
          padding: 0 14px;
          font-size: 13px;
        }
        .company-actions :global(.company-card-action-main) {
          flex: 1 1 170px;
        }
        .company-card-list {
          min-height: auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
        }
        .company-card-list .company-actions {
          min-width: 320px;
          justify-content: flex-end;
        }
        @media (max-width: 900px) {
          .company-card-list {
            grid-template-columns: 1fr;
          }
          .company-card-list .company-actions {
            min-width: 0;
            justify-content: stretch;
          }
        }
        @media (max-width: 520px) {
          .company-card {
            padding: 16px;
          }
          .company-logo {
            width: 58px;
            height: 58px;
          }
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

function CompanySkeleton() {
  return (
    <section className="company-grid skeleton-grid" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => <div key={index} className="company-skeleton" />)}
      <style jsx>{`
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 0;
        }
        .company-skeleton {
          min-height: 310px;
          border-radius: var(--radius-card);
          background: var(--skeleton-gradient);
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

function CompanyEmpty({ filtered, onAdd, onClear }: { filtered?: boolean; onAdd: () => void; onClear?: () => void }) {
  const { t } = useLanguage();
  return (
    <section className="company-empty">
      <Building2 size={30} />
      <h2>{filtered ? t('company_listing_no_results_title') : t('company_listing_empty_title')}</h2>
      <p>{filtered ? t('company_listing_no_results_body') : t('company_listing_empty_body')}</p>
      <div className="company-empty-actions">
        {filtered && onClear ? (
          <button type="button" className="company-add-btn secondary" onClick={onClear}><FilterX size={16} /><span>{t('company_listing_clear_filters')}</span></button>
        ) : null}
        {!filtered ? (
          <button type="button" className="company-add-btn" onClick={onAdd}><Plus size={16} /><span>{t('company_listing_add_company')}</span></button>
        ) : null}
      </div>
      <style jsx>{`
        .company-empty {
          margin-top: 18px;
          border: 1px solid var(--border);
          border-radius: var(--radius-panel);
          background: var(--surface);
          padding: 28px 22px;
          text-align: center;
          box-shadow: var(--shadow-card);
        }
        .company-empty > svg {
          width: 56px;
          height: 56px;
          margin: 0 auto;
          border-radius: var(--radius-card);
          padding: 13px;
          background: var(--primary-soft);
          color: var(--primary);
        }
        h2 {
          margin: 12px 0 8px;
          color: var(--foreground);
          font-size: 22px;
          font-weight: 600;
        }
        p {
          margin: 0 auto 16px;
          max-width: 520px;
          color: var(--foreground-muted);
          line-height: 1.8;
          font-weight: 400;
        }
        .company-empty-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
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
          border-radius: var(--radius-control);
          background: var(--primary);
          color: var(--primary-foreground);
          font: 600 14px/1.25 var(--font-ui);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          white-space: nowrap;
          transition: transform .15s, box-shadow .15s, filter .15s;
        }
        .company-add-btn.secondary {
          border: 1px solid var(--border);
          color: var(--primary-hover);
          background: var(--primary-soft);
          box-shadow: none;
        }
        .company-add-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.06);
          box-shadow: var(--shadow-md);
        }
        .company-add-btn:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          box-shadow: var(--focus-shadow);
        }
        .company-add-btn:active {
          transform: translateY(0) scale(.97);
        }
        @media (max-width: 640px) {
          .company-empty-actions,
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
          border: 1px solid color-mix(in srgb, var(--danger) 28%, transparent);
          border-radius: var(--radius-card);
          background: var(--surface);
          padding: 28px;
          text-align: center;
          box-shadow: var(--shadow-card);
        }
        h2 {
          margin: 0 0 8px;
          color: var(--danger);
          font-size: 22px;
          font-weight: 600;
        }
        p {
          margin: 0 auto 16px;
          max-width: 520px;
          color: var(--foreground-muted);
          line-height: 1.8;
          font-weight: 400;
        }
        button {
          border: 0;
          border-radius: var(--radius-control);
          min-height: 46px;
          padding: 0 18px;
          color: var(--primary-foreground);
          background: var(--primary);
          font: 600 14px/1.25 var(--font-ui);
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
