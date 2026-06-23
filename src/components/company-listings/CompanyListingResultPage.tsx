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
            label="العودة إلى الخدمات"
            ariaLabel="العودة إلى صفحة الخدمات"
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
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 26px;
          padding: 38px 24px;
          background:
            linear-gradient(135deg, rgba(11, 118, 224, 0.08), rgba(24, 212, 212, 0.10)),
            #ffffff;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
        }
        .result-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
          border-radius: 24px;
        }
        .result-icon.success {
          background: rgba(22, 163, 74, 0.12);
          color: #15803d;
        }
        .result-icon.cancel {
          background: rgba(245, 158, 11, 0.14);
          color: #b45309;
        }
        h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 950;
        }
        p {
          max-width: 620px;
          margin: 12px auto 22px;
          color: #64748b;
          line-height: 1.8;
          font-weight: 750;
        }
        .result-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .result-actions a {
          min-height: 46px;
          border-radius: 14px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(11, 118, 224, 0.18);
          color: #0b76e0;
          background: #ffffff;
          text-decoration: none;
          font-weight: 950;
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
        }
        .result-actions a:hover,
        .result-actions a:focus-visible {
          outline: none;
          border-color: rgba(24, 212, 212, 0.40);
          background: #f0fdff;
          box-shadow: 0 0 0 3px rgba(24, 212, 212, 0.14), 0 10px 22px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }
        .result-actions a:active {
          transform: translateY(0) scale(.98);
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        }
        .result-actions a.primary {
          border-color: transparent;
          color: #ffffff;
          background: linear-gradient(135deg, #0b76e0, #18d4d4);
          box-shadow: 0 14px 28px rgba(11, 118, 224, 0.20);
        }
      `}</style>
    </DashboardPageShell>
    </CompanyDashboardFrame>
  );
}
