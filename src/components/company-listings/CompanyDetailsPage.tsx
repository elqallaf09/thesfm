'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  Globe2,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? 'S') + (parts[1]?.[0] ?? '');
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
  const [failed, setFailed] = useState(false);
  if (!item.logo_url || failed) {
    return <div className="company-avatar-fallback" aria-label={item.company_name}>{initials(item.company_name)}</div>;
  }
  return <img src={item.logo_url} alt={`${item.company_name} logo`} onError={() => setFailed(true)} loading="lazy" decoding="async" />;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value || 'غير محدد'}</strong>
    </div>
  );
}

function ContactLink({ href, icon, label, value }: { href?: string | null; icon: React.ReactNode; label: string; value?: string | null }) {
  if (!href || !value) return null;
  return (
    <a className="contact-link" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
      {icon}
      <span>{label}</span>
      <strong dir="ltr">{value}</strong>
    </a>
  );
}

export function CompanyDetailsPage({ id }: { id: string }) {
  const { t, dir } = useLanguage();
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
  const services = useMemo(() => item?.services?.filter(Boolean) ?? [], [item?.services]);
  const hasContact = Boolean(item?.website_url || item?.email || item?.phone || item?.instagram_url || item?.linkedin_url || item?.whatsapp);

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
            <ShieldAlert size={34} />
            <h1>{t('company_listing_error_title')}</h1>
            <p>{error}</p>
            <Link href="/investment-companies">{t('company_listing_back_services')}</Link>
          </section>
        ) : null}

        {!loading && item ? (
          <article className="company-profile" dir={dir}>
            <section className="company-profile-hero">
              <div className="hero-content">
                <div className="company-logo">
                  <ProfileLogo item={item} />
                </div>
                <div className="hero-copy">
                  <span className={`status-badge ${status}`}>
                    <StatusIcon size={15} />
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <h1>{item.company_name}</h1>
                  <p className="company-type">{categoryLabel}</p>
                  {location ? <p className="company-location"><MapPin size={16} />{location}</p> : null}
                  <p className="company-short">{item.short_description || 'لم يتم إضافة وصف مختصر بعد.'}</p>
                </div>
              </div>
              <div className="hero-actions">
                {item.website_url ? <a className="primary-action" href={item.website_url} target="_blank" rel="noreferrer"><Globe2 size={17} />زيارة الموقع</a> : null}
                {item.email ? <a href={`mailto:${item.email}`}><Mail size={17} />البريد الإلكتروني</a> : null}
                {item.phone ? <a href={`tel:${safeTel(item.phone)}`}><Phone size={17} />اتصال</a> : null}
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

            <div className="company-profile-grid">
              <main className="company-main-column">
                <section className="profile-card">
                  <div className="section-head">
                    <span>THE SFM</span>
                    <h2>نظرة عامة على الشركة</h2>
                  </div>
                  <p className="overview-text">{item.short_description || 'لم يتم إضافة وصف مختصر بعد.'}</p>
                  <p className="overview-text muted">{item.long_description || 'لم يتم إضافة وصف تفصيلي بعد.'}</p>
                  <div className="details-grid">
                    <DetailRow label="نوع الشركة" value={categoryLabel} />
                    <DetailRow label="الدولة" value={item.country} />
                    <DetailRow label="المدينة" value={item.city} />
                    <DetailRow label="تاريخ الإضافة" value={formatDate(item.created_at)} />
                    <DetailRow label="حالة الاعتماد" value={STATUS_LABELS[status] ?? status} />
                    <DetailRow label="سنة التأسيس" value={item.founded_year} />
                  </div>
                </section>

                <section className="profile-card">
                  <div className="section-head">
                    <span>Services</span>
                    <h2>الخدمات المقدمة</h2>
                  </div>
                  {services.length ? (
                    <div className="services-grid">
                      {services.map(service => <span key={service}>{service}</span>)}
                    </div>
                  ) : (
                    <p className="empty-copy">لم تتم إضافة خدمات لهذه الشركة بعد.</p>
                  )}
                </section>

                <section className="profile-card">
                  <div className="section-head">
                    <span>Details</span>
                    <h2>بيانات إضافية</h2>
                  </div>
                  <div className="details-grid">
                    <DetailRow label="رقم الترخيص" value={item.license_number} />
                    <DetailRow label="الجهة المنظمة أو الرقابية" value={item.regulator_name} />
                    <DetailRow label="آخر مراجعة" value={formatDate(item.reviewed_at ?? item.approved_at)} />
                    <DetailRow label="مميزة" value={item.is_featured ? 'نعم' : 'لا'} />
                  </div>
                </section>
              </main>

              <aside className="company-side-column">
                <section className="profile-card contact-card">
                  <div className="section-head">
                    <span>Contact</span>
                    <h2>بيانات التواصل</h2>
                  </div>
                  {hasContact ? (
                    <div className="contact-list">
                      <ContactLink href={item.website_url} icon={<Globe2 size={16} />} label="الموقع الإلكتروني" value={item.website_url} />
                      <ContactLink href={item.email ? `mailto:${item.email}` : null} icon={<Mail size={16} />} label="البريد الإلكتروني" value={item.email} />
                      <ContactLink href={item.phone ? `tel:${safeTel(item.phone)}` : null} icon={<Phone size={16} />} label="رقم الهاتف" value={item.phone} />
                      <ContactLink href={item.whatsapp ? `https://wa.me/${safeTel(item.whatsapp).replace(/^\+/, '')}` : null} icon={<Phone size={16} />} label="واتساب" value={item.whatsapp} />
                      <ContactLink href={item.instagram_url} icon={<Instagram size={16} />} label="Instagram" value={item.instagram_url} />
                      <ContactLink href={item.linkedin_url} icon={<Linkedin size={16} />} label="LinkedIn" value={item.linkedin_url} />
                    </div>
                  ) : (
                    <p className="empty-copy">لم يتم إضافة بيانات تواصل كافية.</p>
                  )}
                </section>

                <section className="profile-card status-card">
                  <div className={`status-large ${status}`}>
                    <StatusIcon size={22} />
                    <div>
                      <span>حالة الشركة</span>
                      <strong>{STATUS_LABELS[status] ?? status}</strong>
                    </div>
                  </div>
                  <DetailRow label="تاريخ الإضافة" value={formatDate(item.created_at)} />
                  <DetailRow label="تاريخ المراجعة" value={formatDate(item.reviewed_at)} />
                  {item.admin_notes ? <p className="admin-note">{item.admin_notes}</p> : null}
                </section>

                {viewer?.canReview ? (
                  <section className="profile-card admin-actions">
                    <div className="section-head">
                      <span>Admin</span>
                      <h2>إجراءات المراجعة</h2>
                    </div>
                    <button type="button" onClick={() => void reviewCompany('approved')} disabled={Boolean(busyStatus)}>
                      <CheckCircle2 size={16} /> قبول ونشر
                    </button>
                    <button type="button" onClick={() => void reviewCompany('needs_changes')} disabled={Boolean(busyStatus)}>
                      <Edit3 size={16} /> طلب تعديل
                    </button>
                    <button type="button" onClick={() => void reviewCompany('rejected')} disabled={Boolean(busyStatus)}>
                      <XCircle size={16} /> رفض
                    </button>
                    <button type="button" onClick={() => void reviewCompany('inactive')} disabled={Boolean(busyStatus)}>
                      <Trash2 size={16} /> حذف / أرشفة
                    </button>
                    <Link href="/sfm-admin-control/companies">تعديل بيانات الشركة</Link>
                  </section>
                ) : null}

                <Link className="details-back" href={COMPANY_CATEGORY_CONFIGS[item.category]?.path ?? '/investment-companies'}>
                  {t('company_listing_back_services')}
                </Link>
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
          .details-state a,
          .details-back {
            min-height: 44px;
            border-radius: 14px;
            padding: 0 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
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
          .company-profile-hero {
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
          .hero-content {
            display: flex;
            align-items: center;
            gap: 18px;
            min-width: 0;
          }
          .company-logo {
            width: 92px;
            height: 92px;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            background: rgba(255, 255, 255, 0.10);
            display: grid;
            place-items: center;
            overflow: hidden;
            flex: 0 0 auto;
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
            font-size: 30px;
            font-weight: 950;
          }
          .hero-copy {
            min-width: 0;
          }
          .status-badge {
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
          .status-badge.approved,
          .status-large.approved { color: #16A34A; background: rgba(220, 252, 231, 0.96); }
          .status-badge.pending_review,
          .status-large.pending_review { color: #B45309; background: rgba(254, 243, 199, 0.96); }
          .status-badge.rejected,
          .status-large.rejected { color: #B91C1C; background: rgba(254, 226, 226, 0.96); }
          .status-badge.needs_changes,
          .status-large.needs_changes { color: #1D4ED8; background: rgba(219, 234, 254, 0.96); }
          .status-badge.inactive,
          .status-large.inactive { color: #475569; background: rgba(241, 245, 249, 0.96); }
          .hero-copy h1 {
            margin: 12px 0 4px;
            font-size: clamp(30px, 4vw, 54px);
            line-height: 1.08;
            font-weight: 950;
            overflow-wrap: anywhere;
          }
          .company-type,
          .company-location,
          .company-short {
            margin: 0;
            color: rgba(234, 246, 255, 0.78);
            font-weight: 850;
          }
          .company-location {
            margin-top: 8px;
            display: inline-flex;
            align-items: center;
            gap: 7px;
          }
          .company-short {
            margin-top: 12px;
            line-height: 1.8;
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
          .company-profile-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
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
            margin-bottom: 14px;
          }
          .section-head span {
            color: #0B9EAD;
            font-size: 12px;
            font-weight: 950;
          }
          .section-head h2 {
            margin: 4px 0 0;
            color: #0F172A;
            font-size: 22px;
            font-weight: 950;
          }
          .overview-text {
            margin: 0 0 12px;
            color: #0F172A;
            line-height: 1.9;
            font-weight: 850;
          }
          .overview-text.muted,
          .empty-copy {
            color: #64748B;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .detail-row {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 16px;
            background: #F8FBFF;
            padding: 12px;
            min-width: 0;
          }
          .detail-row span {
            display: block;
            color: #64748B;
            font-size: 12px;
            font-weight: 900;
          }
          .detail-row strong {
            display: block;
            margin-top: 5px;
            color: #0F172A;
            font-size: 15px;
            font-weight: 950;
            overflow-wrap: anywhere;
          }
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 10px;
          }
          .services-grid span {
            border: 1px solid rgba(11, 118, 224, 0.12);
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(11, 118, 224, 0.07), rgba(24, 212, 212, 0.09));
            color: #0C447C;
            padding: 12px;
            font-weight: 950;
            overflow-wrap: anywhere;
          }
          .empty-copy {
            margin: 0;
            line-height: 1.8;
            font-weight: 850;
          }
          .contact-list,
          .admin-actions {
            display: grid;
            gap: 10px;
          }
          .contact-link,
          .admin-actions button,
          .admin-actions a {
            min-height: 46px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 15px;
            background: #F8FBFF;
            color: #0F172A;
            padding: 10px 12px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            column-gap: 10px;
            row-gap: 2px;
            align-items: center;
            text-decoration: none;
            font-weight: 900;
            text-align: start;
          }
          .contact-link svg,
          .admin-actions svg {
            color: #0B9EAD;
            grid-row: span 2;
          }
          .contact-link span {
            color: #64748B;
            font-size: 12px;
          }
          .contact-link strong {
            color: #0F172A;
            font-size: 13px;
            overflow-wrap: anywhere;
          }
          .status-large {
            border-radius: 18px;
            padding: 14px;
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
          }
          .status-large span {
            display: block;
            font-size: 12px;
            font-weight: 900;
            opacity: .78;
          }
          .status-large strong {
            display: block;
            margin-top: 2px;
            font-size: 18px;
            font-weight: 950;
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
          .admin-actions button {
            cursor: pointer;
            font: 950 14px/1.2 Tajawal, Arial, sans-serif;
          }
          .admin-actions button:disabled {
            opacity: .68;
            cursor: not-allowed;
          }
          .admin-actions button:first-of-type {
            background: #ECFDF5;
            color: #047857;
          }
          .admin-actions button:nth-of-type(3),
          .admin-actions button:nth-of-type(4) {
            background: #FEF2F2;
            color: #B91C1C;
          }
          .details-back {
            width: 100%;
          }
          @media (max-width: 980px) {
            .company-profile-hero,
            .company-profile-grid {
              grid-template-columns: 1fr;
            }
            .hero-actions {
              justify-content: stretch;
            }
            .hero-actions a {
              flex: 1 1 160px;
            }
          }
          @media (max-width: 640px) {
            .company-profile-hero,
            .profile-card {
              border-radius: 20px;
              padding: 16px;
            }
            .hero-content {
              align-items: flex-start;
              flex-direction: column;
            }
            .company-logo {
              width: 76px;
              height: 76px;
              border-radius: 20px;
            }
            .hero-actions {
              display: grid;
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
          .dark .overview-text,
          .dark .details-state h1 {
            color: #F8FAFC;
          }
          .dark .overview-text.muted,
          .dark .empty-copy,
          .dark .details-state p {
            color: #CBD5E1;
          }
          .dark .detail-row,
          .dark .contact-link,
          .dark .admin-actions button,
          .dark .admin-actions a {
            background: #0A1F36;
            border-color: rgba(47, 214, 192, 0.14);
          }
          .dark .detail-row strong,
          .dark .contact-link strong,
          .dark .contact-link,
          .dark .admin-actions button,
          .dark .admin-actions a {
            color: #F8FAFC;
          }
          .dark .detail-row span,
          .dark .contact-link span {
            color: #CBD5E1;
          }
          .dark .services-grid span {
            background: rgba(29, 140, 255, 0.14);
            border-color: rgba(47, 214, 192, 0.16);
            color: #BAE6FD;
          }
        `}</style>
      </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
