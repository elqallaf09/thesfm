'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, FileText, Loader2, ReceiptText, ShoppingCart, Truck, UserRound, UsersRound } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_TEXT, normalizeBusinessLang } from '@/lib/businessOperations';

type Counts = {
  sales: number | null;
  employees: number | null;
};

export default function BusinessOperationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeBusinessLang(lang);
  const text = BUSINESS_TEXT[locale];
  const [counts, setCounts] = useState<Counts>({ sales: null, employees: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCounts = useCallback(async () => {
    if (!user) {
      setCounts({ sales: null, employees: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const db = supabase as any;
    const [salesResult, employeesResult] = await Promise.all([
      db.from('business_sales').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      db.from('business_employees').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    if (salesResult.error || employeesResult.error) {
      setError(text.loadError);
      setCounts({ sales: null, employees: null });
    } else {
      setCounts({
        sales: salesResult.count ?? 0,
        employees: employeesResult.count ?? 0,
      });
    }
    setLoading(false);
  }, [text.loadError, user]);

  useEffect(() => {
    if (!authLoading) void loadCounts();
  }, [authLoading, loadCounts]);

  const cards = useMemo(() => [
    {
      title: text.sales,
      description: text.salesDescription,
      href: '/sales',
      action: text.openSales,
      icon: ShoppingCart,
      active: true,
      count: counts.sales,
    },
    {
      title: text.employees,
      description: text.employeesDescription,
      href: '/employees',
      action: text.openEmployees,
      icon: UsersRound,
      active: true,
      count: counts.employees,
    },
    { title: text.customers, description: text.noDataYet, icon: UserRound, active: false },
    { title: text.invoices, description: text.noDataYet, icon: FileText, active: false },
    { title: text.suppliers, description: text.noDataYet, icon: Truck, active: false },
    { title: text.operatingExpenses, description: text.noDataYet, icon: ReceiptText, active: false },
  ], [counts.employees, counts.sales, text]);

  if (authLoading || loading) {
    return (
      <div className="business-ops-page" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={text.businessOperations}>
          <div className="business-loading">
            <Loader2 className="business-spin" size={24} aria-hidden="true" />
            <p>{text.loading}</p>
          </div>
        </DashboardPageShell>
        <style jsx global>{businessOperationsStyles}</style>
      </div>
    );
  }

  return (
    <div className="business-ops-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.businessOperations} contentClassName="business-ops-content">
        <div className="business-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.operationsBadge}
          title={text.businessOperations}
          subtitle={text.businessOperationsSubtitle}
          icon={<BriefcaseBusiness size={32} />}
        />

        {error ? <div className="business-alert" role="alert">{error}</div> : null}

        <section className="business-hub-grid" aria-label={text.businessOperations}>
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <>
                <div className="business-card-icon" aria-hidden="true"><Icon size={22} /></div>
                <div>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                </div>
                {card.active ? (
                  <div className="business-card-foot">
                    <span>{card.count && card.count > 0 ? card.count.toLocaleString(locale === 'ar' ? 'ar-KW' : locale) : text.noDataYet}</span>
                    <strong>{card.action}</strong>
                  </div>
                ) : (
                  <div className="business-card-foot muted">
                    <span>{text.noDataYet}</span>
                    <strong>{text.comingSoon}</strong>
                  </div>
                )}
              </>
            );

            return card.active && card.href ? (
              <Link className="business-hub-card active" href={card.href} key={card.title}>
                {content}
              </Link>
            ) : (
              <AppCard className="business-hub-card" key={card.title}>
                {content}
              </AppCard>
            );
          })}
        </section>

        {counts.sales === 0 && counts.employees === 0 && !error ? (
          <EmptyState
            title={text.noDataYet}
            description={text.businessOperationsSubtitle}
            icon={<BriefcaseBusiness size={26} />}
          />
        ) : null}
      </DashboardPageShell>
      <style jsx global>{businessOperationsStyles}</style>
    </div>
  );
}

const businessOperationsStyles = `
  .business-ops-page {
    min-height: 100vh;
    background: var(--sfm-background);
    color: var(--sfm-foreground);
  }

  .business-ops-content {
    display: grid;
    gap: 18px;
  }

  .business-topbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }

  .business-loading {
    min-height: 60vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    color: var(--sfm-muted);
    font-weight: 800;
  }

  .business-spin {
    color: var(--sfm-primary);
    animation: business-spin 0.9s linear infinite;
  }

  @keyframes business-spin {
    to { transform: rotate(360deg); }
  }

  .business-alert {
    border: 1px solid rgba(239, 68, 68, 0.24);
    background: rgba(239, 68, 68, 0.10);
    color: #B91C1C;
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 850;
  }

  .business-hub-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    gap: 16px;
    align-items: stretch;
  }

  .business-hub-card {
    min-width: 0;
    min-height: 210px;
    display: grid;
    align-content: start;
    gap: 14px;
    padding: 18px;
    text-decoration: none;
    color: inherit;
  }

  .business-hub-card.active {
    border: 1px solid rgba(29, 140, 255, 0.18);
    background: var(--sfm-card);
    border-radius: 24px;
    box-shadow: 0 18px 42px rgba(3, 18, 37, 0.08);
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .business-hub-card.active:hover,
  .business-hub-card.active:focus-visible {
    transform: translateY(-3px);
    border-color: rgba(24, 212, 212, 0.42);
    box-shadow: 0 24px 54px rgba(3, 18, 37, 0.12);
    outline: 2px solid rgba(24, 212, 212, 0.22);
    outline-offset: 2px;
  }

  .business-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: #EAF6FF;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    box-shadow: 0 14px 30px rgba(29, 140, 255, 0.20);
  }

  .business-hub-card h2 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 1.15rem;
  }

  .business-hub-card p {
    margin: 8px 0 0;
    color: var(--sfm-muted);
    line-height: 1.7;
  }

  .business-card-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid rgba(29, 140, 255, 0.12);
  }

  .business-card-foot span {
    color: var(--sfm-muted);
    font-weight: 850;
    font-size: 0.9rem;
  }

  .business-card-foot strong {
    color: var(--sfm-primary);
    font-weight: 950;
  }

  .business-card-foot.muted strong {
    color: var(--sfm-muted);
  }

  .dark .business-alert {
    color: #FCA5A5;
    background: rgba(239, 68, 68, 0.14);
  }

  @media (max-width: 720px) {
    .business-topbar {
      justify-content: space-between;
      align-items: flex-start;
    }

    .business-card-foot {
      display: grid;
    }
  }
`;
