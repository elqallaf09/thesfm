'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Globe2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import type { TranslationKey } from '@/components/navigationConfig';
import { useLanguage } from '@/hooks/useLanguage';
import { COMPANY_CATEGORY_CONFIGS, type CompanyListing } from '@/lib/companyListings';

function imageBackground(url: string) {
  return { backgroundImage: `url(${JSON.stringify(url)})` };
}

export function CompanyDetailsPage({ id }: { id: string }) {
  const { t } = useLanguage();
  const [item, setItem] = useState<CompanyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/company-listings/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(response => response.json().then(payload => ({ response, payload })))
      .then(({ response, payload }) => {
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setError(t('company_listing_error_body'));
          return;
        }
        setItem(payload.item);
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
  }, [id, t]);

  const categoryLabel = item ? t(COMPANY_CATEGORY_CONFIGS[item.category]?.labelKey ?? 'company_category_investment') : '';

  return (
    <CompanyDashboardFrame>
    <DashboardPageShell ariaLabel={item?.company_name ?? t('company_listing_view_details')} contentClassName="company-details-content">
      {loading ? <div className="details-skeleton" /> : null}
      {!loading && error ? (
        <section className="details-state">
          <h1>{t('company_listing_error_title')}</h1>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && item ? (
        <article className="company-details-card">
          <div className="details-cover">
            {item.cover_image_url ? <span style={imageBackground(item.cover_image_url)} /> : null}
          </div>
          <div className="details-main">
            <div className="details-logo">
              {item.logo_url ? <span style={imageBackground(item.logo_url)} /> : <Building2 size={34} />}
            </div>
            <div>
              <span className="details-status"><ShieldCheck size={14} />{t(`company_listing_status_${item.status}` as TranslationKey)}</span>
              <h1>{item.company_name}</h1>
              <p>{categoryLabel}</p>
            </div>
          </div>
          <div className="details-meta">
            {(item.country || item.city) ? <span><MapPin size={15} />{[item.country, item.city].filter(Boolean).join(' / ')}</span> : null}
            {item.website_url ? <a href={item.website_url} target="_blank" rel="noreferrer"><Globe2 size={15} />{t('company_listing_visit_website')}</a> : null}
            {item.email ? <a href={`mailto:${item.email}`}><Mail size={15} />{item.email}</a> : null}
            {item.phone ? <a href={`tel:${item.phone}`}><Phone size={15} />{item.phone}</a> : null}
          </div>
          <section>
            <h2>{t('company_listing_long_description')}</h2>
            <p>{item.long_description || item.short_description || t('company_listing_info_note')}</p>
          </section>
          {item.services?.length ? (
            <section>
              <h2>{t('company_listing_services')}</h2>
              <div className="service-list">
                {item.services.map(service => <span key={service}>{service}</span>)}
              </div>
            </section>
          ) : null}
          <section className="details-note">{t('company_listing_info_note')}</section>
          <Link className="details-back" href={COMPANY_CATEGORY_CONFIGS[item.category]?.path ?? '/investment-companies'}>{t('company_listing_back_services')}</Link>
        </article>
      ) : null}
      <style jsx>{`
        .company-details-content {
          width: min(100%, 980px);
        }
        .company-details-card,
        .details-state,
        .details-skeleton {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }
        .details-skeleton {
          min-height: 520px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
        .details-cover {
          height: 180px;
          background: linear-gradient(135deg, rgba(11, 118, 224, 0.12), rgba(24, 212, 212, 0.14));
        }
        .details-cover span {
          display: block;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
        }
        .details-main {
          display: flex;
          gap: 16px;
          align-items: center;
          padding: 22px;
        }
        .details-logo {
          width: 78px;
          height: 78px;
          border-radius: 22px;
          background: #f8fbff;
          color: #0b76e0;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(11, 118, 224, 0.12);
        }
        .details-logo span {
          display: block;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
        }
        .details-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(22, 163, 74, 0.10);
          color: #15803d;
          font-size: 12px;
          font-weight: 950;
        }
        h1 {
          margin: 10px 0 4px;
          color: #0f172a;
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 950;
        }
        .details-main p {
          margin: 0;
          color: #64748b;
          font-weight: 850;
        }
        .details-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 0 22px 18px;
        }
        .details-meta span,
        .details-meta a {
          min-height: 36px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fbff;
          color: #0f172a;
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
        }
        section {
          padding: 0 22px 22px;
        }
        section h2 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 17px;
          font-weight: 950;
        }
        section p {
          margin: 0;
          color: #475569;
          line-height: 1.9;
          font-weight: 750;
        }
        .service-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .service-list span {
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(11, 118, 224, 0.08);
          color: #0b76e0;
          font-size: 12px;
          font-weight: 950;
        }
        .details-note {
          margin: 0 22px 20px;
          border-radius: 16px;
          padding: 12px 14px;
          background: rgba(245, 158, 11, 0.10);
          color: #92400e;
          font-weight: 850;
        }
        .details-back {
          margin: 0 22px 22px;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          border-radius: 12px;
          padding: 0 14px;
          color: #ffffff;
          background: linear-gradient(135deg, #0b76e0, #18d4d4);
          text-decoration: none;
          font-weight: 950;
        }
        .details-state {
          padding: 28px;
          text-align: center;
        }
        .details-state p {
          color: #64748b;
        }
      `}</style>
    </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
