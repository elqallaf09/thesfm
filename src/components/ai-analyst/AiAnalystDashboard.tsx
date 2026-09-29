'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ArrowLeft, BarChart3, BrainCircuit, Clock3, Database, FileText, Globe2, Info, Layers3, Minus, Newspaper, Share2, ShieldCheck, Sparkles, Star, Target, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { AnalysisResult, IntelligenceEvidence, IntelligenceFactorKey } from '@/domain/intelligence/contracts';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { SFM_MARKET_INTELLIGENCE_ENGINE_NAME } from '@/lib/intelligence/branding';
import { useLanguage } from '@/hooks/useLanguage';
import { ASSET_TYPE_LABELS, HORIZON_LABELS, aiAnalystLocale } from './copy';
import { DASHBOARD_COPY, DASHBOARD_ENUMS, DASHBOARD_EVIDENCE_LABELS } from './analysisDashboardCopy';
import { chartSnapshotStats, dashboardEvidence, dashboardNews, directionTone, factorIsCurrent, factorScore, formatDashboardNumber, formatDashboardPrice, formatDashboardTime, rangeForHorizon, verifiedSharia, type DashboardTone, type VerifiedChartSnapshot } from './analysisDashboardModel';
import styles from './AiAnalystDashboard.module.css';

const VerifiedPriceChart = dynamic(() => import('./VerifiedPriceChart').then(module => module.VerifiedPriceChart), {
  ssr: false,
  loading: () => <div className={styles.chartSkeleton} aria-busy="true" />,
});

const FACTOR_ICONS: Partial<Record<IntelligenceFactorKey, LucideIcon>> = { TECHNICAL: BarChart3, FUNDAMENTAL: FileText, MACRO: Globe2, SENTIMENT: Sparkles };
const OVERVIEW_FACTORS = ['TECHNICAL', 'FUNDAMENTAL', 'MACRO', 'SENTIMENT'] as const;

function CardTitle({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return <h3 className={styles.cardTitle}><span className={styles.icon}><Icon size={21} aria-hidden="true" /></span>{title}</h3>;
}

function ReadingBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: DashboardTone }) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}

function Metric({ title, icon: Icon, children, note, tone = 'neutral' }: { title: string; icon: LucideIcon; children: ReactNode; note?: ReactNode; tone?: DashboardTone }) {
  return <article className={styles.metric} data-tone={tone}>
    <div className={styles.metricLabel}><span className={styles.icon}><Icon size={21} aria-hidden="true" /></span><h3>{title}</h3></div>
    <div className={styles.metricValue}>{children}</div>
    {note ? <div className={styles.note}>{note}</div> : null}
  </article>;
}

function EvidenceLine({ evidence, locale }: { evidence: IntelligenceEvidence; locale: 'ar' | 'en' | 'fr' }) {
  const key = evidence.labelKey.replace(/^intelligence_evidence_/, '');
  const label = DASHBOARD_EVIDENCE_LABELS[locale][key] ?? DASHBOARD_ENUMS[locale].factors[evidence.factor];
  const value = typeof evidence.value === 'number' ? formatDashboardNumber(evidence.value) : typeof evidence.value === 'boolean' ? null : evidence.value;
  return <li className={styles.evidenceLine} data-tone={directionTone(evidence.direction)}>
    <span className={styles.evidenceDot} aria-hidden="true" />
    <span>{label}{value !== null ? <>: <bdi>{value}{evidence.unit ? ` ${evidence.unit}` : ''}</bdi></> : null}</span>
  </li>;
}

