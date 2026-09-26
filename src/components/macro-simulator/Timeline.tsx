'use client';
import { useId } from 'react';
import type { Asset, Report } from '../../domain/macro-simulator/engine';
import { caseLabels, copy, horizonLabels, type Language } from './copy';
import styles from './lab.module.css';
export function Timeline({ report, asset, lang }: { report: Report; asset: Asset | 'portfolio'; lang: Language }) {
  const titleId = useId(); const descId = useId();
  const series = report.scenarios.map(s => ({ id: s.id, points: s.timeline.map(p => asset === 'portfolio' ? p.impact : p.returns[asset]) }));
  const bound = Math.max(1, ...series.flatMap(s => s.points.map(Math.abs))) * 1.2;
  const x = (i: number) => 55 + i * 88;
  const y = (v: number) => 115 - v / bound * 90;
  const format = (n: number) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(n);
  return <>
    <svg className={styles.chart} viewBox="0 0 740 265" role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>{copy.timeline[lang]}</title><desc id={descId}>{copy.timelineNote[lang]}</desc>
      {[-1, -0.5, 0, 0.5, 1].map(tick => <g key={tick}><line className={styles.gridLine} x1="55" x2="701" y1={y(tick * bound)} y2={y(tick * bound)} /><text x="46" y={y(tick * bound) + 4} textAnchor="end">{format(tick * bound)}%</text></g>)}
      {series.map(s => <polyline key={s.id} className={styles[s.id]} fill="none" strokeWidth="2.8" strokeLinejoin="round" points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />)}
      {report.scenarios[0].timeline.map((p, i) => <text key={p.time} x={x(i)} y="242" textAnchor="middle">{p.time === '0' ? '0' : horizonLabels[p.time][lang]}</text>)}
    </svg>
    <div className={styles.legend}>{series.map(s => <span key={s.id} className={styles[s.id]}>{caseLabels[s.id][lang]}</span>)}</div>
    <p className={styles.muted}>{copy.timelineNote[lang]}</p>
    <details><summary>{copy.chartTable[lang]}</summary><div className={styles.scroll}>
      <table className={styles.table}><caption>{copy.simulated[lang]} (%)</caption><thead><tr><th>{copy.horizon[lang]}</th>{series.map(s => <th key={s.id}>{caseLabels[s.id][lang]}</th>)}</tr></thead>
        <tbody>{report.scenarios[0].timeline.map((p, i) => <tr key={p.time}><th scope="row">{p.time === '0' ? copy.now[lang] : horizonLabels[p.time][lang]}</th>{series.map(s => <td dir="ltr" key={s.id}>{format(s.points[i])}%</td>)}</tr>)}</tbody>
      </table></div></details>
  </>;
}
