'use client';

type EuropeNewsStatusBarProps = {
  labels: {
    lastUpdated: string;
    nextUpdate: string;
    delayed: string;
    source: string;
  };
  lastUpdated: string;
  nextUpdate: string;
  formatDateTime: (value: string) => string;
};

export function EuropeNewsStatusBar({ labels, lastUpdated, nextUpdate, formatDateTime }: EuropeNewsStatusBarProps) {
  return (
    <section className="europe-news-status-bar">
      <span className="europe-news-status-health" aria-hidden="true" />
      <span>{labels.lastUpdated}: {lastUpdated ? formatDateTime(lastUpdated) : '-'}</span>
      <span>{labels.nextUpdate}: {nextUpdate}</span>
      <strong>{labels.delayed}</strong>
      <span>{labels.source}</span>
    </section>
  );
}

export default EuropeNewsStatusBar;
