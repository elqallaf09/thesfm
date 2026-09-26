'use client';
import { useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { ASSETS, EVENT_KINDS, FACTORS, HORIZONS, LIMITS, MODEL_VERSION, TEMPLATES, defaultInput, readSnapshot, simulate, snapshot, template, type Asset, type EventKind, type Horizon, type Input, type Regime, type Report, type Shock } from '../../domain/macro-simulator/engine';
import { assetLabels, caseLabels, copy, eventLabels, explanations, factorLabels, horizonLabels, regimeLabels, templateLabels, units, type CopyKey, type Language } from './copy';
import { Methodology } from './Methodology';
import { Timeline } from './Timeline';
import styles from './lab.module.css';
type Mode = 'lab' | 'challenge' | 'method';
type Guess = '' | 'positive' | 'negative' | 'neutral';
const direction = (value: number): Exclude<Guess, ''> => Math.abs(value) < 0.05 ? 'neutral' : value > 0 ? 'positive' : 'negative';
const fieldValue = (value: number) => Number.isFinite(value) ? value : '';
export function MacroLab({ userKey }: { userKey: string }) {
  const { lang: activeLanguage } = useLanguage();
  const lang: Language = activeLanguage === 'en' || activeLanguage === 'fr' ? activeLanguage : 'ar';
  const t = (key: CopyKey) => copy[key][lang];
  const [input, setInput] = useState<Input>(defaultInput);
  const [report, setReport] = useState<Report | null>(null);
  const [pinned, setPinned] = useState<Report | null>(null);
  const [mode, setMode] = useState<Mode>('lab');
  const [asset, setAsset] = useState<Asset | 'portfolio'>('gold');
  const [guess, setGuess] = useState<Guess>('');
  const [error, setError] = useState<CopyKey | null>(null);
  const [status, setStatus] = useState<CopyKey | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const storageKey = `sfm:macro-simulation:1:${userKey}`;
  const weightsTotal = ASSETS.reduce((sum, id) => sum + input.weights[id], 0);
  const weightsValid = Number.isFinite(weightsTotal) && Math.abs(weightsTotal - 100) < 0.001;
  const stale = !!report && JSON.stringify(report.input) !== JSON.stringify(input);
  const reference = report?.scenarios.find(s => s.id === 'reference');
  const number = (n: number, digits = 1) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { maximumFractionDigits: digits }).format(n);
  const percent = (n: number) => `${n >= 0.05 ? '+' : ''}${number(Math.abs(n) < 0.05 ? 0 : n)}%`;
  const money = (n: number) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  function edit(patch: Partial<Input>) { setInput(previous => ({ ...previous, ...patch })); setError(null); setStatus(null); }
  function editShock(index: number, patch: Partial<Shock>) { edit({ shocks: input.shocks.map((s, i) => i === index ? { ...s, ...patch } : s) }); }
  function replace(next: Input) { setInput(next); setReport(null); setGuess(''); setError(null); setStatus(null); }
  function run() {
    setError(null); setStatus(null);
    if (mode === 'challenge' && (!guess || input.notes.trim().length < 3)) { setError('challengeRequired'); return; }
    try { setReport(simulate(input)); } catch { setError(weightsValid ? 'invalid' : 'weights'); }
  }
  function save() {
    try { const data = snapshot(input); window.sessionStorage.setItem(storageKey, data); setStatus('saved'); setError(null); }
    catch { setError(weightsValid ? 'storageError' : 'weights'); }
  }
  function restore() {
    try { const value = window.sessionStorage.getItem(storageKey); if (!value) { setStatus('noSave'); return; } replace(readSnapshot(value)); setStatus('loaded'); }
    catch { setError('invalid'); }
  }
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([snapshot(input)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'sfm-macro-scenario-v1.json';
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('invalid'); }
  }
  const comparable = report && pinned && report.input.capital === pinned.input.capital && report.input.horizon === pinned.input.horizon && ASSETS.every(a => report.input.weights[a] === pinned.input.weights[a]);
  return <WorkspacePageContainer variant="full" className={styles.lab}>
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} data-testid="macro-lab">
      <header className={styles.hero}>
        <div><p className={styles.eyebrow} dir="ltr">SFM / SIM LAB · V2</p><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
        <div className={styles.heroBadges}><span className={styles.badge}>{t('badge')}</span><span className={styles.muted}>{t('noLive')}</span></div>
      </header>
      <p className={styles.notice}>{t('disclaimer')}</p>
      <div className={styles.toolbar}>
        <nav className={styles.tabs} aria-label={t('title')}>{(['lab', 'challenge', 'method'] as const).map(tab => <button type="button" key={tab} aria-pressed={mode === tab} onClick={() => { setMode(tab); setReport(null); setGuess(''); setError(null); setStatus(null); }}>{t(tab)}</button>)}</nav>
        <button type="button" className={styles.button} onClick={save}>{t('save')}</button><button type="button" className={styles.button} onClick={restore}>{t('load')}</button>
        <button type="button" className={styles.button} onClick={download}>{t('export')}</button><button type="button" className={styles.button} onClick={() => importRef.current?.click()}>{t('import')}</button>
        <input ref={importRef} type="file" hidden accept="application/json,.json" aria-label={t('import')} onChange={async event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
          try { if (file.size > 20000) throw new Error('size'); replace(readSnapshot(await file.text())); setStatus('loaded'); } catch { setError('invalid'); }
        }} />
      </div>
      {status ? <p role="status" className={styles.notice}>{t(status)}</p> : null}
      {error ? <p role="alert" className={styles.error}>{t(error)}</p> : null}
      {mode === 'method' ? <Methodology lang={lang} /> : <>
        <section className={styles.presets} aria-label={t('presets')}>{TEMPLATES.map(id => <button type="button" key={id} onClick={() => replace(template(id))}>{templateLabels[id][lang]}</button>)}</section>
        <div className={styles.workspace}>
          <form className={styles.controls} onSubmit={event => { event.preventDefault(); run(); }}>
            <section className={styles.card}><h2><span className={styles.step}>01</span>{t('builder')}</h2>
              <label className={styles.field}>{t('scenarioName')}<input maxLength={100} value={input.title} placeholder={t('untitled')} onChange={e => edit({ title: e.target.value })} /></label>
              {input.shocks.map((shock, index) => <fieldset className={styles.shock} key={shock.kind}>
                <legend>{number(index + 1, 0)} · {eventLabels[shock.kind][lang]}</legend>
                <label className={styles.field}>{t('event')}<select value={shock.kind} onChange={e => editShock(index, { kind: e.target.value as EventKind, magnitude: e.target.value === 'rates' ? 25 : 1, expected: 0, pricedIn: 0 })}>
                  {EVENT_KINDS.map(kind => <option value={kind} key={kind} disabled={input.shocks.some((s, i) => i !== index && s.kind === kind)}>{eventLabels[kind][lang]}</option>)}
                </select></label>
                <div className={styles.fieldGrid}>
                  <label className={styles.field}>{t('magnitude')} ({units[shock.kind][lang]})<input required type="number" dir="ltr" {...LIMITS[shock.kind]} value={fieldValue(shock.magnitude)} onChange={e => editShock(index, { magnitude: e.target.valueAsNumber })} /></label>
                  {shock.kind === 'rates' ? <label className={styles.field}>{t('expected')} ({units.rates[lang]})<input required type="number" dir="ltr" min={-200} max={200} step={25} value={fieldValue(shock.expected)} onChange={e => editShock(index, { expected: e.target.valueAsNumber })} /></label>
                    : <label className={styles.field}>{t('priced')} (%)<input required type="number" dir="ltr" min={0} max={100} value={fieldValue(shock.pricedIn)} onChange={e => editShock(index, { pricedIn: e.target.valueAsNumber })} /></label>}
                </div>
                {shock.kind === 'rates' || shock.kind === 'gold' ? <p className={styles.muted}>{t(shock.kind === 'rates' ? 'rateNote' : 'goldNote')}</p> : null}
                {input.shocks.length > 1 ? <button type="button" className={styles.button} onClick={() => edit({ shocks: input.shocks.filter((_, i) => i !== index) })} aria-label={`${t('remove')} ${eventLabels[shock.kind][lang]}`}>{t('remove')}</button> : null}
              </fieldset>)}
              <button type="button" className={styles.button} disabled={input.shocks.length >= 4} onClick={() => {
                const kind = EVENT_KINDS.find(k => !input.shocks.some(s => s.kind === k));
                if (kind) edit({ shocks: [...input.shocks, { kind, magnitude: kind === 'rates' ? 25 : 1, expected: 0, pricedIn: 0 }] });
              }}>+ {t('add')}</button>
              <label className={styles.field}>{t('notes')}<textarea rows={3} maxLength={1200} value={input.notes} onChange={e => edit({ notes: e.target.value })} /></label><p className={styles.muted}>{t('notesHelp')}</p>
            </section>
            <section className={styles.card}><h2><span className={styles.step}>02</span>{t('world')}</h2>
              <label className={styles.field}>{t('world')}<select value={input.regime} onChange={e => edit({ regime: e.target.value as Regime })}>{(Object.keys(regimeLabels) as Regime[]).map(id => <option value={id} key={id}>{regimeLabels[id][lang]}</option>)}</select></label><p className={styles.muted}>{t('worldNote')}</p>
              <div className={styles.fieldGrid}><label className={styles.field}>{t('time')}<input required type="time" value={input.eventTime} onChange={e => edit({ eventTime: e.target.value })} /></label>
                <label className={styles.field}>{t('horizon')}<select value={input.horizon} onChange={e => edit({ horizon: e.target.value as Horizon })}>{HORIZONS.map(id => <option key={id} value={id}>{horizonLabels[id][lang]}</option>)}</select></label></div><p className={styles.muted}>{t('timeNote')}</p>
            </section>
            <section className={styles.card}><h2><span className={styles.step}>03</span>{t('portfolio')}</h2>
              <label className={styles.field}>{t('capital')}<input required type="number" dir="ltr" min={1} max={1e9} step="any" value={fieldValue(input.capital)} onChange={e => edit({ capital: e.target.valueAsNumber })} /></label>
              <div className={styles.allocations}>{ASSETS.map(id => <label className={styles.allocation} key={id}><span>{assetLabels[id][lang]}</span><input aria-label={`${assetLabels[id][lang]} (%)`} type="number" dir="ltr" required min={0} max={100} step="any" value={fieldValue(input.weights[id])} onChange={e => edit({ weights: { ...input.weights, [id]: e.target.valueAsNumber } })} /><span>%</span></label>)}</div>
              <p className={weightsValid ? styles.muted : styles.error}>{t('total')}: <b dir="ltr">{Number.isFinite(weightsTotal) ? number(weightsTotal, 2) : '—'}%</b></p>{!weightsValid ? <p>{t('weights')}</p> : null}
            </section>
            {mode === 'challenge' ? <section className={styles.card}><h2>{t('challengeTitle')}</h2><p>{t('challengeText')}</p><label className={styles.field}>{t('guess')}<select value={guess} required onChange={e => { setGuess(e.target.value as Guess); setReport(null); }}><option value="">{t('choose')}</option>{(['positive', 'negative', 'neutral'] as const).map(id => <option key={id} value={id}>{t(id)}</option>)}</select></label></section> : null}
            <button data-testid="macro-run" className={styles.primary} type="submit" disabled={!weightsValid}>{mode === 'challenge' ? t('reveal') : t('run')} <span aria-hidden="true">↗</span></button>
            <button className={styles.button} type="button" onClick={() => { replace(defaultInput()); setPinned(null); }}>{t('reset')}</button>
          </form>
          <div className={styles.canvas}>
            {!report || !reference ? <section className={`${styles.card} ${styles.empty}`}><div className={styles.orbit} aria-hidden="true">SFM</div><h2>{mode === 'challenge' ? t('challengeTitle') : t('empty')}</h2><p>{mode === 'challenge' ? t('challengeText') : t('noProbability')}</p><div className={styles.statusGrid}><span>{t('noLive')}</span><span>{t('noCalibration')}</span></div></section> : <>
              {stale ? <p className={styles.notice} role="status">{t('stale')}</p> : null}
              {mode === 'challenge' ? <p className={styles.notice}>{t(guess === direction(reference.returns.gold) ? 'matched' : 'unmatched')}</p> : null}
              <section className={styles.card} data-testid="macro-results" aria-live="polite"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{report.input.title || t('untitled')}</p><h2>{t('results')}</h2></div><span className={styles.badge}>{horizonLabels[report.input.horizon][lang]} · <bdi>{report.input.eventTime} UTC+3</bdi></span></div>
                <p className={styles.muted}>{t('noProbability')}</p><div className={styles.scenarios}>{report.scenarios.map(s => <article key={s.id} className={`${styles.scenario} ${styles[s.id]}`}><h3>{caseLabels[s.id][lang]}</h3><p>{t('portfolioImpact')}</p><strong dir="ltr" className={styles[direction(s.impact)]}>{percent(s.impact)}</strong><b dir="ltr">{money(s.value)}</b></article>)}</div>
                <button className={styles.button} type="button" onClick={() => setPinned(report)} disabled={stale}>{t('pin')}</button>
                {pinned ? <div className={styles.notice}><h3>{t('comparison')}</h3>{comparable ? <p>{t('delta')}: <bdi>{number(reference.impact - (pinned.scenarios.find(s => s.id === 'reference')?.impact ?? 0), 2)}</bdi></p> : <p>{t('incomparable')}</p>}</div> : null}
              </section>
              <section className={styles.card}><h2>{t('markets')}</h2><div className={styles.markets}>{ASSETS.map(id => <article className={styles.market} key={id}><span>{assetLabels[id][lang]}</span><strong dir="ltr" className={styles[direction(reference.returns[id])]}>{percent(reference.returns[id])}</strong><small>{t('simulated')}</small></article>)}</div></section>
              <section className={styles.card}><div className={styles.sectionHeading}><h2>{t('timeline')}</h2><label className={styles.field}>{t('chartAsset')}<select value={asset} onChange={e => setAsset(e.target.value as Asset | 'portfolio')}><option value="portfolio">{t('portfolio')}</option>{ASSETS.map(id => <option key={id} value={id}>{assetLabels[id][lang]}</option>)}</select></label></div><Timeline report={report} asset={asset} lang={lang} /></section>
              <section className={styles.card}><h2>{t('transmission')}</h2><p className={styles.muted}>{t('transmissionNote')}</p><div className={styles.eventChips}>{report.input.shocks.map(s => <span className={styles.badge} key={s.kind}>{eventLabels[s.kind][lang]}</span>)}</div><div className={styles.flow}>{FACTORS.map(f => <article key={f}><span>{factorLabels[f][lang]}</span><strong>{t(direction(reference.factors[f]))}</strong><span aria-hidden="true">↓</span></article>)}</div><p>{t('portfolioImpact')}: <bdi>{percent(reference.impact)}</bdi></p></section>
              <section className={styles.card}><h2>{t('interpreter')}</h2><p className={styles.muted}>{t('ruleBased')}</p>{report.input.shocks.map(s => <div className={styles.explanation} key={s.kind}><h3>{eventLabels[s.kind][lang]}</h3><p>{explanations[s.kind][lang]}</p></div>)}<h3>{t('reversal')}</h3><p>{t('reversalText')}</p><details><summary>{t('contribution')}</summary><div className={styles.scroll}><table className={styles.table}><caption>{t('contribution')}</caption><thead><tr><th>{t('chartAsset')}</th><th>{t('simulated')}</th></tr></thead><tbody>{ASSETS.map(a => <tr key={a}><th scope="row">{assetLabels[a][lang]}</th><td dir="ltr">{number(reference.contributions[a], 2)}</td></tr>)}</tbody></table></div></details></section>
            </>}
          </div>
        </div>
      </>}
      <footer className={styles.footer}><span dir="ltr">{MODEL_VERSION}</span><span>{t('noConfidence')}</span></footer>
    </div>
  </WorkspacePageContainer>;
}
