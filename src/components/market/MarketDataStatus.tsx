'use client';

import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

export type MarketDataStatusTone = 'live' | 'delayed' | 'unavailable';

type MarketDataStatusProps = {
  tone: MarketDataStatusTone;
  lang: Lang;
  className?: string;
};

export function MarketDataStatus({ tone, lang, className }: MarketDataStatusProps) {
  const label = tone === 'live'
    ? t('global_markets_strip_live', lang)
    : tone === 'delayed'
      ? t('global_markets_strip_delayed', lang)
      : t('global_markets_strip_unavailable', lang);

  return (
    <span className={`gm-data-status is-${tone}${className ? ` ${className}` : ''}`} role="status">
      <span className="gm-data-status-dot" aria-hidden="true" />
      {label}
      <style jsx>{`
        .gm-data-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: var(--radius-pill);
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }

        .gm-data-status-dot {
          inline-size: 6px;
          block-size: 6px;
          border-radius: var(--radius-pill);
        }

        .gm-data-status.is-live {
          background: var(--success-soft);
          color: var(--success);
        }

        .gm-data-status.is-live .gm-data-status-dot {
          background: var(--success);
        }

        .gm-data-status.is-delayed {
          background: var(--surface-muted);
          color: var(--foreground-secondary);
        }

        .gm-data-status.is-delayed .gm-data-status-dot {
          background: var(--foreground-muted);
        }

        .gm-data-status.is-unavailable {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .gm-data-status.is-unavailable .gm-data-status-dot {
          background: var(--danger);
        }
      `}</style>
    </span>
  );
}

export default MarketDataStatus;
