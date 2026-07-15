'use client';

import { useId, type MouseEventHandler, type ReactNode } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  Clock3,
  Newspaper,
  Star,
} from 'lucide-react';

import styles from './MarketOverviewPanel.module.css';

export type MarketOverviewTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type MarketOverviewValueKind = 'text' | 'numeric';

export interface MarketOverviewCopy {
  eyebrow?: string;
  title: string;
  description?: string;
  assetHeading: string;
  assetUnavailable: string;
  activityHeading: string;
  sessionHeading: string;
  actionsHeading: string;
  actionsUnavailable: string;
}

export interface MarketOverviewAssetMeta {
  id: string;
  value: string;
  valueKind?: MarketOverviewValueKind;
}

export interface MarketOverviewAssetMetric {
  id: string;
  label: string;
  value: string;
  valueKind?: MarketOverviewValueKind;
  tone?: MarketOverviewTone;
}

export interface MarketOverviewAssetSnapshot {
  symbol: string;
  name: string;
  statusLabel?: string;
  statusTone?: MarketOverviewTone;
  metadata?: readonly MarketOverviewAssetMeta[];
  metrics?: readonly MarketOverviewAssetMetric[];
}

interface MarketOverviewCountBase {
  label: string;
  helper?: string;
  tone?: MarketOverviewTone;
}

export type MarketOverviewCountPresentation =
  | (MarketOverviewCountBase & {
      state: 'available';
      count: number;
    })
  | (MarketOverviewCountBase & {
      state: 'not-loaded' | 'unavailable';
      message: string;
    });

interface MarketOverviewSessionBase {
  label: string;
  tone?: MarketOverviewTone;
}

export type MarketOverviewSessionPresentation =
  | (MarketOverviewSessionBase & {
      state: 'available';
      status: string;
      detail?: string;
      timestamp?: string;
    })
  | (MarketOverviewSessionBase & {
      state: 'not-loaded' | 'unavailable';
      message: string;
      detail?: string;
    });

interface MarketOverviewActionBase {
  id: string;
  label: string;
  description?: string;
  ariaLabel?: string;
  icon?: ReactNode;
}

export type MarketOverviewAction =
  | (MarketOverviewActionBase & {
      kind: 'button';
      onClick: MouseEventHandler<HTMLButtonElement>;
      disabled?: boolean;
    })
  | (MarketOverviewActionBase & {
      kind: 'link';
      href: string;
    });

export interface MarketOverviewPanelProps {
  copy: MarketOverviewCopy;
  asset?: MarketOverviewAssetSnapshot | null;
  watchlist: MarketOverviewCountPresentation;
  alerts: MarketOverviewCountPresentation;
  upcomingEvents: MarketOverviewCountPresentation;
  news: MarketOverviewCountPresentation;
  session: MarketOverviewSessionPresentation;
  actions: readonly MarketOverviewAction[];
  className?: string;
  dir?: 'ltr' | 'rtl';
}

type CountItem = {
  id: string;
  icon: ReactNode;
  presentation: MarketOverviewCountPresentation;
};

function valueClassName(valueKind: MarketOverviewValueKind | undefined): string {
  return valueKind === 'numeric' ? styles.dataValue : styles.textValue;
}

function CountCard({ item }: { item: CountItem }) {
  const { presentation } = item;
  const tone = presentation.tone ?? 'neutral';

  return (
    <div
      className={styles.countCard}
      data-state={presentation.state}
      data-tone={tone}
    >
      <dt className={styles.countLabel}>
        <span className={styles.countIcon} aria-hidden="true">{item.icon}</span>
        <span>{presentation.label}</span>
      </dt>
      <dd className={styles.countContent}>
        {presentation.state === 'available' ? (
          <span className={styles.countValue} dir="ltr">{presentation.count}</span>
        ) : (
          <span className={styles.unavailableText}>{presentation.message}</span>
        )}
        {presentation.helper ? <small>{presentation.helper}</small> : null}
      </dd>
    </div>
  );
}

