import Link from 'next/link';
import { ASSETS, FACTORS, MODEL_VERSION, SENSITIVITY } from '../../domain/macro-simulator/engine';
import { assetLabels, copy, factorLabels, type Language } from './copy';
import styles from './lab.module.css';
export function Methodology({ lang }: { lang: Language }) {
  return <section className={styles.card} data-testid="macro-methodology">
    <h2>{copy.method[lang]}</h2><p>{copy.methodologyText[lang]}</p><p>{copy.noProbability[lang]}</p><p>{copy.limitations[lang]}</p>
    <div className={styles.statusGrid}><span>{copy.noLive[lang]}</span><span>{copy.noCalibration[lang]}</span><span>{copy.noConfidence[lang]}</span></div>
    <details><summary>{copy.coefficients[lang]}</summary><div className={styles.scroll}><table className={styles.table}>
      <caption>{copy.coefficients[lang]} · <span dir="ltr">{MODEL_VERSION}</span></caption>
      <thead><tr><th>{copy.chartAsset[lang]}</th>{FACTORS.map(f => <th key={f}>{factorLabels[f][lang]}</th>)}</tr></thead>
      <tbody>{ASSETS.map(a => <tr key={a}><th scope="row">{assetLabels[a][lang]}</th>{FACTORS.map(f => <td key={f} dir="ltr">{SENSITIVITY[a][f]}</td>)}</tr>)}</tbody>
    </table></div></details>
    <p>{copy.sourceNote[lang]} <a href="https://www.federalreserve.gov/econres/feds/do-actions-speak-louder-than-words-the-response-of-asset-prices-to-monetary-policy-actions-and-statements.htm" target="_blank" rel="noopener noreferrer">FEDS 2004-66</a></p>
    <h3>{copy.roadmap[lang]}</h3><p>{copy.roadmapText[lang]}</p>
    <h3>{copy.engines[lang]}</h3><div className={styles.toolbar}><Link className={styles.button} href="/investments/gold-silver/intelligence">{copy.goldEngine[lang]}</Link><Link className={styles.button} href="/global-markets/oil-scenarios">{copy.oilEngine[lang]}</Link></div><p className={styles.muted}>{copy.connectionsNote[lang]}</p>
  </section>;
}
