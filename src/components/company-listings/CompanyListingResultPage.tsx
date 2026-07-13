'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { ActionButtonLink } from '@/components/company-listings/ActionButtonLink';
import { CompanyDashboardFrame } from '@/components/company-listings/CompanyDashboardFrame';
import { useLanguage } from '@/hooks/useLanguage';

type ResultPageProps = {
  type: 'success' | 'cancel';
};

export function CompanyListingResultPage({ type }: ResultPageProps) {
  const { t } = useLanguage();
  const isSuccess = type === 'success';
  return (
    <CompanyDashboardFrame>
    <DashboardPageShell ariaLabel={isSuccess ? t('company_listing_success_title') : t('company_listing_cancel_title')} contentClassName="company-result-content">
      <section className="company-result-card">
        <div className={isSuccess ? 'result-icon success' : 'result-icon cancel'}>
          {isSuccess ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
        </div>
        <h1>{isSuccess ? t('company_listing_success_title') : t('company_listing_cancel_title')}</h1>
        <p>{isSuccess ? t('company_listing_success_body') : t('company_listing_cancel_body')}</p>
        <div className="result-actions">
          {isSuccess ? <Link className="primary" href="/company-listing/submit">{t('company_listing_submit_title')}</Link> : null}
          <ActionButtonLink
            href="/investment-companies"
            icon={<ChevronRight size={18} />}
            label={t('company_back_services')}
            ariaLabel={t('company_back_services_aria')}
            variant="secondary"
          />
        </div>
      </section>
      <style jsx>{`
        .company-result-content {
          width: min(100%, 860px);
        }
        .company-result-card {
          text-align: center;
          border: 1px solid var(--border);
          border-radius: var(--radius-panel);
          padding: 38px 24px;
          background: var(--surface);
          box-shadow: var(--shadow-card);
        }
        .result-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
          border-radius: var(--radius-panel);
        }
        .result-icon.success {
          background: var(--success-soft);
          color: var(--success);
        }
        .result-icon.cancel {
          background: var(--warning-soft);
          color: var(--warning);
        }
        h1 {
          margin: 0;
          color: var(--foreground);
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 700;
        }
        p {
          max-width: 620px;
          margin: 12px auto 22px;
          color: var(--foreground-muted);
          line-height: 1.8;
          font-weight: 400;
        }
        .result-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .result-actions a {
          min-height: 46px;
          border-radius: var(--radius-control);
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--border);
          color: var(--primary);
          background: var(--surface);
          text-decoration: none;
          font-weight: 600;
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
        }
        .result-actions a:hover,
        .result-actions a:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          border-color: var(--primary);
          background: var(--surface-hover);
          box-shadow: var(--focus-shadow);
          transform: translateY(-1px);
        }
        .result-actions a:active {
          transform: translateY(0) scale(.98);
          box-shadow: var(--shadow-xs);
        }
        .result-actions a.primary {
          border-color: transparent;
          color: var(--primary-foreground);
          background: var(--primary);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
