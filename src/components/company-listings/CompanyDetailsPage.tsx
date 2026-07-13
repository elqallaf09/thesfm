'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  ExternalLink,
  FileText,
  Globe2,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Twitter,
  XCircle,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { ActionButtonLink } from '@/components/company-listings/ActionButtonLink';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { CompanyAnalyticsEventType, CompanyAnalyticsSummary } from '@/lib/companyAnalytics';
import { COMPANY_CATEGORY_CONFIGS, type CompanyListing, type CompanyStatus } from '@/lib/companyListings';
import { formatCompanySocialHandle, normalizeCompanySocialUrl } from '@/lib/companySocialLinks';
import { normalizeDigits } from '@/lib/locale';

type DetailPayload = {
  ok?: boolean;
  code?: string;
  item?: CompanyListing;
  viewer?: {
    isOwner?: boolean;
    isAdmin?: boolean;
    canReview?: boolean;
  };
};

type AnalyticsPayload = CompanyAnalyticsSummary & {
  ok?: boolean;
};

const STATUS_ICONS: Record<CompanyStatus, typeof ShieldCheck> = {
  approved: ShieldCheck,
  pending_review: Clock3,
  rejected: XCircle,
  needs_changes: ShieldAlert,
  inactive: Archive,
};

function isMissing(value?: string | number | null) {
  const text = String(value ?? '').trim();
  return !text || ['null', 'undefined', 'no', 'n/a', 'na', '-', 'for review'].includes(text.toLowerCase());
}

function displayValue(value?: string | number | null, fallback = '') {
  return isMissing(value) ? fallback : String(value).trim();
}

function formatDate(value?: string | null, locale = 'ar-KW-u-nu-latn', fallback = '') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function safeTel(value: string) {
  return normalizeDigits(value).replace(/[^\d+]/g, '');
}

function cleanWebsiteLabel(value?: string | null, fallback = '') {
  if (isMissing(value)) return '';
  try {
    const url = new URL(value!.startsWith('http') ? value! : `https://${value}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return fallback;
  }
}

function normalizeExternalUrl(value?: string | null) {
  if (isMissing(value)) return null;
  const text = value!.trim();
  if (/^(https?:|mailto:|tel:)/i.test(text)) return text;
  return `https://${text.replace(/^\/+/, '')}`;
}

function buildMapsHref(item: CompanyListing, location: string) {
  if (!isMissing(item.google_maps_url)) return normalizeExternalUrl(item.google_maps_url);
  if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  const query = [item.full_address, location].filter(value => !isMissing(value)).join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

async function trackCompanyEvent(companyId: string, eventType: CompanyAnalyticsEventType, accessToken?: string) {
  try {
    const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ eventType }),
      keepalive: true,
    });
    const payload = await response.json().catch(() => ({})) as { inserted?: boolean };
    return Boolean(response.ok && payload.inserted);
  } catch {
    return false;
  }
}

function shouldShowReviewNote(status: CompanyStatus) {
  return status === 'rejected' || status === 'needs_changes';
}

