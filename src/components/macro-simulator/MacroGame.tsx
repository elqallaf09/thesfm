'use client';
import { useId, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { ASSETS } from '../../domain/macro-simulator/engine';
import { ROUND_IDS, advanceRound, draftAllocation, gameSummary, roundInput, settleRound, startGame, valueOf, type Allocation, type GameState } from '../../domain/macro-simulator/game';
import { assetLabels, caseLabels, eventLabels, regimeLabels, units } from './copy';
import { gameCopy, roundCopy, type GameCopyKey, type GameLanguage } from './game-copy';
import { GameSessionControls } from './GameSessionControls';
import { type RestoredGame } from '../../domain/macro-simulator/game-session';
import styles from './game.module.css';

const initialWeights = () => draftAllocation(startGame().holdings);
const numericValue = (value: number) => Number.isFinite(value) ? value : '';
const currency = (lang: GameLanguage, value: number) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const percentage = (lang: GameLanguage, value: number, signed = true) => `${signed && value > 0.00001 ? '+' : ''}${new Intl.NumberFormat(`${lang}-u-nu-latn`, { maximumFractionDigits: 2 }).format(Math.abs(value) < 0.00001 ? 0 : value)}%`;

function BalanceChart({ game, lang }: { game: GameState; lang: GameLanguage }) {
  const id = useId();
  const player = [game.initialCapital, ...game.history.map(round => round.endingValue)];
  const benchmark = [game.initialCapital, ...game.history.map(round => round.benchmarkEnd)];
  const values = [...player, ...benchmark];
  const padding = Math.max(1, (Math.max(...values) - Math.min(...values)) * 0.15);
  const low = Math.min(...values) - padding; const high = Math.max(...values) + padding;
  const points = (series: number[]) => series.map((value, index) => `${30 + index * 500 / ROUND_IDS.length},${140 - (value - low) * 120 / (high - low)}`).join(' ');
  return <figure className={styles.chartFigure}>
    <figcaption>{gameCopy.chart[lang]}</figcaption>
    <p className={styles.muted}>{gameCopy.chartNote[lang]}</p>
    <svg className={styles.chart} viewBox="0 0 560 170" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{gameCopy.chart[lang]}</title><desc id={`${id}-description`}>{gameCopy.chartNote[lang]}</desc>
      <line x1="30" x2="530" y1="150" y2="150" className={styles.axis} />
      <polyline points={points(benchmark)} className={styles.benchmarkLine} fill="none" strokeWidth="2" />
      <polyline points={points(player)} className={styles.playerLine} fill="none" strokeWidth="2.5" />
      {player.map((value, index) => <g key={index}><circle cx={30 + index * 500 / ROUND_IDS.length} cy={140 - (value - low) * 120 / (high - low)} r="3" className={styles.playerDot} /><text x={30 + index * 500 / ROUND_IDS.length} y="167" textAnchor="middle">{index}</text></g>)}
    </svg>
    <div className={styles.legend}><span>{gameCopy.you[lang]} ━</span><span>{gameCopy.benchmark[lang]} ┄</span></div>
  </figure>;
}

export function MacroGame({ userKey }: { userKey: string }) {
  const { lang: selectedLanguage } = useLanguage();
  const lang: GameLanguage = selectedLanguage === 'en' || selectedLanguage === 'fr' ? selectedLanguage : 'ar';
  const t = (key: GameCopyKey) => gameCopy[key][lang];
  const money = (value: number) => currency(lang, value);
  const percent = (value: number) => percentage(lang, value);
  const [capital, setCapital] = useState(100000);
  const [game, setGame] = useState<GameState | null>(null);
  const [action, setAction] = useState<'hold' | 'rebalance'>('hold');
  const [weights, setWeights] = useState<Allocation>(initialWeights);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<GameCopyKey | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const total = valueOf(weights);
  const validWeights = ASSETS.every(asset => Number.isFinite(weights[asset]) && weights[asset] >= 0 && weights[asset] <= 100) && Math.abs(total - 100) <= 1e-8;
  const summary = game ? gameSummary(game) : null;
  const currentRound = game ? ROUND_IDS[game.roundIndex] : ROUND_IDS[0];
  const assumptions = roundInput(game?.roundIndex ?? 0);
  const locked = !!game && game.phase !== 'planning';
  const result = game?.phase === 'revealed' ? game.history[game.history.length - 1] : null;
  function resume(saved: RestoredGame) {
    setGame(saved.game); setCapital(saved.game.initialCapital); setAction(saved.draft.action);
    setWeights(saved.draft.weights); setRationale(saved.draft.rationale); setError(null); setConfirmReset(false);
  }
  function begin() {
    try { const next = startGame(capital); setGame(next); setWeights(draftAllocation(next.holdings)); setAction('hold'); setRationale(''); setError(null); }
    catch { setError('invalid'); }
  }
  function reveal() {
    if (!game) return;
    try {
      const decision = action === 'hold' ? { action, rationale } as const : { action, rationale, weights } as const;
      setGame(settleRound(game, decision)); setError(null);
    } catch (issue) {
      setError(issue instanceof Error && issue.message === 'weights' ? 'weightsError' : issue instanceof Error && issue.message === 'rationale' ? 'rationaleError' : 'invalid');
    }
  }
  function next() {
    if (!game) return;
    try { const advanced = advanceRound(game); setGame(advanced); setAction('hold'); setWeights(draftAllocation(advanced.holdings)); setRationale(''); setError(null); }
    catch { setError('invalid'); }
  }
  return <WorkspacePageContainer variant="full" className={styles.page}>
    <div data-testid="macro-game" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={styles.stack}>
      <header className={styles.hero}><p className={styles.eyebrow} dir="ltr">SFM / SIM LAB · GAME</p><h1>{t('title')}</h1><p>{t('subtitle')}</p></header>
      <p className={styles.notice}>{t('disclaimer')}</p>
      <GameSessionControls userKey={userKey} lang={lang} game={game} draft={{ action, rationale, weights }} onResume={resume} />
      {error ? <p role="alert" className={styles.error}>{t(error)}</p> : null}
      <ol className={styles.rounds} aria-label={t('round')}>{ROUND_IDS.map((round, index) => <li key={round} aria-current={game && game.roundIndex === index && game.phase !== 'finished' ? 'step' : undefined} className={styles.round}><span className={styles.number} dir="ltr">0{index + 1}</span><strong>{roundCopy[round].title[lang]}</strong></li>)}</ol>
      {!game ? <section className={styles.card}><h2>{t('start')}</h2><p>{t('incremental')}</p><form onSubmit={event => { event.preventDefault(); begin(); }} className={styles.startForm}><label className={styles.field}>{t('capital')}<input type="number" required min={1} max={1e9} step="any" dir="ltr" value={numericValue(capital)} onChange={event => setCapital(event.target.valueAsNumber)} /></label><button className={styles.primary} type="submit">{t('start')}</button></form></section> : <>
        {summary ? <section className={styles.metrics} aria-label={t('current')}>
          <article className={styles.card}><span>{t('current')}</span><strong dir="ltr">{money(summary.current)}</strong><small>{t('cumulative')}: <bdi>{percent(summary.totalReturn)}</bdi></small></article>
          <article className={styles.card}><span>{t('benchmark')}</span><strong dir="ltr">{money(summary.benchmark)}</strong><small><bdi>{percent(summary.benchmarkReturn)}</bdi></small></article>
          <article className={styles.card}><span>{t('difference')}</span><strong dir="ltr" data-testid="macro-game-difference">{money(summary.difference)}</strong><small>{t('drawdown')}: <bdi>{percentage(lang, summary.maxDrawdown, false)}</bdi></small></article>
        </section> : null}
        {game.phase === 'finished' ? <section className={styles.card} data-testid="macro-game-complete" role="status"><h2>{t('finished')}</h2><p>{t('reflection')}</p><p className={styles.muted}>{t('drawdownNote')}</p></section> : <div className={styles.workspace}>
          <div className={styles.stack}>
            <section className={styles.card}><p className={styles.eyebrow}>{t('round')} <bdi>{game.roundIndex + 1} / {ROUND_IDS.length}</bdi></p><h2>{roundCopy[currentRound].title[lang]}</h2><h3>{t('known')}</h3><p>{roundCopy[currentRound].intro[lang]}</p><p className={styles.muted}>{t('context')}: {regimeLabels[assumptions.regime][lang]} · {t('horizon')}</p>
              <div className={styles.facts}>{assumptions.shocks.map(shock => <p key={shock.kind}>{eventLabels[shock.kind][lang]}: <bdi>{shock.magnitude}</bdi> {units[shock.kind][lang]}</p>)}</div>
            </section>
            <form className={styles.card} onSubmit={event => { event.preventDefault(); reveal(); }} data-testid="macro-game-decision">
              <h2>{t('action')}</h2>
              <label className={styles.field}>{t('action')}<select value={action} disabled={locked} onChange={event => { setAction(event.target.value as 'hold' | 'rebalance'); setError(null); }}><option value="hold">{t('hold')}</option><option value="rebalance">{t('rebalance')}</option></select></label>
              <fieldset className={styles.allocations} disabled={locked || action === 'hold'}><legend>{t('allocation')}</legend>{ASSETS.map(asset => <label className={styles.allocation} key={asset}><span>{assetLabels[asset][lang]}</span><input type="number" dir="ltr" required min={0} max={100} step="any" aria-label={`${assetLabels[asset][lang]} (%)`} value={numericValue(weights[asset])} onChange={event => { setWeights(previous => ({ ...previous, [asset]: event.target.valueAsNumber })); setError(null); }} /><span>%</span></label>)}</fieldset>
              <p className={styles.muted}>{t('allocationNote')}</p><p className={validWeights ? styles.muted : styles.error}>{t('total')}: <bdi>{Number.isFinite(total) ? percentage(lang, total, false) : '—'}</bdi></p>
              {action === 'rebalance' && !validWeights ? <p className={styles.error}>{t('weightsError')}</p> : null}
              <label className={styles.field}>{t('rationale')}<textarea rows={4} maxLength={600} disabled={locked} value={rationale} onChange={event => { setRationale(event.target.value); setError(null); }} aria-describedby="macro-game-rationale-hint" /></label><p id="macro-game-rationale-hint" className={styles.muted}>{t('rationaleHint')}</p>
              {locked ? <p className={styles.notice}>{t('locked')}</p> : <button type="submit" className={styles.primary} disabled={action === 'rebalance' && !validWeights} data-testid="macro-game-reveal">{t('reveal')}</button>}
            </form>
          </div>
          <div className={styles.stack}>{result ? <section className={styles.card} data-testid="macro-game-outcome" aria-live="polite"><h2>{t('outcome')}</h2><p>{t('pathNote')}</p>
            <div className={styles.paths}>{result.paths.map(path => <article key={path.id} className={styles.path}><h3>{caseLabels[path.id][lang]}</h3><strong dir="ltr">{percent(path.impact)}</strong><span dir="ltr">{money(path.value)}</span></article>)}</div>
            <p className={styles.notice}>{roundCopy[currentRound].lesson[lang]}</p>
            <details><summary>{t('attribution')}</summary><div className={styles.scroll} tabIndex={0} role="region" aria-label={t('attribution')}><table className={styles.table}><caption>{t('attribution')}</caption><thead><tr><th scope="col">{t('allocation')}</th><th scope="col">{t('assetChange')}</th><th scope="col">{t('contribution')}</th></tr></thead><tbody>{ASSETS.map(asset => <tr key={asset}><th scope="row">{assetLabels[asset][lang]}</th><td><bdi>{percent(result.returns[asset])}</bdi></td><td><bdi>{money(result.contributions[asset])}</bdi></td></tr>)}</tbody></table></div></details>
            <button type="button" className={styles.primary} onClick={next} data-testid="macro-game-next">{game.roundIndex === ROUND_IDS.length - 1 ? t('finish') : t('next')}</button>
          </section> : <section className={`${styles.card} ${styles.empty}`}><span className={styles.number} aria-hidden="true">SFM</span><h2>{t('empty')}</h2><p className={styles.muted}>{t('pathNote')}</p></section>}</div>
        </div>}
        {game.history.length ? <section className={styles.card}><BalanceChart game={game} lang={lang} /><p className={styles.muted}>{t('benchmarkNote')}</p><p className={styles.muted}>{t('incremental')}</p>
          <h2>{t('journal')}</h2><div className={styles.scroll} tabIndex={0} role="region" aria-label={t('journal')}><table className={styles.table} data-testid="macro-game-journal"><caption>{t('journal')}</caption><thead><tr><th scope="col">{t('round')}</th><th scope="col">{t('action')}</th><th scope="col">{t('before')}</th><th scope="col">{t('after')}</th><th scope="col">{t('benchmark')}</th></tr></thead><tbody>{game.history.map(round => <tr key={round.round}><th scope="row">{roundCopy[round.round].title[lang]}</th><td>{t(round.decision.action)}</td><td><bdi>{money(round.startingValue)}</bdi></td><td><bdi>{money(round.endingValue)}</bdi></td><td><bdi>{money(round.benchmarkEnd)}</bdi></td></tr>)}</tbody></table></div>
          {game.history.map(round => <details key={round.round}><summary>{roundCopy[round.round].title[lang]} · {t('rationale')}</summary><p className={styles.rationale}>{round.decision.rationale}</p><p className={styles.muted}>{roundCopy[round.round].lesson[lang]}</p></details>)}
        </section> : null}
        <div className={styles.card}>{confirmReset ? <div role="group" aria-label={t('confirmReset')} className={styles.stack}><p>{t('confirmReset')}</p><div className={styles.actions}><button className={styles.button} type="button" onClick={() => { setGame(null); setError(null); setConfirmReset(false); setRationale(''); }}>{t('confirm')}</button><button className={styles.button} type="button" onClick={() => setConfirmReset(false)}>{t('cancel')}</button></div></div> : <button type="button" className={styles.button} onClick={() => setConfirmReset(true)}>{t('reset')}</button>}</div>
      </>}
    </div>
  </WorkspacePageContainer>;
}
