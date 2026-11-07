'use client';
import '@/app/tv/portfolio.css';
import { useEffect, useState } from 'react';
import { Pause, Play, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';
import { portfolioText, type PortfolioTextKey } from '@/lib/markets-tv/portfolioCopy';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvBroadcastPager } from './TvBroadcastPager';
import { useTvBroadcastPage, useTvPanelCount } from './useTvBroadcastPage';

const CLASSES = ['stocks', 'real-estate', 'gold-silver', 'crypto', 'funds', 'bonds', 'commodities', 'overview'] as const;
const CURRENCIES = ['KWD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'JPY'];
const formats = new Map<string, Intl.NumberFormat>();
function money(value: number | null, currency: string) {
  if (value === null || !Number.isFinite(value)) return '—';
  if (!formats.has(currency)) formats.set(currency, new Intl.NumberFormat('en-US', { minimumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(currency) ? 3 : 2, maximumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(currency) ? 3 : 2 }));
  return formats.get(currency)!.format(value);
}
export default function TvInvestments({ token, language, revision, now, onPair, onRefresh, autoRotate, onAutoRotateChange }: {
  token: string; language: TvLanguage; revision: number; now: number; onPair: () => void; onRefresh: () => void; autoRotate: boolean; onAutoRotateChange: (enabled: boolean) => void;
}) {
  const [currency, setCurrency] = useState(''), [assetClass, setAssetClass] = useState('all');
  useEffect(() => { try { const saved = localStorage.getItem('sfm_currency'); if (saved && /^[A-Z]{3}$/.test(saved)) setCurrency(saved); } catch { /* Account preference remains the default. */ } }, []);
  const resource = useTvResource<TvPortfolioSnapshot>(token ? `/api/tv/portfolio${currency ? `?currency=${currency}` : ''}` : null, 15000, token, revision);
  const playing = autoRotate;
  const data = resource.data, expired = resource.errorStatus === 401 || resource.errorStatus === 403;
  const { ref, count } = useTvPanelCount(6, 5.8, 2.7);
  const positions = data?.positions.filter(item => assetClass === 'all' || item.assetClass === assetClass) || [];
  const pages = Math.max(1, Math.ceil(positions.length / count));
  const { current, move } = useTvBroadcastPage(pages, playing && !expired, assetClass);
  const allocation = data?.allocation || [], allocationPages = Math.max(1, Math.ceil(allocation.length / 4));
  const allocationPage = useTvBroadcastPage(allocationPages, playing && !expired);
  const text = (key: PortfolioTextKey) => portfolioText(language, key);
  const displayCurrency = currency || data?.currency || 'KWD';
  const currencies = [...new Set([displayCurrency, ...CURRENCIES])];
  return <section className="tv-portfolio" aria-labelledby="tv-portfolio-title">
    <header className="tv-portfolio-heading"><div><h1 id="tv-portfolio-title"><WalletCards aria-hidden="true"/>{text('title')}</h1><p>{text('subtitle')}</p></div><div className="tv-portfolio-actions">
      {token && !expired && <><label>{text('assetClass')}<select aria-label={text('assetClass')} value={assetClass} onChange={event => { setAssetClass(event.target.value); move(0); }}><option value="all">{text('all')}</option>{CLASSES.map(value => <option key={value} value={value}>{text(value)}</option>)}</select></label><label>{text('currency')}<select aria-label={text('currency')} value={displayCurrency} onChange={event => { setCurrency(event.target.value); try { localStorage.setItem('sfm_currency', event.target.value); } catch { /* In-memory selection remains available. */ } }}>{currencies.map(code => <option key={code}>{code}</option>)}</select></label></>}
      <button aria-label={tvText(language, 'refresh')} onClick={onRefresh}><RefreshCw aria-hidden="true"/></button>
    </div></header>
    {!token || expired ? <div className="tv-portfolio-gate"><ShieldCheck aria-hidden="true"/><h2>{text(expired ? 'expired' : 'pair')}</h2><p>{text('pairHelp')}</p><button onClick={onPair}>{tvText(language, 'pair')}</button></div>
      : !data && resource.loading ? <div className="tv-loading" role="status"><RefreshCw className="tv-spin"/>{tvText(language, 'loading')}</div>
        : !data ? <div className="tv-portfolio-gate" role="status"><h2>{tvText(language, 'error')}</h2><button onClick={onRefresh}>{tvText(language, 'retry')}</button></div>
          : <>
            {resource.error && <p className="tv-portfolio-error" role="status">{text('failed')}</p>}
            <div className="tv-portfolio-metrics">
              <article><h2>{text('value')}</h2><strong dir="ltr">{money(data.totalValue, data.currency)} <small>{data.currency}</small></strong><p>{data.valueCoverage < data.total ? text('partial') : text('recorded')}</p></article>
              <article><h2>{text('capital')}</h2><strong dir="ltr">{money(data.totalCost, data.currency)} <small>{data.currency}</small></strong><p><bdi>{data.costCoverage} / {data.total}</bdi> · {text('recorded')}</p></article>
              <article><h2>{text('coverage')}</h2><strong dir="ltr">{data.valueCoverage} / {data.total}</strong><p>{data.valueCoverage < data.total ? text('noFx') : text('recorded')}</p></article>
              <article><h2>{text('positions')}</h2><strong dir="ltr">{data.total}</strong><p>THE SFM</p></article>
            </div>
            {!data.total ? <div className="tv-portfolio-gate"><WalletCards aria-hidden="true"/><h2>{text('empty')}</h2><p>{text('emptyHelp')}</p></div> : <div className="tv-portfolio-body">
              <section ref={ref} className="tv-portfolio-positions" aria-label={text('positions')}><header className="tv-broadcast-heading"><h2>{text('positions')} <bdi>{positions.length}</bdi></h2><div className="tv-portfolio-pagination"><TvBroadcastPager page={current} pages={pages} language={language} move={move}/><button aria-label={tvText(language, playing ? 'pause' : 'resume')} aria-pressed={playing} onClick={() => onAutoRotateChange(!playing)}>{playing ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}</button></div></header>
                <div className="tv-portfolio-list">{positions.length ? positions.slice(current * count, (current + 1) * count).map(item => <article key={item.id} className="tv-portfolio-position" data-position={item.id}>
                  <div className="tv-portfolio-identity"><h3>{item.name || item.symbol || '—'}</h3><p><bdi>{item.symbol}</bdi>{item.quantity !== null && <span>{text('quantity')} <bdi>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(item.quantity)}</bdi></span>}</p></div>
                  <div className="tv-portfolio-amount"><small>{text('value')}</small><strong dir="ltr">{money(item.baseValue ?? item.value?.amount ?? null, item.baseValue !== null ? data.currency : item.value?.currency || data.currency)}</strong><bdi>{item.baseValue !== null ? data.currency : item.value?.currency || '—'}</bdi></div>
                  <div className="tv-portfolio-amount"><small>{text('capital')}</small><strong dir="ltr">{money(item.baseCost, data.currency)}</strong><bdi>{item.baseCost !== null ? data.currency : '—'}</bdi></div>
                  <footer><span>{item.platform || text(item.assetClass as PortfolioTextKey)}</span><span data-freshness={item.freshness}>{item.source || text('manual')} · {item.valuedAt ? `${text(item.freshness)} · ${tvQuoteTime(item.valuedAt, language, now)}` : text('missing')}</span></footer>
                </article>) : <p className="tv-portfolio-empty">{text('emptyFilter')}</p>}</div>
              </section>
              <aside className="tv-portfolio-allocation"><header className="tv-broadcast-heading"><h2>{text('allocation')}</h2><TvBroadcastPager page={allocationPage.current} pages={allocationPages} language={language} move={allocationPage.move}/></header><p>{text('allocationHelp')}</p>
                {allocation.length && (data.totalValue ?? 0) > 0 ? <div className="tv-allocation-list">{allocation.slice(allocationPage.current * 4, (allocationPage.current + 1) * 4).map(item => <div key={item.assetClass}><div><span>{text(item.assetClass as PortfolioTextKey)}</span><bdi>{((item.amount / data.totalValue!) * 100).toFixed(1)}%</bdi></div><meter min={0} max={data.totalValue!} value={item.amount} aria-label={text(item.assetClass as PortfolioTextKey)}/><bdi>{money(item.amount, data.currency)} {data.currency}</bdi></div>)}</div> : <p>{text('unavailable')}</p>}
              </aside>
            </div>}
            <footer className="tv-portfolio-footer"><span>{text('sync')}: <time dateTime={data.generatedAt} dir="ltr">{tvQuoteTime(data.generatedAt, language, now)}</time></span><p>{text('note')}</p>{pages > 1 && <span>{text('auto')}</span>}</footer>
          </>}
  </section>;
}
