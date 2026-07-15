'use client';

import { memo, useId, useMemo } from 'react';

export type InvestmentHistoryPoint = {
  time: string;
  close: number;
};

type InvestmentSparklineProps = {
  points: InvestmentHistoryPoint[];
  label: string;
};

export const InvestmentSparkline = memo(function InvestmentSparkline({ points, label }: InvestmentSparklineProps) {
  const titleId = useId();
  const descriptionId = useId();
  const values = useMemo(() => points.map(point => point.close), [points]);
  const first = values[0] ?? 0;
  const last = values.at(-1) ?? first;
  const gain = last >= first;
  const { path, lastX, lastY } = useMemo(() => {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = Math.max(maximum - minimum, Math.abs(maximum) * 0.001, 1e-9);
    const coordinates = values.map((value, index) => ({
      x: 2 + (index / Math.max(values.length - 1, 1)) * 96,
      y: 31 - ((value - minimum) / range) * 24,
    }));
    return {
      path: coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' '),
      lastX: coordinates.at(-1)?.x ?? 98,
      lastY: coordinates.at(-1)?.y ?? 19,
    };
  }, [values]);

  return (
    <figure className={`invest-sparkline invest-sparkline--${gain ? 'gain' : 'loss'}`}>
      <figcaption><span aria-hidden="true">{gain ? '↗' : '↘'}</span>{label}</figcaption>
      <svg viewBox="0 0 100 36" role="img" aria-labelledby={`${titleId} ${descriptionId}`} preserveAspectRatio="none">
        <title id={titleId}>{label}</title>
        <desc id={descriptionId}>{`${first} – ${last}`}</desc>
        <path className="invest-sparkline-guide" d="M2 30 H98" />
        <path className="invest-sparkline-path" d={path} />
        <circle className="invest-sparkline-point" cx={lastX.toFixed(2)} cy={lastY.toFixed(2)} r="2.4" />
      </svg>
    </figure>
  );
});
