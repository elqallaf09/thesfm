'use client';
import '@/app/tv/portfolio.css';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChartPie, ChevronDown, Coins, Landmark, Layers3, Package, RefreshCw, ShieldCheck, WalletCards, X } from 'lucide-react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvPortfolioPosition, TvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';
import { metalFromSymbol } from '@/lib/metalVisuals';
import { portfolioText, type PortfolioTextKey } from '@/lib/markets-tv/portfolioCopy';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvBroadcastPager } from './TvBroadcastPager';
import { useTvBroadcastPage } from './useTvBroadcastPage';
import { TvPortfolioList } from './TvPortfolioList';
import { TvAssetIcon } from './TvAssetIcon';
import { tvRemoteCommand } from './tvRemoteKeys';

const CLASSES = ['stocks', 'real-estate', 'gold-silver', 'crypto', 'funds', 'bonds', 'commodities', 'overview'] as const;
const CURRENCIES = ['KWD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'JPY'];
const formats = new Map<string, Intl.NumberFormat>();
const quantityFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

function InvestmentIcon({ position }: { position: TvPortfolioPosition }) {
  const symbol = position.symbol?.trim().toUpperCase() || '';
  if (position.assetClass === 'stocks' || position.assetClass === 'crypto') {
    return <TvAssetIcon quote={{ symbol, name: position.name, exchange: null }} group={position.assetClass === 'crypto' ? 'crypto' : 'world'}/>;
  }
  if (position.assetClass === 'gold-silver' || position.assetClass === 'commodities') {
    // A physical metal's name can identify its artwork, never its pricing unit.
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
function PortfolioAmount({ position, currency, language, capital = false }: { position: TvPortfolioPosition; currency: string; language: TvLanguage; capital?: boolean }) {
  const value = capital ? position.baseCost : position.baseValue;
  const native = capital ? position.cost : position.holdingValue ?? position.value;
  const quote = !capital && !position.holdingValue && position.holdingCurrency !== undefined && position.holdingCurrency !== position.value?.currency;
  return <span className="tv-portfolio-values"><strong className="tv-portfolio-display" dir="ltr">{money(value, currency)} <small>{currency}</small></strong>
    {native && (native.currency !== currency || value === null || quote) && <span className="tv-portfolio-native" data-value-kind={quote ? 'quote' : 'original'}>{portfolioText(language, quote ? 'quoteCurrency' : 'originalValue')} <bdi dir="ltr">{money(native.amount, native.currency)} {native.currency}</bdi></span>}
  </span>;
}
function statusLabel(position: TvPortfolioPosition, language: TvLanguage) {
  const text = (key: PortfolioTextKey) => portfolioText(language, key);
  if (position.value === null && position.baseValue === null) return text('unavailable');
  if (position.valuationKind === 'manual') return text(position.freshness === 'stale' ? 'manualStale' : 'manualValuation');
  if (position.valuationKind === 'market') {
    const status = position.quoteStatus;
    if (status && status !== 'available') return tvText(language, status);
    return text('market');
  }
  return text(position.freshness === 'stale' ? 'stale' : position.freshness === 'missing' ? 'unknownTime' : 'recorded');
}
function PositionStatus({ position, language }: { position: TvPortfolioPosition; language: TvLanguage }) {
  return <span className="tv-portfolio-status" data-valuation-kind={position.valuationKind || 'recorded'}
    data-status={position.valuationKind === 'market' ? position.quoteStatus || 'available' : position.freshness}>
    {statusLabel(position, language)}
    {position.baseValue === null && position.value !== null && <span className="tv-portfolio-fx-missing">{portfolioText(language, 'fxMissing')}</span>}
  </span>;
}
function Coverage({ count, total, language }: { count: number; total: number; language: TvLanguage }) {
  return <><bdi>{count}</bdi> {portfolioText(language, 'of')} <bdi>{total}</bdi> {portfolioText(language, 'holdings')}</>;
}
function PortfolioDetails({ position, currency, language, now, close }: {
  position: TvPortfolioPosition; currency: string; language: TvLanguage; now: number; close: () => void;
}) {
  const initialFocus = useRef<HTMLButtonElement>(null);
  const text = (key: PortfolioTextKey) => portfolioText(language, key);
  const holdingFxMissing = position.holdingCurrency && !position.holdingValue && position.value && position.holdingCurrency !== position.value.currency;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    initialFocus.current?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected && !opener.closest('[hidden],[inert]')) opener.focus({ preventScroll: true });
    };
  }, []);
  return <div className="tv-modal-backdrop tv-portfolio-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section id="tv-portfolio-dialog" className="tv-dialog tv-portfolio-dialog" data-tv-dialog data-tv-focus-scope
      role="dialog" aria-modal="true" aria-labelledby="tv-portfolio-detail-title" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header><div><h2 id="tv-portfolio-detail-title" dir="auto">{position.name || position.symbol || '—'}</h2><p><bdi>{position.symbol}</bdi>{position.symbol && position.platform ? ' · ' : ''}<bdi>{position.platform}</bdi></p></div>
        <button ref={initialFocus} type="button" onClick={close} aria-label={tvText(language, 'close')} data-tv-back data-tv-initial-focus><X aria-hidden="true"/><span>{tvText(language, 'close')}</span></button>
      </header>
      <div className="tv-portfolio-detail-content" role="region" aria-label={text('details')} tabIndex={0} data-tv-focus-key="portfolio-details-content" onKeyDown={event => {
        const command = tvRemoteCommand(event.nativeEvent);
        if (event.target !== event.currentTarget || command?.kind !== 'arrow' || !['ArrowUp', 'ArrowDown'].includes(command.direction)) return;
        const panel = event.currentTarget, down = command.direction === 'ArrowDown';
        if (down ? panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1 : panel.scrollTop <= 1) return;
        event.preventDefault();
        panel.scrollBy({ top: (down ? 1 : -1) * Math.max(48, panel.clientHeight * .6), behavior: 'auto' });
      }}>
      <div className="tv-portfolio-detail-value"><InvestmentIcon position={position}/><div><PortfolioAmount position={position} currency={currency} language={language}/><PositionStatus position={position} language={language}/></div></div>
      <dl className="tv-portfolio-detail-grid">
        <div><dt>{text('quantity')}</dt><dd><bdi>{position.quantity === null ? '—' : quantityFormat.format(position.quantity)}</bdi></dd></div>
        <div><dt>{text('capital')}</dt><dd><PortfolioAmount position={position} currency={currency} language={language} capital/>{position.cost && position.baseCost === null && <span className="tv-portfolio-fx-missing">{text('fxMissing')}</span>}</dd></div>
        <div><dt>{text('source')}</dt><dd><bdi>{position.source || text('manual')}</bdi></dd></div>
        <div><dt>{text('valuedAt')}</dt><dd>{position.valuedAt ? <time dateTime={position.valuedAt} dir="ltr">{tvQuoteTime(position.valuedAt, language, now)}</time> : text('missing')}</dd></div>
        {position.valuationIssue && <div className="tv-portfolio-detail-note"><dt>{text('valuationNote')}</dt><dd>{text(position.valuationIssue)}</dd></div>}
        {position.baseValue === null && position.value !== null && <div className="tv-portfolio-detail-note"><dt>{text('currency')}</dt><dd>{text('noFx')}</dd></div>}
        {holdingFxMissing && <div className="tv-portfolio-detail-note"><dt>{text('holdingCurrency')} · <bdi>{position.holdingCurrency}</bdi></dt><dd>{text('fxMissing')}</dd></div>}
        {position.valuationKind === 'market' && position.recordedValue && <>
          <div><dt>{text('savedValue')}</dt><dd dir="ltr">{money(position.recordedValue.amount, position.recordedValue.currency)} {position.recordedValue.currency}</dd></div>
          <div><dt>{text('savedAt')}</dt><dd>{position.recordedValuedAt ? <time dateTime={position.recordedValuedAt} dir="ltr">{tvQuoteTime(position.recordedValuedAt, language, now)}</time> : text('missing')}</dd></div>
          {position.recordedSource && <div><dt>{text('savedSource')}</dt><dd><bdi>{position.recordedSource}</bdi></dd></div>}
        </>}
        {[[position.fxSource, position.fxAt, currency], [position.holdingFxSource, position.holdingFxAt, position.holdingCurrency], [position.costFxSource, position.costFxAt, `${text('capital')} · ${currency}`]].map(([source, at, target], index) => <Fragment key={index}>
          {source && <div><dt>{text('fxSource')} · <bdi>{target}</bdi></dt><dd><bdi>{source}</bdi></dd></div>}
          {at && <div><dt>{text('fxAt')} · <bdi>{target}</bdi></dt><dd><time dateTime={at} dir="ltr">{tvQuoteTime(at, language, now)}</time></dd></div>}
        </Fragment>)}
      </dl>
      <p className="tv-portfolio-detail-help">{text('detailNote')}</p>
      </div>
    </section>
  </div>;
}

