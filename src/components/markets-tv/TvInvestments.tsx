'use client';
import '@/app/tv/portfolio.css';
import { useEffect, useState } from 'react';
import { Building2, ChartPie, Coins, Landmark, Layers3, Package, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvPortfolioPosition, TvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';
import { metalFromSymbol } from '@/lib/metalVisuals';
import { portfolioText, type PortfolioTextKey } from '@/lib/markets-tv/portfolioCopy';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvBroadcastPager } from './TvBroadcastPager';
import { useTvBroadcastPage } from './useTvBroadcastPage';
import { TvAssetIcon } from './TvAssetIcon';

const CLASSES = ['stocks', 'real-estate', 'gold-silver', 'crypto', 'funds', 'bonds', 'commodities', 'overview'] as const;
const CURRENCIES = ['KWD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'JPY'];
const formats = new Map<string, Intl.NumberFormat>();
function InvestmentIcon({ position }: { position: TvPortfolioPosition }) {
  const symbol = position.symbol?.trim().toUpperCase() || '';
  if (position.assetClass === 'stocks' || position.assetClass === 'crypto') {
    return <TvAssetIcon quote={{ symbol, name: position.name, exchange: null }} group={position.assetClass === 'crypto' ? 'crypto' : 'world'}/>;
  }
  if (position.assetClass === 'gold-silver' || position.assetClass === 'commodities') {
    // Only classify physical holdings by metal name; a stock called Gold keeps its company identity.
    const name = position.name.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g, '');
    const metal = metalFromSymbol(symbol, 'commodity') || (/\bsilver\b|\bargent\b|فض[ةه]/i.test(name) ? 'silver' : /\bgold\b|ذهب/i.test(name) || (position.assetClass === 'gold-silver' && /\bor\b/i.test(name)) ? 'gold' : null);
    if (metal === 'gold' || metal === 'silver') return <TvAssetIcon quote={{ symbol: metal === 'gold' ? 'XAUUSD' : 'XAGUSD', name: position.name, exchange: null }} group="commodities"/>;
    if (symbol) return <TvAssetIcon quote={{ symbol, name: position.name, exchange: null }} group="commodities"/>;
  }
  const Icon = position.assetClass === 'real-estate' ? Building2 : position.assetClass === 'funds' ? ChartPie : position.assetClass === 'bonds' ? Landmark : position.assetClass === 'gold-silver' ? Coins : position.assetClass === 'commodities' ? Package : Layers3;
  return <span className="tv-asset-icon" aria-hidden="true" data-kind={position.assetClass}><Icon/></span>;
}
function money(value: number | null, currency: string) {
  if (value === null || !Number.isFinite(value)) return '—';
  if (!formats.has(currency)) formats.set(currency, new Intl.NumberFormat('en-US', { minimumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(currency) ? 3 : 2, maximumFractionDigits: ['KWD', 'BHD', 'OMR'].includes(currency) ? 3 : 2 }));
  return formats.get(currency)!.format(value);
}
export default function TvInvestments({ token, language, revision, now, onPair, onRefresh, autoRotate, suspended = false }: {
  token: string; language: TvLanguage; revision: number; now: number; onPair: () => void; onRefresh: () => void; autoRotate: boolean; suspended?: boolean; onAutoRotateChange: (enabled: boolean) => void;
}) {
  const [currency, setCurrency] = useState(''), [assetClass, setAssetClass] = useState('all'), [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => { try { const saved = localStorage.getItem('sfm_currency'); if (saved && /^[A-Z]{3}$/.test(saved)) setCurrency(saved); } catch { /* Account preference remains the default. */ } }, []);
  const resource = useTvResource<TvPortfolioSnapshot>(token ? `/api/tv/portfolio${currency ? `?currency=${currency}` : ''}` : null, 15000, token, revision);
  const playing = autoRotate;
  const data = resource.data, expired = resource.errorStatus === 401 || resource.errorStatus === 403;
  const positions = data?.positions.filter(item => assetClass === 'all' || item.assetClass === assetClass) || [];
  const allocation = data?.allocation || [], allocationPages = Math.max(1, Math.ceil(allocation.length / 4));
  const allocationPage = useTvBroadcastPage(allocationPages, playing && !expired && !suspended);
  const text = (key: PortfolioTextKey) => portfolioText(language, key);
  const displayCurrency = currency || data?.currency || 'KWD';
  const currencies = [...new Set([displayCurrency, ...CURRENCIES])];
  return <section className="tv-portfolio" aria-labelledby="tv-portfolio-title">
    <header className="tv-portfolio-heading"><div><h1 id="tv-portfolio-title"><WalletCards aria-hidden="true"/>{text('title')}</h1><p>{text('subtitle')}</p></div><div className="tv-portfolio-actions">
      {token && !expired && <><label>{text('assetClass')}<select aria-label={text('assetClass')} value={assetClass} onChange={event => setAssetClass(event.target.value)}><option value="all">{text('all')}</option>{CLASSES.map(value => <option key={value} value={value}>{text(value)}</option>)}</select></label><label>{text('currency')}<select aria-label={text('currency')} value={displayCurrency} onChange={event => { setCurrency(event.target.value); try { localStorage.setItem('sfm_currency', event.target.value); } catch { /* In-memory selection remains available. */ } }}>{currencies.map(code => <option key={code}>{code}</option>)}</select></label></>}
      <button aria-label={tvText(language, 'refresh')} onClick={onRefresh}><RefreshCw aria-hidden="true"/></button>
    </div></header>
    {!token || expired ? <div className="tv-portfolio-gate"><ShieldCheck aria-hidden="true"/><h2>{text(expired ? 'expired' : 'pair')}</h2><p>{text('pairHelp')}</p><button onClick={onPair}>{tvText(language, 'pair')}</button></div>
      : !data && resource.loading ? <div className="tv-loading" role="status"><RefreshCw className="tv-spin"/>{tvText(language, 'loading')}</div>
        : !data ? <div className="tv-portfolio-gate" role="status"><h2>{tvText(language, 'error')}</h2><button onClick={onRefresh}>{tvText(language, 'retry')}</button></div>
          : <>
            {resource.error && <p className="tv-portfolio-error" role="status">{text('failed')}</p>}
            <div className="tv-portfolio-metrics tv-portfolio-metrics-compact">
              <article><h2>{text('value')}</h2><strong dir="ltr">{money(data.totalValue, data.currency)} <small>{data.currency}</small></strong>{data.valueCoverage < data.total && <p>{data.valueCoverage}/{data.total} · {text('partial')}</p>}</article>
              <article><h2>{text('capital')}</h2><strong dir="ltr">{money(data.totalCost, data.currency)} <small>{data.currency}</small></strong>{data.costCoverage < data.total && <p>{data.costCoverage}/{data.total} · {text('recorded')}</p>}</article>
              <article><h2>{text('positions')}</h2><strong dir="ltr">{data.total}</strong></article>
            </div>
            {!data.total ? <div className="tv-portfolio-gate"><WalletCards aria-hidden="true"/><h2>{text('empty')}</h2><p>{text('emptyHelp')}</p></div> : <div className="tv-portfolio-body">
              <section className="tv-portfolio-positions" aria-label={text('positions')}><header className="tv-broadcast-heading"><h2>{text('positions')} <bdi>{positions.length}</bdi></h2></header>
                <div key={assetClass} className="tv-portfolio-list">{positions.length ? positions.map(item => <article key={item.id} className="tv-portfolio-position" aria-expanded={expandedId === item.id} onClick={() => setExpandedId(previous => previous === item.id ? null : item.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpandedId(previous => previous === item.id ? null : item.id); } }} data-position={item.id} data-tv-focus-key={`position:${item.id}`} tabIndex={0}>
                  <div className="tv-portfolio-identity"><InvestmentIcon position={item}/><div className="tv-portfolio-identity-text"><h3>{item.name || item.symbol || '—'}</h3><p><bdi>{item.symbol}</bdi></p></div></div>
                  <div className="tv-portfolio-amount"><strong dir="ltr">{money(item.baseValue ?? item.value?.amount ?? null, item.baseValue !== null ? data.currency : item.value?.currency || data.currency)} <small>{item.baseValue !== null ? data.currency : item.value?.currency || "—"}</small></strong></div>
                  {item.freshness === 'stale' && <span className="tv-portfolio-stale" aria-label={text('freshness')}>●</span>}
                  {expandedId === item.id && <div className="tv-portfolio-detail">
                    <span>{text('quantity')}: {item.quantity === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(item.quantity)}</span>
                    <span>{text('capital')}: {money(item.baseCost, data.currency)} {data.currency}</span>
                    <span>{item.platform || text(item.assetClass as PortfolioTextKey)}</span>
                    <span>{item.source || text('manual')} · {item.valuedAt ? tvQuoteTime(item.valuedAt, language, now) : text('missing')}</span>
                  </div>}
                </article>) : <p className="tv-portfolio-empty">{text('emptyFilter')}</p>}</div>
              </section>
              <aside className="tv-portfolio-allocation"><header className="tv-broadcast-heading"><h2>{text('allocation')}</h2><TvBroadcastPager page={allocationPage.current} pages={allocationPages} language={language} move={allocationPage.move}/></header>
                {allocation.length && (data.totalValue ?? 0) > 0 ? <div className="tv-allocation-list">{allocation.slice(allocationPage.current * 4, (allocationPage.current + 1) * 4).map(item => <div key={item.assetClass}><div><span>{text(item.assetClass as PortfolioTextKey)}</span><bdi>{((item.amount / data.totalValue!) * 100).toFixed(1)}%</bdi></div><meter min={0} max={data.totalValue!} value={item.amount} aria-label={text(item.assetClass as PortfolioTextKey)}/></div>)}</div> : <p>{text('unavailable')}</p>}
              </aside>
            </div>}
            <footer className="tv-portfolio-footer"><span>{text('sync')}: <time dateTime={data.generatedAt} dir="ltr">{tvQuoteTime(data.generatedAt, language, now)}</time></span></footer>
          </>}
  </section>;
}