export function AiAnalystDashboard({ result, actions, onOpenEvidence }: { result: AnalysisResult; actions: ReactNode; onOpenEvidence: () => void }) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = DASHBOARD_COPY[locale];
  const enums = DASHBOARD_ENUMS[locale];
  const titleId = useId();
  const [snapshot, setSnapshot] = useState<VerifiedChartSnapshot | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const stats = useMemo(() => chartSnapshotStats(snapshot), [snapshot]);
  const technical = result.factors.find(factor => factor.factor === 'TECHNICAL');
  const trend = factorIsCurrent(technical) && !result.staleData ? technical.directionalBias : 'UNAVAILABLE';
  const TrendIcon = trend === 'BULLISH' ? ArrowUpRight : trend === 'BEARISH' ? ArrowDownRight : Minus;
  const sharia = verifiedSharia(result.factors.find(factor => factor.factor === 'SHARIA'));
  const news = dashboardNews(result.factors.find(factor => factor.factor === 'NEWS'));
  const recommendationTone: DashboardTone = result.recommendation === 'BUY' ? 'positive' : result.recommendation === 'SELL' ? 'negative' : result.recommendation === 'WAIT' ? 'warning' : 'neutral';
  const confidence = Number.isFinite(result.confidence) && result.confidence >= 0 && result.confidence <= 100 ? result.confidence : null;
  const currentPrice = result.marketPrice.available ? formatDashboardPrice(result.marketPrice.value, result.marketPrice.currency) : copy.unavailable;
  const priceStatus = result.staleData ? copy.stale : !result.marketPrice.available ? copy.unavailable : result.marketPrice.dataStatus === 'LIVE' ? copy.live : result.marketPrice.dataStatus === 'DELAYED' ? copy.delayed : copy.cached;
  const keyEvidence = result.explanation.supportingFactors.concat(result.explanation.opposingFactors).flatMap(key => dashboardEvidence(result, key)).filter((item, index, items) => items.findIndex(other => other.id === item.id) === index).slice(0, 4);
  const horizon = HORIZON_LABELS[locale][result.horizon];
  const params = new URLSearchParams({ assetType: result.asset.assetType, horizon: result.horizon });
  const analysisHref = `/ai-analyst/analyze/${encodeURIComponent(result.asset.displaySymbol)}?${params}`;
  const allHorizonsHref = `${analysisHref}&horizons=all`;
  const assistantHref = `/ai-analyst/assistant?${new URLSearchParams({ symbol: result.asset.displaySymbol, assetType: result.asset.assetType })}`;

  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(analysisHref, window.location.origin).href);
      setShareStatus(copy.copied);
    } catch { setShareStatus(copy.copyFailed); }
  }

  return <section className={styles.dashboard} dir={dir} aria-labelledby={titleId} data-testid="ai-analyst-dashboard">
    <header className={styles.pageHeader}>
      <div className={styles.assetHeading}>
        <AssetIdentity variant="badge" symbol={result.asset.displaySymbol} name={result.asset.name} assetType={marketAssetTypeFromIntelligence(result.asset.assetType)} exchange={result.asset.exchange} market={result.asset.market} logoUrl={result.asset.logoUrl} size="sm" />
        <h2 id={titleId}>{copy.analysis} {result.asset.name} <bdi>({result.asset.displaySymbol})</bdi></h2>
        <p>{copy.subtitle}</p>
      </div>
      <div className={styles.headerActions}>
        <div className={styles.sourceStamp}><span className={styles.statusDot} data-current={!result.staleData && result.marketPrice.available && result.marketPrice.dataStatus === 'LIVE'} />{priceStatus}</div>
        <span className={styles.note}>{copy.updated}: <bdi>{formatDashboardTime(result.marketPrice.available ? result.marketPrice.observedAt : result.dataAsOf, locale)}</bdi></span>
        <div className={styles.actions}><Link className={styles.button} href="/ai-analyst/watchlist"><Star size={17} aria-hidden="true" />{copy.watchlist}</Link><button className={styles.button} type="button" onClick={() => void share()}><Share2 size={17} aria-hidden="true" />{copy.share}</button></div>
        <span className={styles.shareStatus} role="status">{shareStatus}</span>
        <div className={styles.actions} aria-label={copy.tools}>{actions}</div>
      </div>
    </header>

    <div className={styles.priceHero}>
      <article className={styles.trend} data-tone={directionTone(trend)}>
        <span className={styles.label}>{copy.trend}</span>
        <div><TrendIcon size={44} aria-hidden="true" /><strong>{enums.direction[trend]}</strong></div>
        <p>{horizon}</p>
      </article>
      <article className={styles.quote}>
        <div><span className={styles.label}>{copy.price}</span><strong className={styles.price} dir="ltr" data-testid="analyst-current-price">{currentPrice}</strong><span className={styles.note}><bdi>{result.asset.displaySymbol}</bdi> · <bdi>{result.asset.quoteCurrency ?? copy.unavailable}</bdi></span></div>
        {stats ? <div className={styles.change} data-tone={stats.change < 0 ? 'negative' : stats.change > 0 ? 'positive' : 'neutral'}><strong dir="ltr">{stats.changePercent > 0 ? '+' : ''}{formatDashboardNumber(stats.changePercent)}%</strong><span>{copy.periodChange}</span></div> : <div className={styles.note}>{copy.periodChange}<br />—</div>}
        <div className={styles.sparkline} data-tone={stats && stats.change < 0 ? 'negative' : 'positive'} aria-hidden="true">{stats ? <svg viewBox="0 0 220 78" preserveAspectRatio="none"><path d={stats.path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg> : null}</div>
      </article>
    </div>

    <div className={styles.metrics} data-testid="analyst-summary-metrics">
      <Metric title={copy.confidence} icon={Target} note={copy.confidenceNote}><bdi>{confidence === null ? '—' : `${formatDashboardNumber(confidence, 0)}%`}</bdi>{confidence !== null ? <progress value={confidence} max={100} aria-label={copy.confidence} /> : null}</Metric>
      <Metric title={copy.recommendation} icon={FileText} tone={recommendationTone} note={copy.notAdvice}>{enums.recommendation[result.recommendation]}</Metric>
      <Metric title={copy.horizon} icon={Clock3}>{horizon}</Metric>
      <Metric title={copy.risk} icon={TriangleAlert} tone={result.risk === 'LOW' ? 'positive' : result.risk === 'UNAVAILABLE' ? 'neutral' : result.risk === 'MEDIUM' ? 'warning' : 'negative'}>{enums.risk[result.risk]}</Metric>
      <Metric title={copy.sharia} icon={ShieldCheck} tone={sharia === 'compliant' ? 'positive' : sharia === 'non_compliant' ? 'negative' : sharia === 'needs_review' ? 'warning' : 'neutral'}>{copy[sharia]}</Metric>
    </div>

    <div className={styles.mainGrid} dir="ltr">
      <section className={`${styles.card} ${styles.chartCard}`} dir={dir}>
        <CardTitle title={copy.chart} icon={BarChart3} />
        <VerifiedPriceChart result={result} interactive initialRange={rangeForHorizon(result.horizon)} onSnapshot={setSnapshot} />
        <dl className={styles.chartStats}>
          {[[copy.price, currentPrice], [copy.periodStart, stats ? formatDashboardPrice(stats.first, snapshot?.currency ?? result.asset.quoteCurrency) : '—'], [copy.periodHigh, stats ? formatDashboardPrice(stats.high, snapshot?.currency ?? result.asset.quoteCurrency) : '—'], [copy.periodLow, stats ? formatDashboardPrice(stats.low, snapshot?.currency ?? result.asset.quoteCurrency) : '—']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="ltr">{value}</dd></div>)}
        </dl>
      </section>
      <section className={`${styles.card} ${styles.summary}`} dir={dir}>
        <CardTitle title={copy.summary} icon={BrainCircuit} />
        <ReadingBadge tone={recommendationTone}>{enums.recommendation[result.recommendation]}</ReadingBadge>
        <p>{result.recommendation === 'INSUFFICIENT_DATA' ? copy.insufficientNote : copy.readingNote}</p>
        <h4>{copy.keyPoints}</h4>
        {keyEvidence.length ? <ul className={styles.evidenceList}>{keyEvidence.map(item => <EvidenceLine key={item.id} evidence={item} locale={locale} />)}</ul> : <p className={styles.empty}>{copy.noEvidence}</p>}
        <div className={styles.summaryActions}><button className={styles.button} type="button" onClick={onOpenEvidence}>{copy.fullAnalysis}<ArrowLeft size={17} aria-hidden="true" /></button><Link className={styles.textLink} href={assistantHref}>{copy.assistant}</Link></div>
      </section>
    </div>

    <div className={styles.factorGrid} data-testid="analyst-factor-cards">
      {OVERVIEW_FACTORS.map(key => {
        const factor = result.factors.find(item => item.factor === key);
        const direction = factorIsCurrent(factor) ? factor.directionalBias : 'UNAVAILABLE';
        const score = factorScore(factor);
        const items = dashboardEvidence(result, key);
        return <section className={styles.card} key={key}>
          <CardTitle title={enums.factors[key]} icon={FACTOR_ICONS[key] ?? BarChart3} />
          <ReadingBadge tone={directionTone(direction)}>{factorIsCurrent(factor) ? enums.direction[direction] : copy.unavailable}</ReadingBadge>
          {key === 'SENTIMENT' && score !== null ? <div className={styles.sentiment}><meter min={-100} max={100} value={score} aria-label={copy.score} /><strong dir="ltr">{score > 0 ? '+' : ''}{formatDashboardNumber(score, 0)}</strong><span>{copy.score} <bdi>(-100 … +100)</bdi></span></div> : null}
          {items.length ? <ul className={styles.evidenceList}>{items.map(item => <EvidenceLine key={item.id} evidence={item} locale={locale} />)}</ul> : <p className={styles.empty}>{copy.noEvidence}</p>}
          {factorIsCurrent(factor) ? <p className={styles.factorSource}>{copy.source}: <bdi>{factor.source}</bdi>{factor.availability === 'PARTIAL' ? ` · ${copy.partial}` : ''}</p> : null}
        </section>;
      })}
    </div>

    <section className={styles.card}>
      <div className={styles.sectionHeader}><CardTitle title={copy.news} icon={Newspaper} /><Link href="/ai-analyst/news" className={styles.button}>{copy.allNews}<ArrowLeft size={16} aria-hidden="true" /></Link></div>
      {news.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={copy.news}><table className={styles.newsTable}><thead><tr><th scope="col">{copy.date}</th><th scope="col">{copy.headline}</th><th scope="col">{copy.impact}</th><th scope="col">{copy.source}</th></tr></thead><tbody>{news.map(item => <tr key={item.id}><td><bdi>{formatDashboardTime(item.observedAt, locale)}</bdi></td><td className={styles.headline}><span dir="auto">{item.headline}</span></td><td><ReadingBadge>{copy.unclassified}</ReadingBadge></td><td>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${copy.read}: ${item.headline}`}>{item.source}</a> : <bdi>{item.source}</bdi>}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>{copy.noNews}</p>}
    </section>

    <div className={styles.lowerGrid}>
      <section className={styles.card}><CardTitle title={copy.asset} icon={Info} /><dl className={styles.keyValues}>{[[copy.symbol, result.asset.displaySymbol], [copy.name, result.asset.name], [copy.type, ASSET_TYPE_LABELS[locale][result.asset.assetType]], [copy.currency, result.asset.quoteCurrency ?? copy.unavailable], [copy.exchange, result.asset.exchange ?? result.asset.market ?? copy.unavailable], [copy.provider, result.providerProvenance.selectedProvider ?? copy.unavailable]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl><Link className={styles.button} href="/ai-analyst/watchlist"><Star size={17} aria-hidden="true" />{copy.watchlist}</Link></section>
      <section className={styles.card}><CardTitle title={copy.forecasts} icon={Layers3} /><div className={styles.outlook}><span>{horizon}</span><ReadingBadge tone={recommendationTone}>{enums.recommendation[result.recommendation]}</ReadingBadge></div><dl className={styles.keyValues}><div><dt>{copy.confidence}</dt><dd><bdi>{confidence === null ? '—' : `${formatDashboardNumber(confidence, 0)}%`}</bdi></dd></div><div><dt>{copy.coverage}</dt><dd><bdi>{formatDashboardNumber(result.dataCompleteness.percentage, 0)}%</bdi></dd></div></dl><p className={styles.note}>{copy.noOtherHorizons}</p><Link className={styles.button} href={allHorizonsHref}>{copy.allHorizons}</Link></section>
      <section className={styles.card}><CardTitle title={copy.levels} icon={Target} /><dl className={styles.priceLevels}><div><dt>{copy.rangeHigh}</dt><dd dir="ltr">{result.targets.available ? formatDashboardPrice(result.targets.upper, result.targets.currency) : '—'}</dd></div><div className={styles.currentLevel}><dt>{copy.price}</dt><dd dir="ltr">{currentPrice}</dd></div><div><dt>{copy.rangeLow}</dt><dd dir="ltr">{result.targets.available ? formatDashboardPrice(result.targets.lower, result.targets.currency) : '—'}</dd></div></dl><p className={styles.note}>{copy.rangeNote}</p>{result.targets.available ? <p className={styles.factorSource}>{copy.source}: <bdi>{result.targets.source}</bdi> · {formatDashboardTime(result.targets.dataAsOf, locale)}</p> : <p className={styles.empty}>{copy.noEvidence}</p>}</section>
    </div>

    <footer className={`${styles.card} ${styles.engineFooter}`}>
      <div><CardTitle title={SFM_MARKET_INTELLIGENCE_ENGINE_NAME} icon={Database} /><p className={styles.note}>{copy.engineNote}</p></div>
      <dl className={styles.engineMeta}><div><dt>{copy.version}</dt><dd dir="ltr">v{result.engineVersion}</dd></div><div><dt>{copy.generated}</dt><dd><bdi>{formatDashboardTime(result.generatedAt, locale)}</bdi></dd></div><div><dt>{copy.provider}</dt><dd><bdi>{result.providerProvenance.selectedProvider ?? copy.unavailable}</bdi></dd></div></dl>
    </footer>
  </section>;
}
