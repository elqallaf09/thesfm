'use client';

type GulfNewsStatusBarProps = {
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

export function GulfNewsStatusBar({ labels, lastUpdated, nextUpdate, formatDateTime }: GulfNewsStatusBarProps) {
  return (
    <section className="gulf-news-status-bar">
      <span>{labels.lastUpdated}: {lastUpdated ? formatDateTime(lastUpdated) : '-'}</span>
      <span>{labels.nextUpdate}: {nextUpdate}</span>
      <strong>{labels.delayed}</strong>
      <span>{labels.source}</span>
    </section>
  );
}

export default GulfNewsStatusBar;