export default function TvInvestments({ token, language, revision, now, onPair, onRefresh, autoRotate, suspended = false, onPaginationAvailable }: {
  token: string; language: TvLanguage; revision: number; now: number; onPair: () => void; onRefresh: () => void; autoRotate: boolean; suspended?: boolean; onAutoRotateChange: (enabled: boolean) => void; onPaginationAvailable?: (available: boolean) => void;
}) {
  const [currency, setCurrency] = useState(''), [assetClass, setAssetClass] = useState('all');
  // Bind the selection to its paired account; a token change cannot reopen it.
  const [selected, setSelected] = useState<{ id: string; token: string } | null>(null);
  const closeDetails = useCallback(() => setSelected(null), []);
  useEffect(() => { try { const saved = localStorage.getItem('sfm_currency'); if (saved && /^[A-Z]{3}$/.test(saved)) setCurrency(saved); } catch { /* Account preference remains the default. */ } }, []);
  const resource = useTvResource<TvPortfolioSnapshot>(token ? `/api/tv/portfolio${currency ? `?currency=${currency}` : ''}` : null, 15000, token, revision);
  const data = resource.data, expired = resource.errorStatus === 401 || resource.errorStatus === 403;
  const holdings = data?.positions;
  const positions = useMemo(() => holdings?.filter(item => assetClass === 'all' || item.assetClass === assetClass) || [], [holdings, assetClass]);
  const detail = token && !expired && selected?.token === token ? data?.positions.find(item => item.id === selected.id) : null;
  const allocation = data?.allocation || [], allocationPages = Math.max(1, Math.ceil(allocation.length / 4));
  const allocationPage = useTvBroadcastPage(allocationPages, autoRotate && !expired && !suspended && !detail);
  const canRotate = Boolean(token && !expired && data?.total && (data.totalValue ?? 0) > 0 && allocationPages > 1);
  useEffect(() => { onPaginationAvailable?.(canRotate); }, [canRotate, onPaginationAvailable]);
  const text = (key: PortfolioTextKey) => portfolioText(language, key);
  const displayCurrency = currency || data?.currency || 'KWD';
  const currencies = [...new Set([displayCurrency, ...CURRENCIES])];
  const marketCoverage = data?.marketCoverage ?? data?.positions.filter(item => item.valuationKind === 'market' && item.baseValue !== null).length ?? 0;
  const marketCount = data?.positions.filter(item => item.valuationKind === 'market').length ?? 0;
  const basis = !marketCoverage ? 'recordedValues' : marketCoverage < (data?.valueCoverage ?? 0) ? 'mixedValues' : 'marketValues';
  return <section className="tv-portfolio" aria-labelledby="tv-portfolio-title">
    <header className="tv-portfolio-heading"><div><h1 id="tv-portfolio-title"><WalletCards aria-hidden="true"/>{text('title')}</h1></div><div className="tv-portfolio-actions">
      {token && !expired && <>
        <label>{text('assetClass')}<span className="tv-portfolio-select">
          <select aria-label={text('assetClass')} value={assetClass} onChange={event => setAssetClass(event.target.value)}>
            <option value="all">{text('all')}</option>
            {CLASSES.map(value => <option key={value} value={value}>{text(value)}</option>)}
          </select><ChevronDown aria-hidden="true"/>
        </span></label>
        <label>{text('currency')}<span className="tv-portfolio-select">
          <select aria-label={text('currency')} value={displayCurrency} onChange={event => {
            setCurrency(event.target.value);
            try { localStorage.setItem('sfm_currency', event.target.value); } catch { /* In-memory selection remains available. */ }
          }}>{currencies.map(code => <option key={code}>{code}</option>)}</select><ChevronDown aria-hidden="true"/>
        </span></label>
      </>}
      <button type="button" aria-label={tvText(language, 'refresh')} onClick={onRefresh}><RefreshCw aria-hidden="true"/></button>
    </div></header>
    {!token || expired ? <div className="tv-portfolio-gate"><ShieldCheck aria-hidden="true"/><h2>{text(expired ? 'expired' : 'pair')}</h2><p>{text('pairHelp')}</p><button onClick={onPair}>{tvText(language, 'pair')}</button></div>
      : !data && resource.loading ? <div className="tv-loading" role="status"><RefreshCw className="tv-spin"/>{tvText(language, 'loading')}</div>
        : !data ? <div className="tv-portfolio-gate" role="status"><h2>{tvText(language, 'error')}</h2><button onClick={onRefresh}>{tvText(language, 'retry')}</button></div>
          : <>
            {resource.error && <p className="tv-portfolio-error" role="status">{text('failed')}</p>}
            <div className="tv-portfolio-metrics">
              <article className="tv-portfolio-total"><h2>{text('value')}</h2><strong dir="ltr" data-long={money(data.totalValue, data.currency).length > 14 ? 'true' : undefined}>{money(data.totalValue, data.currency)} <small>{data.currency}</small></strong><p>{data.valueCoverage < data.total ? <>{text('partial')} · <Coverage count={data.valueCoverage} total={data.total} language={language}/></> : text(basis)}</p></article>
              <article><h2>{text('capital')}</h2><strong dir="ltr" data-long={money(data.totalCost, data.currency).length > 14 ? 'true' : undefined}>{money(data.totalCost, data.currency)} <small>{data.currency}</small></strong><p><Coverage count={data.costCoverage} total={data.total} language={language}/></p></article>
              <article><h2>{text('positions')}</h2><strong dir="ltr">{data.total}</strong><p>{(data.marketEligible ?? 0) > 0 ? <>{text('marketCoverage')}: <bdi>{marketCount}</bdi> {text('of')} <bdi>{data.marketEligible}</bdi></> : <>{text('coverage')}: <bdi>{data.valueCoverage}</bdi> {text('of')} <bdi>{data.total}</bdi></>}</p></article>
            </div>
            {!data.total ? <div className="tv-portfolio-gate"><WalletCards aria-hidden="true"/><h2>{text('empty')}</h2><p>{text('emptyHelp')}</p></div> : <div className="tv-portfolio-body">
              <TvPortfolioList key={assetClass} positions={positions} language={language}>
                {positions.length ? positions.map(item => <article key={item.id} className="tv-portfolio-position" data-position={item.id}>
                    <button className="tv-portfolio-open" type="button" aria-haspopup="dialog" aria-controls={detail?.id === item.id ? 'tv-portfolio-dialog' : undefined}
                      data-tv-focus-key={`position:${item.id}`} onClick={() => setSelected({ id: item.id, token })}>
                      <span className="tv-portfolio-card-content"><span className="tv-portfolio-identity"><InvestmentIcon position={item}/><span className="tv-portfolio-identity-text"><span role="heading" aria-level={3} className="tv-portfolio-name" dir="auto">{item.name || item.symbol || '—'}</span><span className="tv-portfolio-meta"><bdi>{item.symbol}</bdi><bdi className="tv-portfolio-platform">{item.platform || text(item.assetClass as PortfolioTextKey)}</bdi></span></span></span>
                      <span className="tv-portfolio-amount"><PortfolioAmount position={item} currency={data.currency} language={language}/><PositionStatus position={item} language={language}/></span></span>
                    </button>
                  </article>) : <p className="tv-portfolio-empty">{text('emptyFilter')}</p>}
              </TvPortfolioList>
              <aside className="tv-portfolio-allocation"><header className="tv-broadcast-heading"><h2>{text(marketCoverage ? 'allocation' : 'allocationRecorded')}</h2><TvBroadcastPager page={allocationPage.current} pages={allocationPages} language={language} move={allocationPage.move}/></header><p>{text(basis)} · <bdi>{data.currency}</bdi></p>
                {allocation.length > 0 && (data.totalValue ?? 0) > 0 ? <div className="tv-allocation-list">{allocation.slice(allocationPage.current * 4, (allocationPage.current + 1) * 4).map(item => <div key={item.assetClass}><div><span>{text(item.assetClass as PortfolioTextKey)}</span><bdi>{((item.amount / data.totalValue!) * 100).toFixed(1)}%</bdi></div><meter min={0} max={data.totalValue!} value={item.amount} aria-label={text(item.assetClass as PortfolioTextKey)}/><bdi>{money(item.amount, data.currency)} {data.currency}</bdi></div>)}</div> : <p>{text('unavailable')}</p>}
              </aside>
            </div>}
            <footer className="tv-portfolio-footer"><span>{text('sync')}: <time dateTime={data.generatedAt} dir="ltr">{tvQuoteTime(data.generatedAt, language, now)}</time></span><p>{text('note')}</p></footer>
            {detail && <PortfolioDetails position={detail} currency={data.currency} language={language} now={now} close={closeDetails}/>}
          </>}
  </section>;
}
