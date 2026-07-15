'use client';

import { memo, useId } from 'react';

type InvestmentSparklineProps = {
  start: number;
  end: number;
  label: string;
  gain: boolean;
};

export const InvestmentSparkline = memo(function InvestmentSparkline({ start, end, label, gain }: InvestmentSparklineProps) {
  const titleId = useId();
  const delta = end - start;
  const range = Math.max(Math.abs(delta), Math.abs(start) * 0.025, 1);
  const startY = 28 - ((start - Math.min(start, end) + range * 0.15) / (range * 1.3)) * 20;
  const endY = 28 - ((end - Math.min(start, end) + range * 0.15) / (range * 1.3)) * 20;
  const midY = (startY + endY) / 2 + (gain ? 1.5 : -1.5);
  const path = `M2 ${startY.toFixed(2)} C24 ${startY.toFixed(2)}, 34 ${midY.toFixed(2)}, 50 ${midY.toFixed(2)} S76 ${endY.toFixed(2)}, 98 ${endY.toFixed(2)}`;

  return (
    <figure className={`invest-sparkline invest-sparkline--${gain ? 'gain' : 'loss'}`}>
      <figcaption>{label}</figcaption>
      <svg viewBox="0 0 100 36" role="img" aria-labelledby={titleId} preserveAspectRatio="none">
        <title id={titleId}>{label}</title>
        <path className="invest-sparkline-guide" d="M2 30 H98" />
        <path className="invest-sparkline-path" d={path} />
        <circle className="invest-sparkline-point" cx="98" cy={endY.toFixed(2)} r="2.4" />
      </svg>
    </figure>
  );
});
