'use client';

import { useState } from 'react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { OperationsCenterStateProvider, useOperationsCenterContext } from './OperationsCenterStateProvider';
import { OverviewTab } from './tabs/OverviewTab';
import { ProvidersTab } from './tabs/ProvidersTab';
import { MarketTab } from './tabs/MarketTab';
import { ErrorsTab } from './tabs/ErrorsTab';
import { BackgroundJobsTab } from './tabs/BackgroundJobsTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { AiTab } from './tabs/AiTab';
import { ShariahTab } from './tabs/ShariahTab';
import { LogsTab } from './tabs/LogsTab';

type TabId = 'overview' | 'providers' | 'market' | 'errors' | 'background_jobs' | 'performance' | 'ai' | 'shariah' | 'logs';

function OperationsCenterContent() {
  const { t, lang, dir } = useLanguage();
  const { ops, isLoading } = useOperationsCenterContext();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const attentionCount = ops ? ops.overview.criticalIssueCount + ops.overview.warningCount : undefined;
  const tabs: PageTabItem[] = [
    { id: 'overview', label: t('ops_center_tab_overview') },
    { id: 'providers', label: t('ops_center_tab_providers') },
    { id: 'market', label: t('ops_center_tab_market') },
    { id: 'errors', label: t('ops_center_tab_errors'), count: attentionCount },
    { id: 'background_jobs', label: t('ops_center_tab_background_jobs') },
    { id: 'performance', label: t('ops_center_tab_performance') },
    { id: 'ai', label: t('ops_center_tab_ai') },
    { id: 'shariah', label: t('ops_center_tab_shariah') },
    { id: 'logs', label: t('ops_center_tab_logs') },
  ];

  return (
    <main className="market-diagnostics-admin ops-center-admin" dir={dir}>
      <header className="market-diagnostics-hero">
        <div>
          <h1>{t('ops_center_title')}</h1>
          <p>{ops?.overview.lastSyncAt ? `${t('market_state_last_sync')}: ${formatDateTime(ops.overview.lastSyncAt, lang)}` : ''}</p>
        </div>
      </header>

      <PageTabs tabs={tabs} active={activeTab} onChange={id => setActiveTab(id as TabId)} ariaLabel={t('ops_center_title')} />

      <div className="ops-center-tab-panel" role="tabpanel" aria-busy={isLoading}>
        {!ops && isLoading ? (
          <p className="ops-center-loading" role="status">{t('ops_center_loading')}</p>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'providers' && <ProvidersTab />}
            {activeTab === 'market' && <MarketTab />}
            {activeTab === 'errors' && <ErrorsTab />}
            {activeTab === 'background_jobs' && <BackgroundJobsTab />}
            {activeTab === 'performance' && <PerformanceTab />}
            {activeTab === 'ai' && <AiTab />}
            {activeTab === 'shariah' && <ShariahTab />}
            {activeTab === 'logs' && <LogsTab />}
          </>
        )}
      </div>

      <style jsx global>{`
        .market-diagnostics-admin { max-width: 1160px; margin: 0 auto; padding: clamp(18px,3vw,30px) 16px 48px; display: grid; gap: 18px; color: var(--sfm-foreground); }
        .market-diagnostics-hero { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .market-diagnostics-hero > div { min-width: 0; }
        .market-diagnostics-hero h1 { color: var(--sfm-heading); font-size: clamp(26px,3vw,38px); line-height: 1.15; font-weight: 900; margin: 0; }
        .market-diagnostics-hero p { margin: 6px 0 0; color: var(--sfm-muted); font-size: 13px; }
        .ops-center-tab-panel { min-width: 0; display: grid; gap: 16px; }
        .ops-center-loading { margin: 0; padding: 20px; text-align: center; color: var(--sfm-muted); font-size: 13px; }
        @media (max-width: 420px) { .market-diagnostics-admin { padding-inline: 12px; } }
      `}</style>
    </main>
  );
}

export default function OperationsCenterClient() {
  return (
    <AdminDashboardShell ariaLabel="Operations Center" contentClassName="market-diagnostics-content" contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <OperationsCenterStateProvider>
        <OperationsCenterContent />
      </OperationsCenterStateProvider>
    </AdminDashboardShell>
  );
}
