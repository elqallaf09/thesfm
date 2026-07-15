import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  CircleX,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';

import styles from './MarketStatusStrip.module.css';

export type MarketStatusVisualState =
  | 'ready'
  | 'checking'
  | 'delayed'
  | 'limited'
  | 'unavailable'
  | 'unknown';

export interface MarketStatusIndicator {
  /** Presentation state selected by the caller; this component does not infer health. */
  state: MarketStatusVisualState;
  /** Localized, user-facing status text. */
  label: string;
  /** Optional localized explanation kept deliberately brief. */
  detail?: string;
}

export interface MarketStatusFact {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  valueDirection?: 'auto' | 'ltr' | 'rtl';
}

export interface MarketStatusTimestamp {
  /** Machine-readable source timestamp. Invalid values are not rendered. */
  value: string | number | Date | null | undefined;
  /** Localized label, for example the application's existing last-update label. */
  label: string;
  /** Localized display value prepared by the caller. */
  display: string;
}

export interface MarketStatusRefreshAction {
  label: string;
  pendingLabel: string;
  onRefresh: () => void;
  pending?: boolean;
  disabled?: boolean;
}

export interface MarketStatusStripProps {
  /** Localized accessible name for the complete strip. */
  ariaLabel: string;
  status: MarketStatusIndicator;
  facts?: readonly MarketStatusFact[];
  timestamp?: MarketStatusTimestamp;
  refreshAction?: MarketStatusRefreshAction;
  className?: string;
}

const STATUS_ICONS: Record<MarketStatusVisualState, LucideIcon> = {
  ready: CheckCircle2,
  checking: LoaderCircle,
  delayed: Clock3,
  limited: AlertTriangle,
  unavailable: CircleX,
  unknown: CircleHelp,
};

function validTimestamp(value: MarketStatusTimestamp['value']): string | null {
  if (value === null || value === undefined || value === '') return null;

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function MarketStatusStrip({
  ariaLabel,
  status,
  facts = [],
  timestamp,
  refreshAction,
  className,
}: MarketStatusStripProps) {
  const StatusIcon = STATUS_ICONS[status.state];
  const machineTimestamp = timestamp ? validTimestamp(timestamp.value) : null;
  const visibleFacts = facts.filter(fact => fact.label.trim() && String(fact.value).trim());
  const showTimestamp = Boolean(machineTimestamp && timestamp?.label.trim() && timestamp.display.trim());
  const refreshing = refreshAction?.pending === true;
  const refreshLabel = refreshing ? refreshAction?.pendingLabel : refreshAction?.label;

  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      <section
        className={styles.strip}
        aria-label={ariaLabel}
        aria-busy={refreshing || status.state === 'checking'}
      >
      <div
        className={styles.status}
        data-state={status.state}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <StatusIcon
          className={status.state === 'checking' ? styles.spinning : undefined}
          size={17}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className={styles.statusCopy}>
          <strong dir="auto">{status.label}</strong>
          {status.detail ? <small dir="auto">{status.detail}</small> : null}
        </span>
      </div>

      {visibleFacts.length > 0 ? (
        <dl className={styles.facts}>
          {visibleFacts.map(fact => {
            const FactIcon = fact.icon;
            return (
              <div className={styles.fact} key={fact.id}>
                <dt dir="auto">
                  {FactIcon ? <FactIcon size={15} strokeWidth={1.9} aria-hidden="true" /> : null}
                  <span>{fact.label}</span>
                </dt>
                <dd dir={fact.valueDirection ?? 'auto'}>{fact.value}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {showTimestamp && timestamp && machineTimestamp ? (
        <div className={styles.timestamp}>
          <Clock3 size={15} strokeWidth={1.9} aria-hidden="true" />
          <span dir="auto">{timestamp.label}</span>
          <time dateTime={machineTimestamp} dir="auto">{timestamp.display}</time>
        </div>
      ) : null}

      {refreshAction && refreshLabel ? (
        <button
          className={styles.refresh}
          type="button"
          onClick={refreshAction.onRefresh}
          disabled={refreshAction.disabled || refreshing}
          aria-label={refreshLabel}
        >
          <RefreshCw
            className={refreshing ? styles.spinning : undefined}
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{refreshLabel}</span>
        </button>
      ) : null}
      </section>
    </div>
  );
}

export default MarketStatusStrip;