function OverviewAction({ action }: { action: MarketOverviewAction }) {
  const content = (
    <>
      {action.icon ? (
        <span className={styles.actionIcon} aria-hidden="true">{action.icon}</span>
      ) : null}
      <span className={styles.actionCopy}>
        <strong>{action.label}</strong>
        {action.description ? <small>{action.description}</small> : null}
      </span>
    </>
  );

  if (action.kind === 'link') {
    return (
      <a
        className={styles.action}
        href={action.href}
        aria-label={action.ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={styles.action}
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel}
    >
      {content}
    </button>
  );
}

export function MarketOverviewPanel({
  copy,
  asset,
  watchlist,
  alerts,
  upcomingEvents,
  news,
  session,
  actions,
  className,
  dir,
}: MarketOverviewPanelProps) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = `market-overview-title-${generatedId}`;
  const assetHeadingId = `market-overview-asset-${generatedId}`;
  const activityHeadingId = `market-overview-activity-${generatedId}`;
  const sessionHeadingId = `market-overview-session-${generatedId}`;
  const actionsHeadingId = `market-overview-actions-${generatedId}`;
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  const countItems: readonly CountItem[] = [
    { id: 'watchlist', icon: <Star size={17} />, presentation: watchlist },
    { id: 'alerts', icon: <Bell size={17} />, presentation: alerts },
    { id: 'upcoming-events', icon: <CalendarDays size={17} />, presentation: upcomingEvents },
    { id: 'news', icon: <Newspaper size={17} />, presentation: news },
  ];

  return (
    <section
      className={rootClassName}
      aria-labelledby={titleId}
      dir={dir}
      data-market-overview="true"
    >
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true"><Activity size={19} /></span>
        <div className={styles.headerCopy}>
          {copy.eyebrow ? <span className={styles.eyebrow}>{copy.eyebrow}</span> : null}
          <h2 id={titleId}>{copy.title}</h2>
          {copy.description ? <p>{copy.description}</p> : null}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.primaryColumn}>
          <section className={styles.assetCard} aria-labelledby={assetHeadingId}>
            <div className={styles.sectionHeading}>
              <h3 id={assetHeadingId}>{copy.assetHeading}</h3>
            </div>

            {asset ? (
              <div className={styles.assetContent}>
                <div className={styles.assetTopline}>
                  <div className={styles.assetIdentity}>
                    <span className={styles.ticker} dir="ltr">{asset.symbol}</span>
                    <strong>{asset.name}</strong>
                  </div>
                  {asset.statusLabel ? (
                    <span
                      className={styles.statusBadge}
                      data-tone={asset.statusTone ?? 'neutral'}
                    >
                      {asset.statusLabel}
                    </span>
                  ) : null}
                </div>

                {asset.metadata && asset.metadata.length > 0 ? (
                  <div className={styles.assetMeta}>
                    {asset.metadata.map(item => (
                      <span
                        key={item.id}
                        className={valueClassName(item.valueKind)}
                        dir={item.valueKind === 'numeric' ? 'ltr' : undefined}
                      >
                        {item.value}
                      </span>
                    ))}
                  </div>
                ) : null}

                {asset.metrics && asset.metrics.length > 0 ? (
                  <dl className={styles.assetMetrics}>
                    {asset.metrics.map(metric => (
                      <div
                        className={styles.assetMetric}
                        data-tone={metric.tone ?? 'neutral'}
                        key={metric.id}
                      >
                        <dt>{metric.label}</dt>
                        <dd
                          className={valueClassName(metric.valueKind)}
                          dir={metric.valueKind === 'numeric' ? 'ltr' : undefined}
                        >
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            ) : (
              <div className={styles.compactEmpty} data-state="not-loaded">
                <Activity size={18} aria-hidden="true" />
                <p>{copy.assetUnavailable}</p>
              </div>
            )}
          </section>

          <section className={styles.activitySection} aria-labelledby={activityHeadingId}>
            <div className={styles.sectionHeading}>
              <h3 id={activityHeadingId}>{copy.activityHeading}</h3>
            </div>
            <dl className={styles.countGrid}>
              {countItems.map(item => <CountCard item={item} key={item.id} />)}
            </dl>
          </section>
        </div>

        <div className={styles.secondaryColumn}>
          <section className={styles.sessionCard} aria-labelledby={sessionHeadingId}>
            <div className={styles.sectionHeadingWithIcon}>
              <span aria-hidden="true"><Clock3 size={17} /></span>
              <h3 id={sessionHeadingId}>{copy.sessionHeading}</h3>
            </div>
            <div
              className={styles.sessionContent}
              data-state={session.state}
              data-tone={session.tone ?? 'neutral'}
            >
              <span className={styles.sessionLabel}>{session.label}</span>
              {session.state === 'available' ? (
                <>
                  <strong>{session.status}</strong>
                  {session.timestamp ? (
                    <span className={styles.sessionTime} dir="ltr">{session.timestamp}</span>
                  ) : null}
                </>
              ) : (
                <strong className={styles.unavailableText}>{session.message}</strong>
              )}
              {session.detail ? <p>{session.detail}</p> : null}
            </div>
          </section>

          <section className={styles.actionsSection} aria-labelledby={actionsHeadingId}>
            <div className={styles.sectionHeading}>
              <h3 id={actionsHeadingId}>{copy.actionsHeading}</h3>
            </div>
            {actions.length > 0 ? (
              <div className={styles.actionGrid} role="group" aria-labelledby={actionsHeadingId}>
                {actions.map(action => <OverviewAction action={action} key={action.id} />)}
              </div>
            ) : (
              <div className={styles.compactEmpty} data-state="unavailable">
                <p>{copy.actionsUnavailable}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default MarketOverviewPanel;
