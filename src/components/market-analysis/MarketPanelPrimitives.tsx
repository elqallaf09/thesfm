'use client';

import type { ReactNode } from 'react';
import { Activity, CalendarDays, Calculator, CheckCircle2, Clock3, LineChart, Search } from 'lucide-react';
import type { MarketServiceState, MarketTab } from './types';

export function MarketDefaultDashboard({
  t,
  onSearch,
  onOpenTab,
}: {
  t: (key: string) => string;
  onSearch: () => void;
  onOpenTab: (tab: MarketTab) => void;
}) {
  const modules: Array<{
    tab: MarketTab;
    icon: ReactNode;
    title: string;
    body: string;
    action: string;
    onClick: () => void;
  }> = [
    {
      tab: 'analyze',
      icon: <Search size={18} />,
      title: t('market_quick_analyze_title'),
      body: t('market_quick_analyze_body'),
      action: t('market_search_asset_action'),
      onClick: onSearch,
    },
    {
      tab: 'traderTools',
      icon: <Calculator size={18} />,
      title: t('market_trader_tools'),
      body: t('market_quick_trader_tools_body'),
      action: t('market_open_module'),
      onClick: () => onOpenTab('traderTools'),
    },
    {
      tab: 'economicCalendar',
      icon: <CalendarDays size={18} />,
      title: t('market_economic_calendar'),
      body: t('market_quick_calendar_body'),
      action: t('market_open_module'),
      onClick: () => onOpenTab('economicCalendar'),
    },
    {
      tab: 'sessions',
      icon: <Clock3 size={18} />,
      title: t('market_trading_sessions'),
      body: t('market_quick_sessions_body'),
      action: t('market_open_module'),
      onClick: () => onOpenTab('sessions'),
    },
  ];

  return (
    <div className="market-default-dashboard">
      <MarketEmptyState
        icon={<LineChart size={24} />}
        title={t('market_default_start_title')}
        description={t('market_default_start_body')}
        actionLabel={t('market_search_asset_action')}
        onAction={onSearch}
      />
      <section className="market-default-modules" aria-label={t('market_default_modules_title')}>
        <div className="market-default-section-head">
          <span>{t('market_default_modules_title')}</span>
        </div>
        <div className="market-quick-grid">
          {modules.map(module => (
            <article className="market-quick-card" key={module.tab}>
              <span className="market-quick-icon">{module.icon}</span>
              <div>
                <h3>{module.title}</h3>
                <p>{module.body}</p>
              </div>
              <button type="button" onClick={module.onClick}>
                {module.action}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MarketEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="market-empty-state">
      <span className="market-empty-state-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MarketStatusCard({
  icon,
  label,
  value,
  helper,
  tone,
  valueDir,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'muted';
  valueDir?: 'ltr' | 'rtl';
}) {
  return (
    <article className={`market-status-card${tone ? ` tone-${tone}` : ''}`}>
      <span className="market-status-icon">{icon}</span>
      <div className="market-status-body">
        <small>{label}</small>
        {tone ? (
          <span className={`market-status-badge ${tone}`} dir={valueDir}>{value}</span>
        ) : (
          <strong className="market-status-value" dir={valueDir}>{value}</strong>
        )}
        {helper ? <p>{helper}</p> : null}
      </div>
    </article>
  );
}

export function MarketStatusBanner({
  t,
  state,
  serviceNotice,
}: {
  t: (key: string) => string;
  state: MarketServiceState;
  serviceNotice: string;
}) {
  const connected = state === 'connected';
  return (
    <section className={`market-status-banner ${connected ? 'connected' : 'preparing'}`} role="status">
      {connected ? <CheckCircle2 size={19} /> : <Activity size={19} />}
      <div>
        <strong>{connected ? t('market_service_connected_title') : t('market_preparing_analysis')}</strong>
        <p>{connected ? `${t('market_data_source')}: Yahoo Finance` : serviceNotice || t('market_preparing_analysis_body')}</p>
      </div>
    </section>
  );
}
