import { useId } from 'react';
import { CandlestickChart } from 'lucide-react';

import styles from './MarketCommandCenterHeader.module.css';

export interface MarketCommandCenterHeaderProps {
  /** Short, localized context shown above the page title. */
  eyebrow?: string;
  /** Localized page title. */
  title: string;
  /** Localized supporting copy. */
  description?: string;
  /** Optional stable heading id for external aria relationships. */
  headingId?: string;
  className?: string;
}

export function MarketCommandCenterHeader({
  eyebrow,
  title,
  description,
  headingId,
  className,
}: MarketCommandCenterHeaderProps) {
  const generatedHeadingId = useId();
  const resolvedHeadingId = headingId ?? generatedHeadingId;

  return (
    <header
      className={[styles.header, className].filter(Boolean).join(' ')}
      aria-labelledby={resolvedHeadingId}
    >
      <span className={styles.icon} aria-hidden="true">
        <CandlestickChart size={24} strokeWidth={1.8} />
      </span>

      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow} dir="auto">{eyebrow}</p> : null}
        <h1 id={resolvedHeadingId} dir="auto">{title}</h1>
        {description ? <p className={styles.description} dir="auto">{description}</p> : null}
      </div>
    </header>
  );
}

export default MarketCommandCenterHeader;
