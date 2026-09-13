'use client';

import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

export type MarketDataStatusTone = 'live' | 'delayed' | 'unavailable' | 'loading';

type MarketDataStatusProps = {
  tone: MarketDataStatusTone;
  lang: Lang;
  className?: string;
};

export function MarketDataStatus({ tone, lang, className }: MarketDataStatusProps) {
  const label = tone === 'loading'
    ? ({ ar: 'جارٍ التحميل', en: 'Loading', fr: 'Chargement' } as const)[lang]
    : tone === 'live'
    ? t('global_markets_strip_live', lang)
    : tone === 'delayed'
      ? t('global_markets_strip_delayed', lang)
      : t('global_markets_strip_unavailable', lang);

  return (
    <span className={`gm-data-status is-${tone}${className ? ` ${className}` : ''}`} role="status" title={label}>
      <span className="gm-data-status-dot" aria-hidden="true" />
      <span className="gm-data-status-label">{label}</span>
      <style jsx>{`
        .gm-data-status {
          display: inline-flex;
          inline-size: 128px;
          min-inline-size: 128px;
          max-inline-size: 128px;
          block-size: 24px;
          flex: 0 0 128px;
          align-items: center;
          gap: 5px;
          border-radius: var(--radius-pill);
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }

        .gm-data-status-label {
          min-inline-size: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gm-data-status-dot {
          flex: 0 0 6px;
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

        .gm-data-status.is-loading,
        .gm-data-status.is-delayed {
          background: var(--surface-muted);
          color: var(--foreground-secondary);
        }

        .gm-data-status.is-loading .gm-data-status-dot,
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
