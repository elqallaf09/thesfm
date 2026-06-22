'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  FileText,
  Globe2,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { COMPANY_CATEGORY_CONFIGS, type CompanyListing, type CompanyStatus } from '@/lib/companyListings';

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
  return !text || ['null', 'undefined', 'no', 'n/a', 'na', '-'].includes(text.toLowerCase());
}

function displayValue(value?: string | number | null, fallback = 'غير محدد') {
  return isMissing(value) ? fallback : String(value).trim();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? 'S') + (parts[1]?.[0] ?? '')).toUpperCase();
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

function ProfileLogo({ item }: { item: CompanyListing }) {
  const { imageUrl, loading, failed, setFailed } = useResolvedImageUrl(item.logo_url);
  if (!item.logo_url || failed || (!loading && !imageUrl)) {
    return <div className="company-avatar-fallback" aria-label={item.company_name}>{initials(item.company_name)}</div>;
  }
  if (loading && !imageUrl) {
    return <div className="company-avatar-fallback resolving" aria-label={item.company_name}>{initials(item.company_name)}</div>;
  }
  return <Image src={imageUrl} alt={`${item.company_name} logo`} width={196} height={196} unoptimized onError={() => setFailed(true)} />;
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

function ContactAction({ href, icon, label, value }: { href?: string | null; icon: ReactNode; label: string; value?: string | null }) {
  if (!href || isMissing(value)) return null;
  return (
    <a className="contact-action" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir="ltr">{value}</strong>
      </div>
    </a>
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

  const categoryLabel = item ? t(COMPANY_CATEGORY_CONFIGS[item.category]?.labelKey ?? 'company_category_investment') : '';
  const status = item?.status ?? 'pending_review';
  const StatusIcon = STATUS_ICONS[status] ?? Clock3;
  const location = [item?.country, item?.city].filter(Boolean).join(' / ');
  const services = useMemo(() => item?.services?.map(service => service.trim()).filter(Boolean) ?? [], [item?.services]);
  const hasContact = Boolean(item?.website_url || item?.email || item?.phone || item?.instagram_url || item?.linkedin_url || item?.whatsapp || location);
  const backHref = item ? (COMPANY_CATEGORY_CONFIGS[item.category]?.path ?? '/services') : '/services';
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';

  async function reviewCompany(nextStatus: CompanyStatus) {
    if (!item || busyStatus) return;
    setBusyStatus(nextStatus);
    try {
      const response = await fetch('/api/admin/companies/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: item.id, status: nextStatus, adminNotes: item.admin_notes ?? null }),
      });
      if (!response.ok) throw new Error('review failed');
      setItem(previous => previous ? {
        ...previous,
        status: nextStatus,
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
            <Link href={backHref} aria-label="العودة إلى صفحة الخدمات">
              <ChevronRight size={18} />
              <span>العودة إلى الخدمات</span>
            </Link>
          </section>
        ) : null}

        {!loading && item ? (
          <article className="company-profile" dir={dir}>
            <section className="company-hero-card">
              <div className="hero-main">
                <div className="company-logo">
                  <ProfileLogo item={item} />
                </div>
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
                  <p>{displayValue(item.short_description, 'لم يتم إضافة وصف مختصر بعد.')}</p>
                </div>
              </div>
              <div className="hero-actions">
                {item.website_url ? <a className="primary-action" href={item.website_url} target="_blank" rel="noreferrer"><Globe2 size={17} />زيارة الموقع</a> : null}
                {item.email ? <a href={`mailto:${item.email}`}><Mail size={17} />تواصل</a> : item.phone ? <a href={`tel:${safeTel(item.phone)}`}><Phone size={17} />تواصل</a> : null}
                <Link href={backHref} aria-label="العودة إلى صفحة الخدمات"><ArrowRight size={17} />العودة إلى الخدمات</Link>
              </div>
            </section>

            {status !== 'approved' ? (
              <section className="review-warning">
                <ShieldAlert size={20} />
                <div>
                  <strong>المعلومات مقدمة من الشركة وتخضع للمراجعة قبل النشر.</strong>
                  {item.admin_notes ? <p>{item.admin_notes}</p> : null}
                </div>
              </section>
            ) : null}

            <div className="company-layout">
              <main className="company-main-column">
                <SectionCard eyebrow="Overview" title="نبذة عن الشركة" icon={<FileText size={19} />}>
                  <div className="overview-block">
                    <div>
                      <span>وصف مختصر</span>
                      <p>{displayValue(item.short_description, 'لم يتم إضافة وصف مختصر بعد.')}</p>
                    </div>
                    <div>
                      <span>وصف تفصيلي</span>
                      <p>{displayValue(item.long_description, 'لم يتم إضافة وصف تفصيلي بعد.')}</p>
                    </div>
                  </div>
                  <div className="details-grid">
                    <DetailTile icon={<Building2 size={17} />} label="نوع الشركة" value={categoryLabel} />
                    <DetailTile icon={<MapPin size={17} />} label="الدولة" value={item.country} />
                    <DetailTile icon={<MapPin size={17} />} label="المدينة" value={item.city} />
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
                      <p>لم يتم إضافة خدمات لهذه الشركة بعد.</p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard eyebrow="Company Data" title="بيانات إضافية" icon={<BadgeCheck size={19} />}>
                  <div className="details-grid">
                    <DetailTile icon={<CalendarDays size={17} />} label="تاريخ الإضافة" value={formatDate(item.created_at, locale)} />
                    <DetailTile icon={<CalendarDays size={17} />} label="تاريخ الاعتماد" value={formatDate(item.approved_at, locale)} />
                    <DetailTile icon={<ShieldCheck size={17} />} label="حالة الاعتماد" value={STATUS_LABELS[status] ?? status} />
                    <DetailTile icon={<Sparkles size={17} />} label="شركة مميزة" value={item.is_featured ? 'نعم' : 'لا'} />
                  </div>
                </SectionCard>
              </main>

              <aside className="company-side-column">
                <SectionCard eyebrow="Contact" title="بيانات التواصل" icon={<Phone size={19} />} className="side-card">
                  {hasContact ? (
                    <div className="contact-list">
                      <ContactAction href={item.website_url} icon={<Globe2 size={16} />} label="الموقع الإلكتروني" value={item.website_url} />
                      <ContactAction href={item.email ? `mailto:${item.email}` : null} icon={<Mail size={16} />} label="البريد الإلكتروني" value={item.email} />
                      <ContactAction href={item.phone ? `tel:${safeTel(item.phone)}` : null} icon={<Phone size={16} />} label="رقم الهاتف" value={item.phone} />
                      <ContactAction href={item.whatsapp ? `https://wa.me/${safeTel(item.whatsapp).replace(/^\+/, '')}` : null} icon={<Phone size={16} />} label="واتساب" value={item.whatsapp} />
                      <ContactAction href={item.instagram_url} icon={<Instagram size={16} />} label="Instagram" value={item.instagram_url} />
                      <ContactAction href={item.linkedin_url} icon={<Linkedin size={16} />} label="LinkedIn" value={item.linkedin_url} />
                      {location ? (
                        <div className="contact-action static">
                          <span><MapPin size={16} /></span>
                          <div>
                            <small>الموقع</small>
                            <strong>{location}</strong>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="empty-card compact">
                      <Phone size={20} />
                      <p>لم يتم إضافة بيانات تواصل كافية.</p>
                    </div>
                  )}
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
                  </div>
                  {item.admin_notes ? <p className="admin-note">{item.admin_notes}</p> : null}
                </SectionCard>

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
          .company-avatar-fallback {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            color: #07172A;
            background: linear-gradient(135deg, #BFF6F0, #23C7D9);
            font-size: 32px;
            font-weight: 950;
          }
          .company-avatar-fallback.resolving {
            color: rgba(7, 23, 42, 0.62);
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
          .hero-actions a {
            min-height: 44px;
            border-radius: 14px;
            padding: 0 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            background: rgba(255, 255, 255, 0.10);
            color: #EAF6FF;
            text-decoration: none;
            font-weight: 950;
            transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
          }
          .hero-actions a:hover,
          .hero-actions a:focus-visible,
          .details-state a:hover,
          .details-state a:focus-visible {
            outline: none;
            transform: translateY(-1px);
            box-shadow: 0 0 0 3px rgba(24, 212, 212, 0.16), 0 16px 30px rgba(0,0,0,.16);
          }
          .hero-actions a.primary-action {
            border: 0;
            color: #07172A;
            background: linear-gradient(135deg, #A7F3D0, #22D3EE);
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
            .hero-actions a {
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
        `}</style>
      </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