function ProfileCover({ item, alt }: { item: CompanyListing; alt: string }) {
  const { imageUrl, loading, failed, setFailed } = useResolvedImageUrl(item.cover_image_url);
  if (!item.cover_image_url || failed || loading || !imageUrl) return null;
  return (
    <Image
      src={imageUrl}
      alt={`${alt}: ${item.company_name}`}
      fill
      sizes="(max-width: 768px) 100vw, 1400px"
      className="hero-cover-image"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

function DetailTile({ icon, label, value, fallback }: { icon: ReactNode; label: string; value?: string | number | null; fallback?: string }) {
  return (
    <div className="detail-tile">
      <span className="detail-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{displayValue(value, fallback)}</strong>
      </div>
    </div>
  );
}

function ContactAction({
  href,
  icon,
  label,
  value,
  display,
  onClick,
}: {
  href?: string | null;
  icon: ReactNode;
  label: string;
  value?: string | null;
  display?: string;
  onClick?: () => void;
}) {
  if (!href || isMissing(value)) return null;
  return (
    <a className="contact-action" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} onClick={onClick}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir="ltr">{display || value}</strong>
      </div>
      {href.startsWith('http') ? <ExternalLink size={14} className="contact-external" aria-hidden="true" /> : null}
    </a>
  );
}

function HighlightCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="highlight-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SectionCard({ eyebrow, title, icon, children, className = '' }: { eyebrow: string; title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`profile-card ${className}`}>
      <div className="section-head">
        <span className="section-icon">{icon}</span>
        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CompanyDetailsPage({ id }: { id: string }) {
  const { t, dir, lang } = useLanguage();
  const { session } = useAuth();
  const [item, setItem] = useState<CompanyListing | null>(null);
  const [viewer, setViewer] = useState<DetailPayload['viewer']>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyStatus, setBusyStatus] = useState<CompanyStatus | null>(null);
  const [analytics, setAnalytics] = useState<CompanyAnalyticsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/company-listings/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    })
      .then(response => response.json().then((payload: DetailPayload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (cancelled) return;
        if (!response.ok || !payload.ok || !payload.item) {
          setError(payload.code === 'ACCESS_DENIED' ? t('company_access_denied') : t('company_listing_error_body'));
          return;
        }
        setItem(payload.item);
        setViewer(payload.viewer ?? {});
      })
      .catch(() => {
        if (!cancelled) setError(t('company_listing_error_body'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, session?.access_token, t]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/companies/${encodeURIComponent(id)}/analytics`, { cache: 'no-store' })
      .then(response => response.json())
      .then((payload: AnalyticsPayload) => {
        if (!cancelled && payload.ok) setAnalytics(payload);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!item?.id) return;
    void trackCompanyEvent(item.id, 'company_profile_view', session?.access_token).then(inserted => {
      if (!inserted) return;
      setAnalytics(previous => ({
        companyId: item.id,
        cardViews: previous?.cardViews ?? 0,
        profileViews: (previous?.profileViews ?? 0) + 1,
        websiteClicks: previous?.websiteClicks ?? 0,
        contactClicks: previous?.contactClicks ?? 0,
        lastViewedAt: new Date().toISOString(),
      }));
    });
  }, [item?.id, session?.access_token]);

  const categoryLabel = item ? t(COMPANY_CATEGORY_CONFIGS[item.category]?.labelKey ?? 'company_category_investment') : '';
  const status = item?.status ?? 'pending_review';
  const statusLabels: Record<CompanyStatus, string> = {
    approved: t('company_status_approved'),
    pending_review: t('company_status_pending'),
    rejected: t('company_status_rejected'),
    needs_changes: t('company_status_changes'),
    inactive: t('company_status_inactive'),
  };
  const StatusIcon = STATUS_ICONS[status] ?? Clock3;
  const location = [item?.country, item?.city].filter(Boolean).join(' / ');
  const services = useMemo(() => item?.services?.map(service => service.trim()).filter(Boolean) ?? [], [item?.services]);
  const coordinates = [item?.latitude, item?.longitude].filter(value => typeof value === 'number').join(', ');
  const backHref = item ? (COMPANY_CATEGORY_CONFIGS[item.category]?.path ?? '/services') : '/services';
  const websiteHref = item ? normalizeExternalUrl(item.website_url) : null;
  const instagramHref = item ? normalizeCompanySocialUrl(item.instagram_url, 'instagram') : null;
  const linkedinHref = item ? normalizeCompanySocialUrl(item.linkedin_url, 'linkedin') : null;
  const twitterHref = item ? normalizeCompanySocialUrl(item.twitter_url, 'twitter') : null;
  const mapsHref = item ? buildMapsHref(item, location) : null;
  const hasContact = Boolean(websiteHref || item?.email || item?.phone || instagramHref || linkedinHref || item?.whatsapp || item?.google_maps_url || item?.full_address || location);
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const canSeeDetailedAnalytics = Boolean(viewer?.canReview || viewer?.isOwner);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  function trackInteraction(eventType: CompanyAnalyticsEventType) {
    if (!item?.id) return;
    void trackCompanyEvent(item.id, eventType, session?.access_token).then(inserted => {
      if (!inserted) return;
      setAnalytics(previous => {
        const current = previous ?? {
          companyId: item.id,
          cardViews: 0,
          profileViews: 0,
          websiteClicks: 0,
          contactClicks: 0,
          lastViewedAt: null,
        };
        const next = { ...current, lastViewedAt: new Date().toISOString() };
        if (eventType === 'company_website_click') next.websiteClicks += 1;
        if (eventType === 'company_contact_click') next.contactClicks += 1;
        return next;
      });
    });
  }

  async function reviewCompany(nextStatus: CompanyStatus) {
    if (!item || busyStatus) return;
    setBusyStatus(nextStatus);
    const adminNotes = shouldShowReviewNote(nextStatus) ? item.admin_notes ?? null : null;
    try {
      const response = await fetch('/api/admin/companies/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: item.id, status: nextStatus, adminNotes }),
      });
      if (!response.ok) throw new Error('review failed');
      setItem(previous => previous ? {
        ...previous,
        status: nextStatus,
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
        approved_at: nextStatus === 'approved' ? new Date().toISOString() : previous.approved_at,
      } : previous);
    } catch {
      setError(t('company_update_status_error'));
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <CompanyDashboardFrame>
      <DashboardPageShell ariaLabel={item?.company_name ?? t('company_listing_view_details')} contentClassName="company-details-content">
        <WorkspacePageContainer variant="wide" className="company-details-layout">
        {loading ? <div className="details-skeleton" /> : null}

        {!loading && error && !item ? (
          <section className="details-state">
            <ShieldAlert size={36} />
            <h1>{t('company_listing_error_title')}</h1>
            <p>{error}</p>
            <ActionButtonLink
              href={backHref}
              icon={<ChevronRight size={18} />}
              label={t('company_back_services')}
              ariaLabel={t('company_back_services_aria')}
              variant="secondary"
            />
          </section>
        ) : null}

        {!loading && item ? (
          <article className="company-profile" dir={dir}>
            <div className="profile-back-row">
              <ActionButtonLink
                href={backHref}
                icon={<ChevronRight size={17} />}
                label={t('company_back_services')}
                ariaLabel={t('company_back_services_aria')}
                variant="secondary"
              />
            </div>

        <section className="company-hero-card">
          <ProfileCover item={item} alt={t('company_cover_alt')} />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-main">
            <AssetIdentity
              symbol={item.company_name}
              name={item.company_name}
              assetType="stock"
              logoUrl={item.logo_url}
              imageUrl={item.logo_url}
              size="lg"
              className="company-logo"
            />
            <div className="hero-copy">
                  <span className={`status-pill ${status}`}>
                    <StatusIcon size={15} />
                    {statusLabels[status] ?? status}
                  </span>
                  <h1>{item.company_name}</h1>
                  <div className="hero-meta">
                    <span><Building2 size={15} />{categoryLabel}</span>
                    {location ? <span><MapPin size={15} />{location}</span> : null}
                  </div>
                  <p>{displayValue(item.short_description, t('company_short_description_missing'))}</p>
                </div>
              </div>
              <div className="hero-actions">
                {websiteHref ? (
                  <ActionButtonLink
                    href={websiteHref}
                    icon={<Globe2 size={17} />}
                    label={t('company_visit_website')}
                    ariaLabel={`${t('company_visit_website')}: ${item.company_name}`}
                    variant="primary"
                    external
                    onClick={() => trackInteraction('company_website_click')}
                  />
                ) : null}
                {item.email ? (
                  <ActionButtonLink
                    href={`mailto:${item.email}`}
                    icon={<Mail size={17} />}
                    label={t('company_contact')}
                    ariaLabel={`${t('company_contact')}: ${item.company_name}`}
                    variant="ghost"
                    external
                    onClick={() => trackInteraction('company_contact_click')}
                  />
                ) : item.phone ? (
                  <ActionButtonLink
                    href={`tel:${safeTel(item.phone)}`}
                    icon={<Phone size={17} />}
                    label={t('company_contact')}
                    ariaLabel={`${t('company_contact')}: ${item.company_name}`}
                    variant="ghost"
                    external
                    onClick={() => trackInteraction('company_contact_click')}
                  />
                ) : item.whatsapp ? (
                  <ActionButtonLink
                    href={`https://wa.me/${safeTel(item.whatsapp).replace(/^\+/, '')}`}
                    icon={<MessageCircle size={17} />}
                    label={t('company_whatsapp')}
                    ariaLabel={`${t('company_contact')}: ${item.company_name} — ${t('company_whatsapp')}`}
                    variant="ghost"
                    external
                    onClick={() => trackInteraction('company_contact_click')}
                  />
                ) : null}
                <ActionButtonLink
                  href={backHref}
                  icon={<ArrowRight size={17} />}
                  label={t('company_back_services')}
                  ariaLabel={t('company_back_services_aria')}
                  variant="ghost"
                />
              </div>
            </section>

            <section className="highlight-row" aria-label={t('company_summary')}>
              <HighlightCard icon={<StatusIcon size={18} />} label={t('company_approval_status')} value={statusLabels[status] ?? status} />
              <HighlightCard icon={<CalendarDays size={18} />} label={t('company_founded_year')} value={displayValue(item.founded_year, t('company_not_added'))} />
              <HighlightCard icon={<MapPin size={18} />} label={t('company_location')} value={displayValue(location, t('company_unspecified'))} />
              <HighlightCard icon={<Building2 size={18} />} label={t('company_type')} value={categoryLabel} />
              <HighlightCard icon={<Eye size={18} />} label={t('company_page_visits')} value={numberFormat.format(analytics?.profileViews ?? 0)} />
            </section>

            <div className="company-layout">
              <main className="company-main-column">
                <SectionCard eyebrow={t('company_overview_eyebrow')} title={t('company_overview')} icon={<FileText size={19} />}>
                  <div className="overview-block">
                    <div>
                      <span>{t('company_short_description')}</span>
                      <p>{displayValue(item.short_description, t('company_short_description_missing'))}</p>
                    </div>
                    <div>
                      <span>{t('company_detailed_description')}</span>
                      <p>{displayValue(item.long_description, t('company_detailed_description_missing'))}</p>
                    </div>
                  </div>
                  <div className="details-grid">
                    <DetailTile icon={<Building2 size={17} />} label={t('company_type')} value={categoryLabel} />
                    <DetailTile icon={<MapPin size={17} />} label={t('company_country')} value={item.country} fallback={t('company_unspecified')} />
                    <DetailTile icon={<MapPin size={17} />} label={t('company_city')} value={item.city} fallback={t('company_unspecified')} />
                    <DetailTile icon={<MapPin size={17} />} label={t('company_full_address')} value={item.full_address} fallback={t('company_full_address_missing')} />
                    <DetailTile icon={<MapPin size={17} />} label={t('company_coordinates')} value={coordinates} fallback={t('company_coordinates_missing')} />
                    <DetailTile icon={<CalendarDays size={17} />} label={t('company_founded_year')} value={item.founded_year} fallback={t('company_founded_year_missing')} />
                    <DetailTile icon={<BadgeCheck size={17} />} label={t('company_license_number')} value={item.license_number} fallback={t('company_license_missing')} />
                    <DetailTile icon={<ShieldCheck size={17} />} label={t('company_regulator')} value={item.regulator_name} fallback={t('company_regulator_missing')} />
                  </div>
                </SectionCard>

                <SectionCard eyebrow={t('company_services_eyebrow')} title={t('company_services')} icon={<Sparkles size={19} />}>
                  {services.length ? (
                    <div className="services-grid">
                      {services.map((service, index) => (
                        <article key={`${service}-${index}`} className="service-card">
                          <span><Sparkles size={16} /></span>
                          <strong>{service}</strong>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-card">
                      <Sparkles size={22} />
                      <strong>{t('company_services_empty')}</strong>
                      <p>{t('company_services_empty_body')}</p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard eyebrow={t('company_regulatory_eyebrow')} title={t('company_regulatory')} icon={<BadgeCheck size={19} />}>
                  <div className="details-grid">
                    <DetailTile icon={<CalendarDays size={17} />} label={t('company_added_date')} value={formatDate(item.created_at, locale, t('company_unspecified'))} />
                    <DetailTile icon={<CalendarDays size={17} />} label={t('company_approval_date')} value={formatDate(item.approved_at, locale, t('company_unspecified'))} />
                    <DetailTile icon={<ShieldCheck size={17} />} label={t('company_approval_status')} value={statusLabels[status] ?? status} />
                    <DetailTile icon={<Sparkles size={17} />} label={t('company_featured')} value={item.is_featured ? t('company_yes') : t('company_no')} />
                  </div>
                </SectionCard>

                {(mapsHref || item.full_address || location) ? (
                  <SectionCard eyebrow={t('company_location_eyebrow')} title={t('company_location_address')} icon={<Navigation size={19} />}>
                    <div className="location-card">
                      <div>
                        <span>{t('company_address')}</span>
                        <strong>{displayValue(item.full_address || location, t('company_full_address_missing'))}</strong>
                      </div>
                      {mapsHref ? (
                        <ActionButtonLink
                          href={mapsHref}
                          icon={<MapPin size={17} />}
                          label={t('company_open_map')}
                          ariaLabel={`${t('company_open_map')}: ${item.company_name}`}
                          variant="secondary"
                          external
                        />
                      ) : null}
                    </div>
                  </SectionCard>
                ) : null}
              </main>

              <aside className="company-side-column">
                <SectionCard eyebrow={t('company_contact_eyebrow')} title={t('company_contact_details')} icon={<Phone size={19} />} className="side-card">
                  {hasContact ? (
                    <div
                      className="contact-list"
                      onClickCapture={event => {
                        const anchor = (event.target as HTMLElement).closest('a');
                        if (!anchor) return;
                        const href = anchor.getAttribute('href') || '';
                        trackInteraction(href.startsWith('http') && !href.includes('wa.me') ? 'company_website_click' : 'company_contact_click');
                      }}
                    >
                      <ContactAction href={websiteHref} icon={<Globe2 size={16} />} label={t('company_website')} value={item.website_url} display={cleanWebsiteLabel(item.website_url, t('company_visit_website'))} />
                      <ContactAction href={item.email ? `mailto:${item.email}` : null} icon={<Mail size={16} />} label={t('company_email')} value={item.email} />
                      <ContactAction href={item.phone ? `tel:${safeTel(item.phone)}` : null} icon={<Phone size={16} />} label={t('company_phone')} value={item.phone} />
                      <ContactAction href={item.whatsapp ? `https://wa.me/${safeTel(item.whatsapp).replace(/^\+/, '')}` : null} icon={<MessageCircle size={16} />} label={t('company_whatsapp')} value={item.whatsapp} />
                      <ContactAction href={instagramHref} icon={<Instagram size={16} />} label="Instagram" value={instagramHref} display={formatCompanySocialHandle(item.instagram_url, 'instagram')} />
                      <ContactAction href={linkedinHref} icon={<Linkedin size={16} />} label="LinkedIn" value={linkedinHref} display={formatCompanySocialHandle(item.linkedin_url, 'linkedin')} />
                      <ContactAction href={twitterHref} icon={<Twitter size={16} />} label="X / Twitter" value={twitterHref} display={formatCompanySocialHandle(item.twitter_url, 'twitter')} />
                      <ContactAction href={mapsHref} icon={<MapPin size={16} />} label={t('company_map_location')} value={item.full_address || location || item.google_maps_url} display={t('company_open_map')} />
                    </div>
                  ) : (
                    <div className="empty-card compact">
                      <Phone size={20} />
                      <p>{t('company_contact_missing')}</p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard eyebrow={t('company_analytics_eyebrow')} title={t('company_analytics')} icon={<BarChart3 size={19} />} className="side-card">
                  <div className="analytics-grid metric-grid">
                    <DetailTile icon={<Eye size={16} />} label={t('company_page_visits')} value={numberFormat.format(analytics?.profileViews ?? 0)} />
                    {canSeeDetailedAnalytics ? (
                      <>
                        <DetailTile icon={<Eye size={16} />} label={t('company_card_views')} value={numberFormat.format(analytics?.cardViews ?? 0)} />
                        <DetailTile icon={<Globe2 size={16} />} label={t('company_website_clicks')} value={numberFormat.format(analytics?.websiteClicks ?? 0)} />
                        <DetailTile icon={<Mail size={16} />} label={t('company_contact_clicks')} value={numberFormat.format(analytics?.contactClicks ?? 0)} />
                        <DetailTile icon={<CalendarDays size={16} />} label={t('company_last_viewed')} value={formatDate(analytics?.lastViewedAt, locale, t('company_unspecified'))} />
                      </>
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard eyebrow={t('company_status_eyebrow')} title={t('company_status_title')} icon={<StatusIcon size={19} />} className="side-card">
                  <div className={`status-card ${status}`}>
                    <StatusIcon size={24} />
                    <div>
                      <span>{t('company_current_status')}</span>
                      <strong>{statusLabels[status] ?? status}</strong>
                    </div>
                  </div>
                  <div className="status-list">
                    <DetailTile icon={<CalendarDays size={16} />} label={t('company_submitted_date')} value={formatDate(item.created_at, locale, t('company_unspecified'))} />
                    <DetailTile icon={<CalendarDays size={16} />} label={t('company_review_date')} value={formatDate(item.reviewed_at, locale, t('company_unspecified'))} />
                    <DetailTile icon={<CalendarDays size={16} />} label={t('company_approval_date')} value={formatDate(item.approved_at, locale, t('company_unspecified'))} />
                  </div>
                  <p className={`status-message ${status}`}>{
                    status === 'approved' ? t('company_status_message_approved')
                      : status === 'pending_review' ? t('company_status_message_pending')
                      : status === 'needs_changes' ? item.admin_notes?.trim() || t('company_status_message_changes')
                      : status === 'rejected' ? item.admin_notes?.trim() || t('company_status_message_rejected')
                      : t('company_status_message_inactive')
                  }</p>
                  {viewer?.canReview && shouldShowReviewNote(status) && item.admin_notes ? (
                    <p className="admin-note"><strong>{t('company_review_note')}</strong> {item.admin_notes}</p>
                  ) : null}
                </SectionCard>

                {viewer?.isOwner ? (
                  <SectionCard eyebrow={t('company_owner_eyebrow')} title={t('company_manage_mine')} icon={<Building2 size={19} />} className="side-card admin-card">
                    <ActionButtonLink
                      href="/profile/companies"
                      icon={<Edit3 size={16} />}
                      label={t('company_edit_details')}
                      ariaLabel={t('company_edit_details_aria')}
                      variant="secondary"
                    />
                    <ActionButtonLink
                      href={`/companies/${item.id}`}
                      icon={<Eye size={16} />}
                      label={t('company_public_page')}
                      ariaLabel={t('company_public_page_aria')}
                      variant="secondary"
                    />
                  </SectionCard>
                ) : null}

                {viewer?.canReview ? (
                  <SectionCard eyebrow={t('company_admin_eyebrow')} title={t('company_review_actions')} icon={<ShieldCheck size={19} />} className="side-card admin-card">
                    <button type="button" className="approve" onClick={() => void reviewCompany('approved')} disabled={Boolean(busyStatus)}>
                      <CheckCircle2 size={16} /> {t('company_approve_publish')}
                    </button>
                    <button type="button" className="needs" onClick={() => void reviewCompany('needs_changes')} disabled={Boolean(busyStatus)}>
                      <Edit3 size={16} /> {t('company_request_changes')}
                    </button>
                    <button type="button" className="reject" onClick={() => void reviewCompany('rejected')} disabled={Boolean(busyStatus)}>
                      <XCircle size={16} /> {t('company_reject')}
                    </button>
                    <button type="button" className="archive" onClick={() => void reviewCompany('inactive')} disabled={Boolean(busyStatus)}>
                      <Trash2 size={16} /> {t('company_archive')}
                    </button>
                    <Link href="/sfm-admin-control/companies"><Edit3 size={16} /> {t('company_edit_details')}</Link>
                  </SectionCard>
                ) : null}
              </aside>
            </div>
          </article>
        ) : null}

        <style jsx>{`
          .company-details-content {
            width: 100%;
            max-width: none;
            padding: 0;
          }
          .details-skeleton,
          .details-state {
            border: 1px solid var(--border);
            border-radius: var(--radius-panel);
            background: var(--surface);
            box-shadow: var(--shadow-card);
          }
          .details-skeleton {
            min-height: 320px;
            background: var(--skeleton-gradient);
            background-size: 400% 100%;
            animation: shimmer 1.4s ease infinite;
          }
          @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
          .details-state {
            padding: 28px;
            text-align: center;
            display: grid;
            justify-items: center;
            gap: 12px;
          }
          .details-state h1 {
            margin: 0;
            color: var(--foreground);
            font-size: 28px;
            font-weight: 700;
          }
          .details-state p {
            margin: 0;
            color: var(--foreground-muted);
            font-weight: 400;
          }
          .details-state a {
            min-height: 44px;
            border-radius: var(--radius-control);
            padding: 0 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--primary-foreground);
            background: var(--primary);
            text-decoration: none;
            font-weight: 600;
          }
          .company-profile {
            display: grid;
            gap: 18px;
            min-width: 0;
          }
          .company-hero-card {
            border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
            border-radius: var(--radius-panel);
            padding: 24px;
            background: var(--hero-gradient);
            box-shadow: var(--shadow-md);
            color: var(--hero-foreground);
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 20px;
            align-items: end;
            overflow: hidden;
          }
          .hero-main {
            display: flex;
            align-items: center;
            gap: 18px;
            min-width: 0;
          }
          .company-logo {
            width: 98px;
            height: 98px;
            border-radius: var(--radius-panel);
            border: 1px solid color-mix(in srgb, var(--hero-foreground) 30%, transparent);
            background: color-mix(in srgb, var(--surface) 12%, transparent);
            display: grid;
            place-items: center;
            overflow: hidden;
            flex: 0 0 auto;
            box-shadow: var(--shadow-sm);
          }
          .company-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .hero-copy {
            min-width: 0;
          }
          .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            border-radius: var(--radius-pill);
            padding: 7px 11px;
            background: color-mix(in srgb, var(--surface) 14%, transparent);
            color: var(--hero-foreground);
            font-size: 12px;
            font-weight: 600;
          }
          .status-pill.approved,
          .status-card.approved { color: var(--success); background: var(--success-soft); }
          .status-pill.pending_review,
          .status-card.pending_review { color: var(--warning); background: var(--warning-soft); }
          .status-pill.rejected,
          .status-card.rejected { color: var(--danger); background: var(--danger-soft); }
          .status-pill.needs_changes,
          .status-card.needs_changes { color: var(--info); background: var(--info-soft); }
          .status-pill.inactive,
          .status-card.inactive { color: var(--foreground-secondary); background: var(--surface-muted); }
          .hero-copy h1 {
            margin: 12px 0 8px;
            font-size: clamp(32px, 4vw, 56px);
            line-height: 1.08;
            font-weight: 700;
            overflow-wrap: anywhere;
          }
          .hero-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .hero-meta span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: var(--radius-pill);
            padding: 7px 10px;
            background: color-mix(in srgb, var(--surface) 12%, transparent);
            color: var(--hero-foreground-muted);
            font-size: 13px;
            font-weight: 500;
          }
          .hero-copy p {
            margin: 14px 0 0;
            color: var(--hero-foreground-muted);
            line-height: 1.8;
            font-weight: 400;
            max-width: 760px;
          }
          .hero-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 10px;
          }
          .hero-actions :global(.sfm-action-link),
          .details-state :global(.sfm-action-link) {
            min-height: 46px;
          }
          .review-warning {
            border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
            border-radius: var(--radius-card);
            background: var(--warning-soft);
            color: var(--warning);
            padding: 16px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .review-warning strong {
            display: block;
            font-weight: 600;
          }
          .review-warning p {
            margin: 6px 0 0;
            line-height: 1.7;
            font-weight: 400;
          }
          .company-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 370px);
            gap: 18px;
            align-items: start;
          }
          .company-main-column,
          .company-side-column {
            display: grid;
            gap: 18px;
            min-width: 0;
          }
          .profile-card {
            border: 1px solid var(--border);
            border-radius: var(--radius-panel);
            background: var(--surface);
            box-shadow: var(--shadow-card);
            padding: 18px;
            min-width: 0;
          }
          .section-head {
            display: flex;
            gap: 11px;
            align-items: center;
            margin-bottom: 16px;
          }
          .section-icon {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-control);
            display: grid;
            place-items: center;
            background: var(--accent-soft);
            color: var(--accent);
            flex: 0 0 auto;
          }
          .section-head small {
            display: block;
            color: var(--accent);
            font-size: 12px;
            font-weight: 600;
          }
          .section-head h2 {
            margin: 2px 0 0;
            color: var(--foreground);
            font-size: 22px;
            font-weight: 600;
          }
          .overview-block {
            display: grid;
            gap: 12px;
            margin-bottom: 14px;
          }
          .overview-block div {
            border-radius: var(--radius-card);
            border: 1px solid var(--border);
            background: var(--surface-muted);
            padding: 14px;
          }
          .overview-block span {
            color: var(--accent);
            font-size: 12px;
            font-weight: 600;
          }
          .overview-block p {
            margin: 7px 0 0;
            color: var(--foreground);
            line-height: 1.9;
            font-weight: 400;
          }
          .details-grid,
          .status-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .status-list {
            grid-template-columns: 1fr;
          }
          .detail-tile {
            min-width: 0;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
            padding: 12px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }
          .detail-icon {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-control);
            display: grid;
            place-items: center;
            background: var(--primary-soft);
            color: var(--primary);
            flex: 0 0 auto;
          }
          .detail-tile span:not(.detail-icon),
          .contact-action small,
          .status-card span {
            display: block;
            color: var(--foreground-muted);
            font-size: 12px;
            font-weight: 500;
          }
          .detail-tile strong,
          .contact-action strong,
          .status-card strong {
            display: block;
            margin-top: 4px;
            color: var(--foreground);
            font-size: 15px;
            font-weight: 600;
            overflow-wrap: anywhere;
          }
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 10px;
          }
          .service-card {
            min-height: 86px;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--primary-soft);
            padding: 14px;
            display: grid;
            align-content: start;
            gap: 10px;
          }
          .service-card span {
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border-radius: var(--radius-control);
            background: var(--surface);
            color: var(--accent);
          }
          .service-card strong {
            color: var(--foreground);
            font-weight: 600;
            overflow-wrap: anywhere;
          }
          .empty-card {
            min-height: 120px;
            border: 1px dashed var(--border-strong);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
            color: var(--foreground-muted);
            display: grid;
            place-items: center;
            gap: 8px;
            padding: 18px;
            text-align: center;
            font-weight: 400;
          }
          .empty-card.compact {
            min-height: 96px;
          }
          .contact-list,
          .analytics-grid,
          .admin-card {
            display: grid;
            gap: 10px;
          }
          .contact-action {
            min-height: 52px;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
            color: var(--foreground);
            padding: 10px 12px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            text-decoration: none;
            font-weight: 500;
          }
          .contact-action > span {
            width: 34px;
            height: 34px;
            border-radius: var(--radius-control);
            display: grid;
            place-items: center;
            background: var(--accent-soft);
            color: var(--accent);
          }
          .contact-action.static {
            pointer-events: none;
          }
          .status-card {
            border-radius: var(--radius-card);
            padding: 14px;
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
          }
          .status-message {
            margin: 12px 0 0;
            border-radius: var(--radius-control);
            padding: 12px;
            line-height: 1.8;
            font-weight: 500;
          }
          .status-message.approved {
            color: var(--success);
            background: var(--success-soft);
          }
          .status-message.pending_review {
            color: var(--warning);
            background: var(--warning-soft);
          }
          .status-message.rejected {
            color: var(--danger);
            background: var(--danger-soft);
          }
          .status-message.needs_changes {
            color: var(--info);
            background: var(--info-soft);
          }
          .status-message.inactive {
            color: var(--foreground-secondary);
            background: var(--surface-muted);
          }
          .admin-note {
            margin: 12px 0 0;
            border-radius: var(--radius-control);
            background: var(--warning-soft);
            color: var(--warning);
            padding: 12px;
            line-height: 1.7;
            font-weight: 500;
          }
          .admin-card button,
          .admin-card a {
            min-height: 46px;
            border-radius: var(--radius-card);
            border: 1px solid var(--border);
            background: var(--surface-muted);
            color: var(--foreground);
            padding: 0 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-decoration: none;
            cursor: pointer;
            font: 600 14px/1.25 var(--font-ui);
          }
          .admin-card button:disabled {
            opacity: .68;
            cursor: not-allowed;
          }
          .admin-card .approve {
            background: var(--success-soft);
            color: var(--success);
          }
          .admin-card .needs {
            background: var(--info-soft);
            color: var(--info);
          }
          .admin-card .reject,
          .admin-card .archive {
            background: var(--danger-soft);
            color: var(--danger);
          }
          @media (max-width: 980px) {
            .company-hero-card,
            .company-layout {
              grid-template-columns: 1fr;
            }
            .hero-actions {
              justify-content: stretch;
            }
            .hero-actions :global(.sfm-action-link) {
              flex: 1 1 170px;
            }
          }
          @media (max-width: 640px) {
            .company-hero-card,
            .profile-card {
              border-radius: var(--radius-card);
              padding: 16px;
            }
            .hero-main {
              align-items: flex-start;
              flex-direction: column;
            }
            .company-logo {
              width: 78px;
              height: 78px;
              border-radius: var(--radius-card);
            }
            .hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }
            .hero-actions :global(.sfm-action-link) {
              width: 100%;
            }
            .details-grid {
              grid-template-columns: 1fr;
            }
          }
          :global(.company-details-content) {
            width: 100% !important;
            max-width: none;
            margin-inline: 0;
            padding-inline: 0;
          }

          .company-profile {
            gap: 22px;
          }

          .profile-back-row {
            display: flex;
            justify-content: flex-start;
          }

          .profile-back-row :global(.sfm-action-link) {
            min-height: 44px;
            border-radius: var(--radius-pill);
            background: var(--surface);
            color: var(--primary-hover);
            border-color: var(--border);
            box-shadow: var(--shadow-xs);
          }

          .company-hero-card {
            position: relative;
            isolation: isolate;
            min-height: 300px;
            grid-template-columns: minmax(0, 1fr) minmax(280px, auto);
            align-items: center;
            border-radius: var(--radius-panel);
            padding: clamp(22px, 3vw, 34px);
            border-color: color-mix(in srgb, var(--accent) 34%, transparent);
          }

          .company-hero-card :global(.hero-cover-image) {
            object-fit: cover;
            opacity: 0.26;
            z-index: 0;
          }

          .hero-shade {
            position: absolute;
            inset: 0;
            z-index: 1;
            background: color-mix(in srgb, var(--hero-gradient-start) 72%, transparent);
            pointer-events: none;
          }

          .hero-main,
          .hero-actions {
            position: relative;
            z-index: 2;
          }

          .hero-main {
            gap: 22px;
          }

          .company-logo {
            width: clamp(88px, 8vw, 112px);
            height: clamp(88px, 8vw, 112px);
            border-radius: var(--radius-panel);
            background: color-mix(in srgb, var(--surface) 16%, transparent);
            backdrop-filter: blur(10px);
          }

          .company-logo :global(img) {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 10px;
            background: var(--surface);
          }

          .hero-copy h1 {
            max-width: 860px;
            font-size: clamp(34px, 3.8vw, 58px);
            letter-spacing: 0;
          }

          .hero-copy p {
            max-width: 780px;
            font-size: 15px;
            color: var(--hero-foreground-muted);
          }

          .hero-actions {
            align-self: stretch;
            align-content: center;
            justify-content: flex-end;
            min-width: 280px;
          }

          .hero-actions :global(.sfm-action-link) {
            min-width: 150px;
            min-height: 48px;
          }

          .highlight-row {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
          }

          :global(.highlight-card) {
            min-width: 0;
            min-height: 92px;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface);
            box-shadow: var(--shadow-card);
            padding: 16px;
            display: flex;
            gap: 12px;
            align-items: center;
          }

          :global(.highlight-card > span) {
            width: 40px;
            height: 40px;
            flex: 0 0 auto;
            border-radius: var(--radius-control);
            display: grid;
            place-items: center;
            color: var(--primary);
            background: var(--primary-soft);
          }

          :global(.highlight-card small) {
            display: block;
            color: var(--foreground-muted);
            font-size: 12px;
            font-weight: 500;
          }

          :global(.highlight-card strong) {
            display: block;
            margin-top: 4px;
            color: var(--foreground);
            font-size: 16px;
            font-weight: 600;
            overflow-wrap: anywhere;
          }

          .company-layout {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 380px);
            gap: 22px;
          }

          .company-main-column,
          .company-side-column {
            gap: 22px;
          }

          :global(.profile-card) {
            border: 1px solid var(--border);
            border-radius: var(--radius-panel);
            background: var(--surface);
            box-shadow: var(--shadow-card);
            padding: 22px;
            min-width: 0;
          }

          :global(.side-card) {
            box-shadow: var(--shadow-xs);
          }

          :global(.section-head) {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 18px;
          }

          :global(.section-icon) {
            width: 42px;
            height: 42px;
            border-radius: var(--radius-card);
            display: grid;
            place-items: center;
            color: var(--accent);
            background: var(--accent-soft);
            flex: 0 0 auto;
          }

          :global(.section-head small) {
            display: block;
            color: var(--accent);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.01em;
          }

          :global(.section-head h2) {
            margin: 3px 0 0;
            color: var(--foreground);
            font-size: 23px;
            line-height: 1.2;
            font-weight: 600;
          }

          .overview-block {
            grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
            gap: 14px;
          }

          .overview-block div {
            background: var(--surface-muted);
            padding: 16px;
          }

          .overview-block p {
            font-size: 15px;
            line-height: 1.9;
          }

          :global(.details-grid) {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          :global(.status-list) {
            display: grid;
            gap: 10px;
          }

          :global(.detail-tile) {
            min-width: 0;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
            padding: 13px;
            display: flex;
            gap: 11px;
            align-items: flex-start;
          }

          :global(.detail-icon) {
            width: 34px;
            height: 34px;
            border-radius: var(--radius-control);
            display: grid;
            place-items: center;
            background: var(--primary-soft);
            color: var(--primary);
            flex: 0 0 auto;
          }

          :global(.detail-tile span:not(.detail-icon)),
          :global(.contact-action small),
          :global(.status-card span) {
            display: block;
            color: var(--foreground-muted);
            font-size: 12px;
            font-weight: 500;
          }

          :global(.detail-tile strong),
          :global(.contact-action strong),
          :global(.status-card strong) {
            display: block;
            margin-top: 4px;
            color: var(--foreground);
            font-size: 15px;
            font-weight: 600;
            overflow-wrap: anywhere;
          }

          .services-grid {
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 12px;
          }

          .service-card {
            min-height: 96px;
            border-radius: var(--radius-card);
            border-color: var(--border);
            transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          }

          .service-card:hover {
            transform: translateY(-2px);
            border-color: var(--accent);
            box-shadow: var(--shadow-sm);
          }

          .empty-card {
            min-height: 112px;
            place-items: center;
            align-content: center;
          }

          .empty-card strong {
            color: var(--foreground);
            font-size: 16px;
            font-weight: 600;
          }

          .empty-card p {
            margin: 0;
          }

          :global(.contact-list),
          :global(.analytics-grid),
          :global(.admin-card) {
            display: grid;
            gap: 10px;
          }

          :global(.contact-action) {
            min-height: 58px;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
            color: var(--foreground);
            padding: 11px 12px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
            text-decoration: none;
            font-weight: 500;
            transition: transform .16s ease, border-color .16s ease, background .16s ease;
          }

          :global(.contact-action:hover),
          :global(.contact-action:focus-visible) {
            outline: 2px solid var(--focus-ring);
            outline-offset: 2px;
            transform: translateY(-1px);
            border-color: var(--focus-ring);
            background: var(--surface-hover);
          }

          :global(.contact-action > span) {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-control);
            display: grid;
            place-items: center;
            background: var(--accent-soft);
            color: var(--accent);
          }

          :global(.contact-external) {
            color: var(--foreground-subtle);
          }

          :global(.metric-grid) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          :global(.metric-grid .detail-tile:first-child) {
            grid-column: 1 / -1;
            background: var(--primary-soft);
          }

          :global(.metric-grid .detail-tile:first-child strong) {
            font-size: 24px;
          }

          :global(.status-card) {
            border-radius: var(--radius-card);
            padding: 15px;
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
          }

          :global(.status-message) {
            margin: 12px 0 0;
            border-radius: var(--radius-card);
            padding: 13px;
            line-height: 1.8;
            font-weight: 500;
          }

          :global(.admin-note) {
            margin: 12px 0 0;
            border-radius: var(--radius-card);
            background: var(--warning-soft);
            color: var(--warning);
            padding: 12px;
            line-height: 1.7;
            font-weight: 500;
          }

          :global(.admin-card button),
          :global(.admin-card a),
          :global(.admin-card .sfm-action-link) {
            width: 100%;
            min-height: 46px;
            border-radius: var(--radius-card);
          }

          .location-card {
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
            padding: 16px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
          }

          .location-card span {
            display: block;
            color: var(--foreground-muted);
            font-size: 12px;
            font-weight: 500;
          }

          .location-card strong {
            display: block;
            margin-top: 5px;
            color: var(--foreground);
            font-size: 16px;
            font-weight: 600;
            overflow-wrap: anywhere;
          }

          @media (max-width: 1180px) {
            .highlight-row {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .company-layout {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 820px) {
            .company-hero-card {
              grid-template-columns: 1fr;
              min-height: 0;
            }

            .hero-actions {
              min-width: 0;
              display: grid;
              grid-template-columns: 1fr;
              width: 100%;
            }

            .highlight-row {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .overview-block,
            :global(.details-grid),
            .location-card {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 560px) {
            .company-hero-card,
            :global(.profile-card) {
              border-radius: var(--radius-panel);
              padding: 16px;
            }

            .hero-main {
              align-items: flex-start;
              flex-direction: column;
            }

            .company-logo {
              width: 82px;
              height: 82px;
              border-radius: var(--radius-panel);
            }

            .hero-copy h1 {
              font-size: 34px;
            }

            .highlight-row,
            :global(.metric-grid) {
              grid-template-columns: 1fr;
            }
          }

        `}</style>
        </WorkspacePageContainer>
      </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
