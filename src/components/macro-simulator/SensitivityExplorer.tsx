'use client';
import { useId, useMemo, useState } from 'react';
import { CASES, type CaseId, type EventKind, type Report } from '../../domain/macro-simulator/engine';
import { sensitivitySweep } from '../../domain/macro-simulator/sensitivity';
import { assetLabels, caseLabels, eventLabels, horizonLabels, units, type Language } from './copy';
import { sensitivityCopy } from './sensitivity-copy';
import shared from './lab.module.css';
import styles from './sensitivity.module.css';

type Props = {
  report: Report;
  lang: Language;
  stale: boolean;
  onApply: (kind: EventKind, magnitude: number) => void;
};

export function SensitivityExplorer({ report, lang, stale, onApply }: Props) {
  const id = useId();
  const [selectedKind, setSelectedKind] = useState<EventKind>(report.input.shocks[0].kind);
  const [caseId, setCaseId] = useState<CaseId>('reference');
  const kind = report.input.shocks.some(shock => shock.kind === selectedKind) ? selectedKind : report.input.shocks[0].kind;
  const sweep = useMemo(() => sensitivitySweep(report.input, kind, caseId), [report.input, kind, caseId]);
  const t = (key: keyof typeof sensitivityCopy) => sensitivityCopy[key][lang];
  const format = (value: number, signed = false) => new Intl.NumberFormat(`${lang}-u-nu-latn`, {
    maximumFractionDigits: 2, signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(Math.abs(value) < 0.000001 ? 0 : value);
  const series = [
    { label: assetLabels.gold[lang], values: sweep.points.map(point => point.returns.gold), className: styles.gold },
    { label: assetLabels.oil[lang], values: sweep.points.map(point => point.returns.oil), className: styles.oil },
    { label: t('portfolio'), values: sweep.points.map(point => point.impact), className: styles.portfolio },
  ];
  const bound = Math.max(0.1, ...series.flatMap(line => line.values.map(Math.abs))) * 1.15;
  const first = sweep.points[0].magnitude;
  const range = sweep.points[sweep.points.length - 1].magnitude - first;
  const x = (magnitude: number) => 72 + (magnitude - first) / range * 560;
  const y = (value: number) => 110 - value / bound * 85;
  const baseline = sweep.points.find(point => point.baseline)!;
  return <section className={shared.card} data-testid="macro-sensitivity" aria-labelledby={`${id}-heading`}>
    <div className={shared.sectionHeading}><h2 id={`${id}-heading`}>{t('title')}</h2><span className={shared.badge}>{horizonLabels[report.input.horizon][lang]}</span></div>
    <p className={shared.muted}>{t('intro')}</p>
    <div className={shared.fieldGrid}>
      <div className={shared.field}><label htmlFor={`${id}-shock`}>{t('shock')}</label><select id={`${id}-shock`} value={kind} onChange={event => setSelectedKind(event.target.value as EventKind)}>{report.input.shocks.map(shock => <option key={shock.kind} value={shock.kind}>{eventLabels[shock.kind][lang]}</option>)}</select></div>
      <div className={shared.field}><label htmlFor={`${id}-path`}>{t('path')}</label><select id={`${id}-path`} value={caseId} onChange={event => setCaseId(event.target.value as CaseId)}>{CASES.map(path => <option key={path} value={path}>{caseLabels[path][lang]}</option>)}</select></div>
    </div>
    <p className={shared.muted}>{t('fixed')}</p>
    {stale ? <p className={shared.notice} data-testid="macro-sensitivity-stale">{t('stale')}</p> : null}
    <figure className={styles.figure}>
      <figcaption>{t('chart')}</figcaption>
      <svg className={styles.chart} viewBox="0 0 680 240" role="img" aria-labelledby={`${id}-chart-title ${id}-chart-desc`}>
        <title id={`${id}-chart-title`}>{t('chart')}</title><desc id={`${id}-chart-desc`}>{t('note')}</desc>
        {[-1, 0, 1].map(tick => <g key={tick}><line className={styles.grid} x1="72" x2="632" y1={y(tick * bound)} y2={y(tick * bound)} /><text x="64" y={y(tick * bound) + 4} textAnchor="end">{format(tick * bound)}%</text></g>)}
        <line className={styles.baseline} x1={x(baseline.magnitude)} x2={x(baseline.magnitude)} y1="20" y2="200" />
        {series.map(line => <polyline key={line.label} className={line.className} fill="none" strokeWidth="2.5" points={line.values.map((value, index) => `${x(sweep.points[index].magnitude)},${y(value)}`).join(' ')} />)}
        {sweep.points.map(point => <text key={point.magnitude} x={x(point.magnitude)} y="225" textAnchor="middle">{format(point.magnitude)}</text>)}
      </svg>
      <div className={styles.legend}>{series.map(line => <span key={line.label} className={line.className}>{line.label}</span>)}</div>
      <p className={shared.muted}>{t('magnitude')} ({units[kind][lang]}) · {t('baseline')}: <bdi>{format(baseline.magnitude)}</bdi></p>
    </figure>
    <div className={shared.scroll} tabIndex={0} role="region" aria-label={t('table')}>
      <table className={`${shared.table} ${styles.table}`}>
        <caption>{t('table')}</caption>
        <thead><tr><th scope="col">{t('magnitude')} ({units[kind][lang]})</th><th scope="col">{assetLabels.gold[lang]} (%)</th><th scope="col">{assetLabels.oil[lang]} (%)</th><th scope="col">{t('portfolio')} (%)</th><th scope="col">{t('delta')}</th><th scope="col">{t('action')}</th></tr></thead>
        <tbody>{sweep.points.map(point => <tr key={point.magnitude} data-magnitude={point.magnitude} data-baseline={point.baseline ? 'true' : undefined}>
          <th scope="row"><bdi>{format(point.magnitude)}</bdi>{point.baseline ? <small className={styles.badge}>{t('baseline')}</small> : null}</th>
          <td><bdi>{format(point.returns.gold, true)}</bdi></td><td><bdi>{format(point.returns.oil, true)}</bdi></td><td><bdi>{format(point.impact, true)}</bdi></td><td><bdi>{format(point.deltaImpact, true)}</bdi></td>
          <td><button type="button" className={shared.button} disabled={stale || point.baseline} aria-label={`${t('apply')} ${format(point.magnitude)} ${units[kind][lang]}`} onClick={() => { if (!stale && !point.baseline) onApply(kind, point.magnitude); }}>{t('apply')}</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className={shared.muted}>{t('applyNote')}</p><p className={shared.notice}>{t('note')}</p>
  </section>;
}
