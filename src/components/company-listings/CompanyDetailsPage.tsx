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
import { ActionButtonLink } from '@/components/company-listings/ActionButtonLink';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { CompanyAnalyticsEventType, CompanyAnalyticsSummary } from '@/lib/companyAnalytics';
import { COMPANY_CATEGORY_CONFIGS, type CompanyListing, type CompanyStatus } from '@/lib/companyListings';
import { formatCompanySocialHandle, normalizeCompanySocialUrl } from '@/lib/companySocialLinks';

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

const STATUS_LABELS: Record<CompanyStatus, string> = {
  approved: 'معتمدة',
  pending_review: 'قيد المراجعة',
  rejected: 'مرفوضة',
  needs_changes: 'تحتاج تعديل',
  inactive: 'غير نشطة',
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

function displayValue(value?: string | number | null, fallback = 'غير محدد') {
  return isMissing(value) ? fallback : String(value).trim();
}

function formatDate(value?: string | null, locale = 'ar-KW') {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function safeTel(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function cleanWebsiteLabel(value?: string | null) {
  if (isMissing(value)) return '';
  try {
    const url = new URL(value!.startsWith('http') ? value! : `https://${value}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'زيارة الموقع';
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

function statusMessage(status: CompanyStatus, adminNotes?: string | null) {
  if (status === 'approved') return 'تم اعتماد الشركة ونشرها في دليل THE SFM.';
  if (status === 'pending_review') return 'بانتظار مراجعة الإدارة.';
  if (status === 'needs_changes') return adminNotes?.trim() || 'تحتاج بيانات الشركة إلى تعديل قبل الاعتماد.';
  if (status === 'rejected') return adminNotes?.trim() || 'تم رفض طلب الشركة.';
  if (status === 'inactive') return 'الشركة غير نشطة حالياً.';
  return '';
}

function shouldShowReviewNote(status: CompanyStatus) {
  return status === 'rejected' || status === 'needs_changes';
}

function ProfileCover({ item }: { item: CompanyListing }) {
  const { imageUrl, loading, failed, setFailed } = useResolvedImageUrl(item.cover_image_url);
  if (!item.cover_image_url || failed || loading || !imageUrl) return null;
  return (
    <Image
      src={imageUrl}
      alt={`صورة غلاف ${item.company_name}`}
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
          setError(payload.code === 'ACCESS_DENIED' ? 'هذه الشركة غير منشورة حالياً.' : t('company_listing_error_body'));
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
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
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
      setError('تعذر تحديث حالة الشركة حالياً.');
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <CompanyDashboardFrame>
      <DashboardPageShell ariaLabel={item?.company_name ?? t('company_listing_view_details')} contentClassName="company-details-content">
        {loading ? <div className="details-skeleton" /> : null}

        {!loading && error && !item ? (
          <section className="details-state">
            <ShieldAlert size={36} />
            <h1>{t('company_listing_error_title')}</h1>
            <p>{error}</p>
            <ActionButtonLink
              href={backHref}
              icon={<ChevronRight size={18} />}
              label="العودة إلى الخدمات"
              ariaLabel="العودة إلى صفحة الخدمات"
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
                label="العودة إلى الخدمات"
                ariaLabel="العودة إلى صفحة الخدمات"
                variant="secondary"
              />
            </div>

        <section className="company-hero-card">
          <ProfileCover item={item} />
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
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <h1>{item.company_name}</h1>
                  <div className="hero-meta">
                    <span><Building2 size={15} />{categoryLabel}</span>
                    {location ? <span><MapPin size={15} />{location}</span> : null}
                  </div>
                  <p>{displayValue(item.short_description, 'لم تتم إضافة نبذة مختصرة بعد.')}</p>
                </div>
              </div>
              <div className="hero-actions">
                {websiteHref ? (
                  <ActionButtonLink
                    href={websiteHref}
                    icon={<Globe2 size={17} />}
                    label="زيارة الموقع"
                    ariaLabel={`زيارة موقع ${item.company_name}`}
                    variant="primary"
                    external
                    onClick={() => trackInteraction('company_website_click')}
                  />
                ) : null}
                {item.email ? (
                  <ActionButtonLink
                    href={`mailto:${item.email}`}
                    icon={<Mail size={17} />}
                    label="تواصل"
                    ariaLabel={`تواصل مع ${item.company_name}`}
                    variant="ghost"
                    external
                    onClick={() => trackInteraction('company_contact_click')}
                  />
                ) : item.phone ? (
                  <ActionButtonLink
                    href={`tel:${safeTel(item.phone)}`}
                    icon={<Phone size={17} />}
                    label="تواصل"
                    ariaLabel={`تواصل مع ${item.company_name}`}
                    variant="ghost"
                    external
                    onClick={() => trackInteraction('company_contact_click')}
                  />
                ) : item.whatsapp ? (
                  <ActionButtonLink
                    href={`https://wa.me/${safeTel(item.whatsapp).replace(/^\+/, '')}`}
                    icon={<MessageCircle size={17} />}
                    label="واتساب"
                    ariaLabel={`التواصل مع ${item.company_name} عبر واتساب`}
                    variant="ghost"
                    external
                    onClick={() => trackInteraction('company_contact_click')}
                  />
                ) : null}
                <ActionButtonLink
                  href={backHref}
                  icon={<ArrowRight size={17} />}
                  label="العودة إلى الخدمات"
                  ariaLabel="العودة إلى صفحة الخدمات"
                  variant="ghost"
                />
              </div>
            </section>

            <section className="highlight-row" aria-label="ملخص الشركة">
              <HighlightCard icon={<StatusIcon size={18} />} label="حالة الاعتماد" value={STATUS_LABELS[status] ?? status} />
              <HighlightCard icon={<CalendarDays size={18} />} label="سنة التأسيس" value={displayValue(item.founded_year, 'غير مضاف')} />
              <HighlightCard icon={<MapPin size={18} />} label="الموقع" value={displayValue(location, 'غير محدد')} />
              <HighlightCard icon={<Building2 size={18} />} label="نوع الشركة" value={categoryLabel} />
              <HighlightCard icon={<Eye size={18} />} label="زيارات الصفحة" value={numberFormat.format(analytics?.profileViews ?? 0)} />
            </section>

            <div className="company-layout">
              <main className="company-main-column">
                <SectionCard eyebrow="Overview" title="نبذة عن الشركة" icon={<FileText size={19} />}>
                  <div className="overview-block">
                    <div>
                      <span>وصف مختصر</span>
                      <p>{displayValue(item.short_description, 'لم تتم إضافة نبذة مختصرة بعد.')}</p>
                    </div>
                    <div>
                      <span>وصف تفصيلي</span>
                      <p>{displayValue(item.long_description, 'لم تتم إضافة وصف تفصيلي بعد.')}</p>
                    </div>
                  </div>
                  <div className="details-grid">
                    <DetailTile icon={<Building2 size={17} />} label="نوع الشركة" value={categoryLabel} />
                    <DetailTile icon={<MapPin size={17} />} label="الدولة" value={item.country} />
                    <DetailTile icon={<MapPin size={17} />} label="المدينة" value={item.city} />
                    <DetailTile icon={<MapPin size={17} />} label="عنوان الشركة بالكامل" value={item.full_address} fallback="لم يتم إضافة عنوان كامل بعد." />
                    <DetailTile icon={<MapPin size={17} />} label="إحداثيات الموقع" value={coordinates} fallback="لم يتم تحديد الإحداثيات بعد." />
                    <DetailTile icon={<CalendarDays size={17} />} label="سنة التأسيس" value={item.founded_year} fallback="لم يتم تحديد سنة التأسيس" />
                    <DetailTile icon={<BadgeCheck size={17} />} label="رقم الترخيص" value={item.license_number} fallback="لم يتم إضافة رقم ترخيص" />
                    <DetailTile icon={<ShieldCheck size={17} />} label="الجهة المنظمة" value={item.regulator_name} fallback="لم يتم تحديد جهة منظمة" />
                  </div>
                </SectionCard>

                <SectionCard eyebrow="Services" title="الخدمات المقدمة" icon={<Sparkles size={19} />}>
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
                      <strong>لا توجد خدمات منشورة حالياً</strong>
                      <p>لم يتم إضافة خدمات لهذه الشركة بعد.</p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard eyebrow="Regulatory" title="المعلومات النظامية" icon={<BadgeCheck size={19} />}>
                  <div className="details-grid">
                    <DetailTile icon={<CalendarDays size={17} />} label="تاريخ الإضافة" value={formatDate(item.created_at, locale)} />
                    <DetailTile icon={<CalendarDays size={17} />} label="تاريخ الاعتماد" value={formatDate(item.approved_at, locale)} />
                    <DetailTile icon={<ShieldCheck size={17} />} label="حالة الاعتماد" value={STATUS_LABELS[status] ?? status} />
                    <DetailTile icon={<Sparkles size={17} />} label="شركة مميزة" value={item.is_featured ? 'نعم' : 'لا'} />
                  </div>
                </SectionCard>

                {(mapsHref || item.full_address || location) ? (
                  <SectionCard eyebrow="Location" title="الموقع والعنوان" icon={<Navigation size={19} />}>
                    <div className="location-card">
                      <div>
                        <span>عنوان الشركة</span>
                        <strong>{displayValue(item.full_address || location, 'لم يتم إضافة عنوان كامل بعد.')}</strong>
                      </div>
                      {mapsHref ? (
                        <ActionButtonLink
                          href={mapsHref}
                          icon={<MapPin size={17} />}
                          label="فتح الموقع على الخريطة"
                          ariaLabel={`فتح موقع ${item.company_name} على الخريطة`}
                          variant="secondary"
                          external
                        />
                      ) : null}
                    </div>
                  </SectionCard>
                ) : null}
              </main>

              <aside className="company-side-column">
                <SectionCard eyebrow="Contact" title="بيانات التواصل" icon={<Phone size={19} />} className="side-card">
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
                      <ContactAction href={websiteHref} icon={<Globe2 size={16} />} label="الموقع الإلكتروني" value={item.website_url} display={cleanWebsiteLabel(item.website_url)} />
                      <ContactAction href={item.email ? `mailto:${item.email}` : null} icon={<Mail size={16} />} label="البريد الإلكتروني" value={item.email} />
                      <ContactAction href={item.phone ? `tel:${safeTel(item.phone)}` : null} icon={<Phone size={16} />} label="رقم الهاتف" value={item.phone} />
                      <ContactAction href={item.whatsapp ? `https://wa.me/${safeTel(item.whatsapp).replace(/^\+/, '')}` : null} icon={<MessageCircle size={16} />} label="واتساب" value={item.whatsapp} />
                      <ContactAction href={instagramHref} icon={<Instagram size={16} />} label="Instagram" value={instagramHref} display={formatCompanySocialHandle(item.instagram_url, 'instagram')} />
                      <ContactAction href={linkedinHref} icon={<Linkedin size={16} />} label="LinkedIn" value={linkedinHref} display={formatCompanySocialHandle(item.linkedin_url, 'linkedin')} />
                      <ContactAction href={twitterHref} icon={<Twitter size={16} />} label="X / Twitter" value={twitterHref} display={formatCompanySocialHandle(item.twitter_url, 'twitter')} />
                      <ContactAction href={mapsHref} icon={<MapPin size={16} />} label="الموقع على الخريطة" value={item.full_address || location || item.google_maps_url} display="فتح الموقع على الخريطة" />
                    </div>
                  ) : (
                    <div className="empty-card compact">
                      <Phone size={20} />
                      <p>لم يتم إضافة بيانات تواصل كافية.</p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard eyebrow="Analytics" title="إحصائيات الشركة" icon={<BarChart3 size={19} />} className="side-card">
                  <div className="analytics-grid metric-grid">
                    <DetailTile icon={<Eye size={16} />} label="زيارات الصفحة" value={numberFormat.format(analytics?.profileViews ?? 0)} />
                    {canSeeDetailedAnalytics ? (
                      <>
                        <DetailTile icon={<Eye size={16} />} label="مشاهدات البطاقة" value={numberFormat.format(analytics?.cardViews ?? 0)} />
                        <DetailTile icon={<Globe2 size={16} />} label="نقرات زيارة الموقع" value={numberFormat.format(analytics?.websiteClicks ?? 0)} />
                        <DetailTile icon={<Mail size={16} />} label="نقرات التواصل" value={numberFormat.format(analytics?.contactClicks ?? 0)} />
                        <DetailTile icon={<CalendarDays size={16} />} label="آخر مشاهدة" value={formatDate(analytics?.lastViewedAt, locale)} />
                      </>
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard eyebrow="Status" title="حالة الشركة" icon={<StatusIcon size={19} />} className="side-card">
                  <div className={`status-card ${status}`}>
                    <StatusIcon size={24} />
                    <div>
                      <span>الحالة الحالية</span>
                      <strong>{STATUS_LABELS[status] ?? status}</strong>
                    </div>
                  </div>
                  <div className="status-list">
                    <DetailTile icon={<CalendarDays size={16} />} label="تاريخ الإرسال" value={formatDate(item.created_at, locale)} />
                    <DetailTile icon={<CalendarDays size={16} />} label="تاريخ المراجعة" value={formatDate(item.reviewed_at, locale)} />
                    <DetailTile icon={<CalendarDays size={16} />} label="تاريخ الاعتماد" value={formatDate(item.approved_at, locale)} />
                  </div>
                  <p className={`status-message ${status}`}>{statusMessage(status, item.admin_notes)}</p>
                  {viewer?.canReview && shouldShowReviewNote(status) && item.admin_notes ? (
                    <p className="admin-note"><strong>ملاحظة المراجعة:</strong> {item.admin_notes}</p>
                  ) : null}
                </SectionCard>

                {viewer?.isOwner ? (
                  <SectionCard eyebrow="Owner" title="إدارة شركتي" icon={<Building2 size={19} />} className="side-card admin-card">
                    <ActionButtonLink
                      href="/profile/companies"
                      icon={<Edit3 size={16} />}
                      label="تعديل البيانات"
                      ariaLabel="فتح صفحة شركاتي لتعديل بيانات الشركة"
                      variant="secondary"
                    />
                    <ActionButtonLink
                      href={`/companies/${item.id}`}
                      icon={<Eye size={16} />}
                      label="عرض الصفحة العامة"
                      ariaLabel="عرض الصفحة العامة للشركة"
                      variant="secondary"
                    />
                  </SectionCard>
                ) : null}

                {viewer?.canReview ? (
                  <SectionCard eyebrow="Admin" title="إجراءات المراجعة" icon={<ShieldCheck size={19} />} className="side-card admin-card">
                    <button type="button" className="approve" onClick={() => void reviewCompany('approved')} disabled={Boolean(busyStatus)}>
                      <CheckCircle2 size={16} /> قبول ونشر
                    </button>
                    <button type="button" className="needs" onClick={() => void reviewCompany('needs_changes')} disabled={Boolean(busyStatus)}>
                      <Edit3 size={16} /> طلب تعديل
                    </button>
                    <button type="button" className="reject" onClick={() => void reviewCompany('rejected')} disabled={Boolean(busyStatus)}>
                      <XCircle size={16} /> رفض
                    </button>
                    <button type="button" className="archive" onClick={() => void reviewCompany('inactive')} disabled={Boolean(busyStatus)}>
                      <Trash2 size={16} /> أرشفة
                    </button>
                    <Link href="/sfm-admin-control/companies"><Edit3 size={16} /> تعديل البيانات</Link>
                  </SectionCard>
                ) : null}
              </aside>
            </div>
          </article>
        ) : null}

        <style jsx>{`
          .company-details-content {
            width: min(100%, 1240px);
          }
          .details-skeleton,
          .details-state {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 24px;
            background: #ffffff;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
          }
          .details-skeleton {
            min-height: 320px;
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
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
            color: #0f172a;
            font-size: 28px;
            font-weight: 950;
          }
          .details-state p {
            margin: 0;
            color: #64748b;
            font-weight: 850;
          }
          .details-state a {
            min-height: 44px;
            border-radius: 14px;
            padding: 0 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #ffffff;
            background: linear-gradient(135deg, #0b76e0, #18d4d4);
            text-decoration: none;
            font-weight: 950;
          }
          .company-profile {
            display: grid;
            gap: 18px;
            min-width: 0;
          }
          .company-hero-card {
            border: 1px solid rgba(47, 214, 192, 0.20);
            border-radius: 28px;
            padding: 24px;
            background:
              radial-gradient(circle at 12% 20%, rgba(47, 214, 192, 0.22), transparent 34%),
              linear-gradient(135deg, #07172A 0%, #0B2A4A 58%, #0f5f72 128%);
            box-shadow: 0 22px 60px rgba(3, 18, 37, 0.14);
            color: #ffffff;
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
            border-radius: 26px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            background: rgba(255, 255, 255, 0.10);
            display: grid;
            place-items: center;
            overflow: hidden;
            flex: 0 0 auto;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 18px 42px rgba(0,0,0,.18);
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
            border-radius: 999px;
            padding: 7px 11px;
            background: rgba(255, 255, 255, 0.12);
            color: #EAF6FF;
            font-size: 12px;
            font-weight: 950;
          }
          .status-pill.approved,
          .status-card.approved { color: #15803d; background: rgba(220, 252, 231, 0.96); }
          .status-pill.pending_review,
          .status-card.pending_review { color: #b45309; background: rgba(254, 243, 199, 0.96); }
          .status-pill.rejected,
          .status-card.rejected { color: #b91c1c; background: rgba(254, 226, 226, 0.96); }
          .status-pill.needs_changes,
          .status-card.needs_changes { color: #1d4ed8; background: rgba(219, 234, 254, 0.96); }
          .status-pill.inactive,
          .status-card.inactive { color: #475569; background: rgba(241, 245, 249, 0.96); }
          .hero-copy h1 {
            margin: 12px 0 8px;
            font-size: clamp(32px, 4vw, 56px);
            line-height: 1.08;
            font-weight: 950;
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
            border-radius: 999px;
            padding: 7px 10px;
            background: rgba(255, 255, 255, 0.10);
            color: rgba(234, 246, 255, 0.88);
            font-size: 13px;
            font-weight: 900;
          }
          .hero-copy p {
            margin: 14px 0 0;
            color: rgba(234, 246, 255, 0.78);
            line-height: 1.8;
            font-weight: 850;
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
            border: 1px solid rgba(245, 158, 11, 0.26);
            border-radius: 20px;
            background: #FFFBEB;
            color: #92400E;
            padding: 16px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .review-warning strong {
            display: block;
            font-weight: 950;
          }
          .review-warning p {
            margin: 6px 0 0;
            line-height: 1.7;
            font-weight: 850;
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
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 16px 42px rgba(15, 23, 42, 0.07);
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
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: rgba(24, 212, 212, 0.12);
            color: #0B9EAD;
            flex: 0 0 auto;
          }
          .section-head small {
            display: block;
            color: #0B9EAD;
            font-size: 12px;
            font-weight: 950;
          }
          .section-head h2 {
            margin: 2px 0 0;
            color: #0F172A;
            font-size: 22px;
            font-weight: 950;
          }
          .overview-block {
            display: grid;
            gap: 12px;
            margin-bottom: 14px;
          }
          .overview-block div {
            border-radius: 18px;
            border: 1px solid rgba(15, 23, 42, 0.07);
            background: #F8FBFF;
            padding: 14px;
          }
          .overview-block span {
            color: #0B9EAD;
            font-size: 12px;
            font-weight: 950;
          }
          .overview-block p {
            margin: 7px 0 0;
            color: #0F172A;
            line-height: 1.9;
            font-weight: 850;
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
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 16px;
            background: #F8FBFF;
            padding: 12px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }
          .detail-icon {
            width: 32px;
            height: 32px;
            border-radius: 11px;
            display: grid;
            place-items: center;
            background: rgba(11, 118, 224, 0.08);
            color: #0B76E0;
            flex: 0 0 auto;
          }
          .detail-tile span:not(.detail-icon),
          .contact-action small,
          .status-card span {
            display: block;
            color: #64748B;
            font-size: 12px;
            font-weight: 900;
          }
          .detail-tile strong,
          .contact-action strong,
          .status-card strong {
            display: block;
            margin-top: 4px;
            color: #0F172A;
            font-size: 15px;
            font-weight: 950;
            overflow-wrap: anywhere;
          }
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 10px;
          }
          .service-card {
            min-height: 86px;
            border: 1px solid rgba(11, 118, 224, 0.12);
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(11, 118, 224, 0.07), rgba(24, 212, 212, 0.09));
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
            border-radius: 12px;
            background: rgba(255,255,255,.72);
            color: #0B9EAD;
          }
          .service-card strong {
            color: #0C447C;
            font-weight: 950;
            overflow-wrap: anywhere;
          }
          .empty-card {
            min-height: 120px;
            border: 1px dashed rgba(11, 118, 224, 0.20);
            border-radius: 18px;
            background: #F8FBFF;
            color: #64748B;
            display: grid;
            place-items: center;
            gap: 8px;
            padding: 18px;
            text-align: center;
            font-weight: 850;
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
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 16px;
            background: #F8FBFF;
            color: #0F172A;
            padding: 10px 12px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            text-decoration: none;
            font-weight: 900;
          }
          .contact-action > span {
            width: 34px;
            height: 34px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            background: rgba(24, 212, 212, 0.12);
            color: #0B9EAD;
          }
          .contact-action.static {
            pointer-events: none;
          }
          .status-card {
            border-radius: 18px;
            padding: 14px;
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
          }
          .status-message {
            margin: 12px 0 0;
            border-radius: 14px;
            padding: 12px;
            line-height: 1.8;
            font-weight: 900;
          }
          .status-message.approved {
            color: #047857;
            background: #ecfdf5;
          }
          .status-message.pending_review {
            color: #b45309;
            background: #fffbeb;
          }
          .status-message.rejected {
            color: #b91c1c;
            background: #fef2f2;
          }
          .status-message.needs_changes {
            color: #1d4ed8;
            background: #eff6ff;
          }
          .status-message.inactive {
            color: #475569;
            background: #f8fafc;
          }
          .admin-note {
            margin: 12px 0 0;
            border-radius: 14px;
            background: #FFF7ED;
            color: #9A3412;
            padding: 12px;
            line-height: 1.7;
            font-weight: 850;
          }
          .admin-card button,
          .admin-card a {
            min-height: 46px;
            border-radius: 15px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: #F8FBFF;
            color: #0F172A;
            padding: 0 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-decoration: none;
            cursor: pointer;
            font: 950 14px/1.2 Tajawal, Arial, sans-serif;
          }
          .admin-card button:disabled {
            opacity: .68;
            cursor: not-allowed;
          }
          .admin-card .approve {
            background: #ECFDF5;
            color: #047857;
          }
          .admin-card .needs {
            background: #EFF6FF;
            color: #1D4ED8;
          }
          .admin-card .reject,
          .admin-card .archive {
            background: #FEF2F2;
            color: #B91C1C;
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
              border-radius: 20px;
              padding: 16px;
            }
            .hero-main {
              align-items: flex-start;
              flex-direction: column;
            }
            .company-logo {
              width: 78px;
              height: 78px;
              border-radius: 20px;
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
          .dark .profile-card,
          .dark .details-state {
            background: #0B2A4A;
            border-color: rgba(47, 214, 192, 0.14);
            box-shadow: 0 16px 42px rgba(0, 0, 0, 0.22);
          }
          .dark .section-head h2,
          .dark .overview-block p,
          .dark .detail-tile strong,
          .dark .contact-action strong,
          .dark .details-state h1 {
            color: #F8FAFC;
          }
          .dark .details-state p,
          .dark .detail-tile span:not(.detail-icon),
          .dark .contact-action small,
          .dark .empty-card {
            color: #CBD5E1;
          }
          .dark .overview-block div,
          .dark .detail-tile,
          .dark .contact-action,
          .dark .empty-card,
          .dark .status-message,
          .dark .admin-card button,
          .dark .admin-card a {
            background: #0A1F36;
            border-color: rgba(47, 214, 192, 0.14);
          }
          .dark .service-card {
            background: rgba(29, 140, 255, 0.14);
            border-color: rgba(47, 214, 192, 0.16);
          }
          .dark .service-card strong,
          .dark .admin-card button,
          .dark .admin-card a {
            color: #F8FAFC;
          }

          :global(.company-details-content) {
            width: min(100%, 1500px) !important;
            max-width: 1500px;
            margin-inline: auto;
            padding-inline: clamp(16px, 2vw, 32px);
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
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.92);
            color: #0b4f8a;
            border-color: rgba(11, 118, 224, 0.16);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
          }

          .company-hero-card {
            position: relative;
            isolation: isolate;
            min-height: 300px;
            grid-template-columns: minmax(0, 1fr) minmax(280px, auto);
            align-items: center;
            border-radius: 30px;
            padding: clamp(22px, 3vw, 34px);
            border-color: rgba(47, 214, 192, 0.26);
            background:
              radial-gradient(circle at 16% 12%, rgba(47, 214, 192, 0.28), transparent 30%),
              linear-gradient(135deg, #07172a 0%, #0a2646 55%, #0d6375 135%);
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
            background:
              linear-gradient(90deg, rgba(7, 23, 42, 0.78), rgba(7, 23, 42, 0.92)),
              radial-gradient(circle at 88% 70%, rgba(24, 212, 212, 0.18), transparent 34%);
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
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.14);
            backdrop-filter: blur(10px);
          }

          .company-logo :global(img) {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 10px;
            background: rgba(255, 255, 255, 0.94);
          }

          .hero-copy h1 {
            max-width: 860px;
            font-size: clamp(34px, 3.8vw, 58px);
            letter-spacing: 0;
          }

          .hero-copy p {
            max-width: 780px;
            font-size: 15px;
            color: rgba(234, 246, 255, 0.84);
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
            border: 1px solid rgba(11, 118, 224, 0.11);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
            padding: 16px;
            display: flex;
            gap: 12px;
            align-items: center;
          }

          :global(.highlight-card > span) {
            width: 40px;
            height: 40px;
            flex: 0 0 auto;
            border-radius: 14px;
            display: grid;
            place-items: center;
            color: #0b76e0;
            background: linear-gradient(135deg, rgba(11, 118, 224, 0.10), rgba(24, 212, 212, 0.14));
          }

          :global(.highlight-card small) {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          :global(.highlight-card strong) {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 16px;
            font-weight: 950;
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
            border: 1px solid rgba(11, 118, 224, 0.10);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.98);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
            padding: 22px;
            min-width: 0;
          }

          :global(.side-card) {
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
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
            border-radius: 15px;
            display: grid;
            place-items: center;
            color: #0b9ead;
            background: linear-gradient(135deg, rgba(24, 212, 212, 0.13), rgba(11, 118, 224, 0.09));
            flex: 0 0 auto;
          }

          :global(.section-head small) {
            display: block;
            color: #0b9ead;
            font-size: 12px;
            font-weight: 950;
            letter-spacing: 0.01em;
          }

          :global(.section-head h2) {
            margin: 3px 0 0;
            color: #0f172a;
            font-size: 23px;
            line-height: 1.2;
            font-weight: 950;
          }

          .overview-block {
            grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
            gap: 14px;
          }

          .overview-block div {
            background: linear-gradient(180deg, #f8fbff, #ffffff);
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
            border: 1px solid rgba(11, 118, 224, 0.10);
            border-radius: 17px;
            background: #f8fbff;
            padding: 13px;
            display: flex;
            gap: 11px;
            align-items: flex-start;
          }

          :global(.detail-icon) {
            width: 34px;
            height: 34px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            background: rgba(11, 118, 224, 0.09);
            color: #0b76e0;
            flex: 0 0 auto;
          }

          :global(.detail-tile span:not(.detail-icon)),
          :global(.contact-action small),
          :global(.status-card span) {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          :global(.detail-tile strong),
          :global(.contact-action strong),
          :global(.status-card strong) {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 15px;
            font-weight: 950;
            overflow-wrap: anywhere;
          }

          .services-grid {
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 12px;
          }

          .service-card {
            min-height: 96px;
            border-radius: 20px;
            border-color: rgba(11, 118, 224, 0.14);
            transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          }

          .service-card:hover {
            transform: translateY(-2px);
            border-color: rgba(24, 212, 212, 0.34);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
          }

          .empty-card {
            min-height: 112px;
            place-items: center;
            align-content: center;
          }

          .empty-card strong {
            color: #0f172a;
            font-size: 16px;
            font-weight: 950;
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
            border: 1px solid rgba(11, 118, 224, 0.10);
            border-radius: 17px;
            background: #f8fbff;
            color: #0f172a;
            padding: 11px 12px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
            text-decoration: none;
            font-weight: 900;
            transition: transform .16s ease, border-color .16s ease, background .16s ease;
          }

          :global(.contact-action:hover),
          :global(.contact-action:focus-visible) {
            outline: none;
            transform: translateY(-1px);
            border-color: rgba(24, 212, 212, 0.38);
            background: #f0fdff;
          }

          :global(.contact-action > span) {
            width: 36px;
            height: 36px;
            border-radius: 13px;
            display: grid;
            place-items: center;
            background: rgba(24, 212, 212, 0.12);
            color: #0b9ead;
          }

          :global(.contact-external) {
            color: #94a3b8;
          }

          :global(.metric-grid) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          :global(.metric-grid .detail-tile:first-child) {
            grid-column: 1 / -1;
            background: linear-gradient(135deg, rgba(11, 118, 224, 0.08), rgba(24, 212, 212, 0.10));
          }

          :global(.metric-grid .detail-tile:first-child strong) {
            font-size: 24px;
          }

          :global(.status-card) {
            border-radius: 19px;
            padding: 15px;
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
          }

          :global(.status-message) {
            margin: 12px 0 0;
            border-radius: 15px;
            padding: 13px;
            line-height: 1.8;
            font-weight: 900;
          }

          :global(.admin-note) {
            margin: 12px 0 0;
            border-radius: 15px;
            background: #fff7ed;
            color: #9a3412;
            padding: 12px;
            line-height: 1.7;
            font-weight: 850;
          }

          :global(.admin-card button),
          :global(.admin-card a),
          :global(.admin-card .sfm-action-link) {
            width: 100%;
            min-height: 46px;
            border-radius: 15px;
          }

          .location-card {
            border: 1px solid rgba(11, 118, 224, 0.10);
            border-radius: 20px;
            background: linear-gradient(135deg, #f8fbff, #ffffff);
            padding: 16px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
          }

          .location-card span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          .location-card strong {
            display: block;
            margin-top: 5px;
            color: #0f172a;
            font-size: 16px;
            font-weight: 950;
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
            :global(.company-details-content) {
              padding-inline: 14px;
            }

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
              border-radius: 22px;
              padding: 16px;
            }

            .hero-main {
              align-items: flex-start;
              flex-direction: column;
            }

            .company-logo {
              width: 82px;
              height: 82px;
              border-radius: 22px;
            }

            .hero-copy h1 {
              font-size: 34px;
            }

            .highlight-row,
            :global(.metric-grid) {
              grid-template-columns: 1fr;
            }
          }

          :global(.dark) :global(.highlight-card),
          :global(.dark) :global(.profile-card),
          :global(.dark) :global(.details-state) {
            background: #0b2a4a;
            border-color: rgba(47, 214, 192, 0.15);
            box-shadow: 0 16px 42px rgba(0, 0, 0, 0.22);
          }

          :global(.dark) :global(.section-head h2),
          :global(.dark) :global(.highlight-card strong),
          :global(.dark) :global(.detail-tile strong),
          :global(.dark) :global(.contact-action strong),
          :global(.dark) :global(.status-card strong),
          :global(.dark) .overview-block p,
          :global(.dark) .location-card strong,
          :global(.dark) .empty-card strong {
            color: #f8fafc;
          }

          :global(.dark) :global(.highlight-card small),
          :global(.dark) :global(.detail-tile span:not(.detail-icon)),
          :global(.dark) :global(.contact-action small),
          :global(.dark) .location-card span,
          :global(.dark) .empty-card {
            color: #cbd5e1;
          }

          :global(.dark) :global(.detail-tile),
          :global(.dark) :global(.contact-action),
          :global(.dark) .overview-block div,
          :global(.dark) .location-card,
          :global(.dark) .empty-card,
          :global(.dark) :global(.status-message),
          :global(.dark) :global(.admin-card button),
          :global(.dark) :global(.admin-card a) {
            background: #0a1f36;
            border-color: rgba(47, 214, 192, 0.14);
          }
        `}</style>
      </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
