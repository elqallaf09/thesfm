'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Brain, LineChart, Search, ShieldAlert, Sparkles, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { MarketAnalysis, MarketAssetType, MarketResult, MarketSearchItem } from '@/lib/market/marketService';
import { normalizeAssetType, validateSymbol } from '@/lib/market/marketService';

type MarketServiceState = 'checking' | 'connected' | 'not_configured' | 'unavailable';
type MarketViewAnalysis = MarketAnalysis & { source?: string; fallback?: boolean; openbbService?: MarketServiceState };

function money(value: number) {
  const maximumFractionDigits = value > 1000 ? 0 : 2;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

function sparkPath(points: MarketAnalysis['history']) {
  const width = 420;
  const height = 150;
  const closes = points.map(point => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const spread = max - min || 1;
  return closes.map((value, index) => {
    const x = (index / Math.max(closes.length - 1, 1)) * width;
    const y = height - ((value - min) / spread) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function chartTicks(points: MarketAnalysis['history']) {
  if (points.length === 0) return [];
  const indexes = [0, Math.floor(points.length / 2), points.length - 1];
  return indexes.map(index => points[index]).filter(Boolean);
}

export default function MarketAnalysisPage() {
  const { dir, t } = useLanguage();
  const [query, setQuery] = useState('AAPL');
  const [assetType, setAssetType] = useState<MarketAssetType | 'all'>('stock');
  const [analysis, setAnalysis] = useState<MarketViewAnalysis | null>(null);
  const [watchlist, setWatchlist] = useState<MarketSearchItem[]>([]);
  const [compare, setCompare] = useState<MarketAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serviceState, setServiceState] = useState<MarketServiceState>('checking');

  const requestAnalysis = useCallback(async (symbolInput: string, typeInput: MarketAssetType | 'all') => {
    const symbol = validateSymbol(symbolInput);
    if (!symbol) {
      setError(t('market_error_message'));
      setAnalysis(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const normalizedType = typeInput === 'all' ? 'stock' : normalizeAssetType(typeInput);
      const response = await fetch(`/api/market/analyze?symbol=${encodeURIComponent(symbol)}&assetType=${encodeURIComponent(normalizedType)}`);
      const result = await response.json() as MarketResult & { openbbService?: MarketServiceState; source?: string; fallback?: boolean };
      if (!response.ok || !result.success) throw new Error(!result.success ? result.error : t('market_error_message'));
      setAnalysis(result);
      if (result.openbbService === 'not_configured' || result.openbbService === 'unavailable') {
        setServiceState(result.openbbService);
      }
      setQuery(result.symbol);
      setAssetType(result.assetType);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('market_error_message'));
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    async function checkService() {
      try {
        const response = await fetch('/api/market/health');
        const health = await response.json() as { ok?: boolean; openbbService?: MarketServiceState };
        if (!cancelled) {
          setServiceState(health.ok ? 'connected' : health.openbbService ?? 'unavailable');
        }
      } catch {
        if (!cancelled) setServiceState('unavailable');
      } finally {
        if (!cancelled) void requestAnalysis('AAPL', 'stock');
      }
    }
    void checkService();
    return () => {
      cancelled = true;
    };
  }, [requestAnalysis]);

  useEffect(() => {
    let cancelled = false;
    async function loadSupportingData() {
      try {
        const [searchResponse, compareResponse] = await Promise.all([
          fetch('/api/market/search'),
          fetch('/api/market/compare?symbols=AAPL,MSFT,NVDA,BTC&assetType=stock'),
        ]);
        const searchJson = await searchResponse.json() as { results?: MarketSearchItem[] };
        const compareJson = await compareResponse.json() as { results?: MarketResult[] };
        if (cancelled) return;
        setWatchlist(searchJson.results?.slice(0, 5) ?? []);
        setCompare((compareJson.results ?? []).filter((item): item is MarketAnalysis => Boolean(item.success)));
      } catch {
        if (!cancelled) {
          setWatchlist([]);
          setCompare([]);
        }
      }
    }
    void loadSupportingData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = analysis;
  const isFallbackData = Boolean(selected?.fallback || selected?.source === 'mock');
  const serviceNotice = serviceState === 'connected'
    ? isFallbackData
      ? t('market_status_demo')
      : t('market_service_connected')
    : serviceState === 'not_configured'
      ? t('market_service_not_configured')
      : serviceState === 'unavailable'
        ? t('market_service_unavailable')
        : t('loading');
  const heroBadge = isFallbackData ? t('market_badge_demo') : t('market_badge_live');
  const chartBadge = isFallbackData ? t('market_chart_demo') : t('market_chart_live');
  const localizedAssetName = selected?.name?.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', selected.symbol) : selected?.name;
  const localizedSummary = selected?.summary?.includes('Educational market summary only')
    ? t('market_summary_educational')
    : selected?.summary;
  const chartColor = selected && selected.changePercent >= 0 ? '#22C55E' : '#EF4444';
  const trendIcon = selected?.trend === 'bearish' ? <TrendingDown size={18} /> : <TrendingUp size={18} />;
  const cards = useMemo(() => [analysis, ...compare].filter((item): item is MarketAnalysis => Boolean(item)).slice(0, 4), [analysis, compare]);

  return (
    <div className="market-shell" dir={dir}>
      <AppHeader />
      <Sidebar />
      <main className="market-main">
        <section className="market-hero">
          <div className="market-hero-copy">
            <span className="market-eyebrow"><Sparkles size={15} />{heroBadge}</span>
            <h1>{t('market_title')}</h1>
            <p>{t('market_hero_subtitle')}</p>
            <form className="market-search-panel" onSubmit={event => { event.preventDefault(); void requestAnalysis(query, assetType); }}>
              <label>
                <span>{t('market_search_label')}</span>
                <div>
                  <Search size={17} />
                  <input value={query} onChange={event => setQuery(event.target.value.toUpperCase())} placeholder={t('market_search_placeholder')} />
                </div>
              </label>
              <label>
                <span>{t('market_asset_type')}</span>
                <select value={assetType} onChange={event => setAssetType(event.target.value as MarketAssetType | 'all')}>
                  <option value="all">{t('market_asset_all')}</option>
                  <option value="stock">{t('market_asset_stocks')}</option>
                  <option value="etf">{t('market_asset_etf')}</option>
                  <option value="crypto">{t('market_asset_crypto')}</option>
                  <option value="forex">{t('market_asset_forex')}</option>
                  <option value="commodity">{t('market_asset_commodities')}</option>
                  <option value="gold">{t('market_asset_gold')}</option>
                </select>
              </label>
              <button type="submit" disabled={loading}><Activity size={17} />{loading ? t('loading') : t('market_analyze_now')}</button>
            </form>
          </div>
          <div className="market-hero-card">
            <span>{t('market_selected_asset')}</span>
            <strong>{selected?.symbol ?? '--'}</strong>
            <p>{localizedAssetName ?? t('market_no_data')}</p>
            {selected && <b className={`risk ${selected.riskLevel}`}>{t(`market_risk_${selected.riskLevel}`)}</b>}
          </div>
        </section>

        <div className={`market-service ${serviceState}`}>
          <Activity size={17} />
          <span>{t('market_service_status')}: {serviceNotice}</span>
        </div>

        {error && <div className="market-notice">{error}</div>}

        <section className="market-card-grid" aria-label={t('market_sample_cards')}>
          {loading ? (
            <div className="market-empty">{t('loading')}</div>
          ) : cards.length === 0 ? (
            <div className="market-empty">{t('market_no_data')}</div>
          ) : cards.map(asset => (
            <article className="market-card" key={asset.symbol}>
              <div className="market-card-head">
                <div>
                  <strong>{asset.symbol}</strong>
                  <span>{asset.name.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', asset.symbol) : asset.name}</span>
                </div>
                <b className={`risk ${asset.riskLevel}`}>{t(`market_risk_${asset.riskLevel}`)}</b>
              </div>
              <div className="market-price">{money(asset.latestPrice)}</div>
              <div className={asset.changePercent >= 0 ? 'change up' : 'change down'}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
              </div>
            </article>
          ))}
        </section>

        {selected ? (
          <>
            <section className="market-layout">
              <div className="market-panel market-chart">
                <div className="market-section-head">
                  <LineChart size={19} />
                  <div>
                    <span>{chartBadge}</span>
                    <h2>{selected.symbol}</h2>
                  </div>
                </div>
                <svg viewBox="0 0 420 180" role="img" aria-label={t('market_price_chart')}>
                  <defs>
                    <linearGradient id="marketLineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${sparkPath(selected.history)} L 420 180 L 0 180 Z`} fill="url(#marketLineFill)" />
                  <path d={sparkPath(selected.history)} fill="none" stroke={chartColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="0" y="176" fill="#8A7060" fontSize="11" fontWeight="800">{chartTicks(selected.history)[0]?.date ?? ''}</text>
                  <text x="205" y="176" textAnchor="middle" fill="#8A7060" fontSize="11" fontWeight="800">{chartTicks(selected.history)[1]?.date ?? ''}</text>
                  <text x="420" y="176" textAnchor="end" fill="#8A7060" fontSize="11" fontWeight="800">{chartTicks(selected.history)[2]?.date ?? ''}</text>
                  <text x="0" y="15" fill="#8A7060" fontSize="11" fontWeight="800">{money(Math.max(...selected.history.map(point => point.close)))}</text>
                  <text x="0" y="98" fill="#8A7060" fontSize="11" fontWeight="800">{selected.symbol}</text>
                  <text x="0" y="165" fill="#8A7060" fontSize="11" fontWeight="800">{money(Math.min(...selected.history.map(point => point.close)))}</text>
                </svg>
                <div className="market-stat-row">
                  <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice)} />
                  <MarketMetric label={t('market_daily_change')} value={`${selected.changePercent >= 0 ? '+' : ''}${selected.changePercent.toFixed(2)}%`} />
                  <MarketMetric label={t('market_trend')} value={t(`market_trend_${selected.trend}`)} icon={trendIcon} />
                </div>
              </div>

              <aside className="market-panel">
                <div className="market-section-head">
                  <BarChart3 size={19} />
                  <div>
                    <span>{isFallbackData ? t('market_mock_data') : t('market_live_data')}</span>
                    <h2>{t('market_technical_indicators')}</h2>
                  </div>
                </div>
                <div className="indicator-list">
                  <MarketMetric label="RSI" value={String(selected.indicators.rsi)} />
                  <MarketMetric label="SMA 20" value={money(selected.indicators.sma20)} />
                  <MarketMetric label="SMA 50" value={money(selected.indicators.sma50)} />
                  <MarketMetric label={t('market_risk_level')} value={`${selected.indicators.volatility.toFixed(1)}%`} />
                  <MarketMetric label={t('market_support_zone')} value={money(selected.levels.support)} />
                  <MarketMetric label={t('market_resistance_zone')} value={money(selected.levels.resistance)} />
                </div>
              </aside>
            </section>

            <section className="market-bottom-grid">
              <div className="market-panel">
                <div className="market-section-head">
                  <Brain size={19} />
                  <div>
                    <span>{t('market_volume_signal')}</span>
                    <h2>{t('market_ai_summary')}</h2>
                  </div>
                </div>
                <p className="market-copy">{localizedSummary || t('market_ai_summary_text')}</p>
              </div>
              <div className="market-panel">
                <div className="market-section-head">
                  <Star size={19} />
                  <div>
                    <span>{t('market_mock_data')}</span>
                    <h2>{t('market_watchlist')}</h2>
                  </div>
                </div>
                <div className="watchlist">
                  {watchlist.length === 0 ? <span>{t('market_no_data')}</span> : watchlist.map(asset => <span key={asset.symbol}>{asset.symbol}</span>)}
                </div>
                <p className="market-muted">{t('market_watchlist_note')}</p>
              </div>
              <div className="market-panel">
                <div className="market-section-head">
                  <ShieldAlert size={19} />
                  <div>
                    <span>{t('market_risk_level')}</span>
                    <h2>{t('market_compare_assets')}</h2>
                  </div>
                </div>
                <div className="compare-bars">
                  {compare.length === 0 ? <p className="market-muted">{t('market_no_data')}</p> : compare.slice(0, 4).map(asset => (
                    <div key={asset.symbol}>
                      <span>{asset.symbol}</span>
                      <i style={{ width: `${Math.min(100, Math.abs(asset.changePercent) * 18 + 22)}%` }} />
                      <b>{asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%</b>
                    </div>
                  ))}
                </div>
                <p className="market-muted">{t('market_compare_note')}</p>
              </div>
            </section>
          </>
        ) : (
          <div className="market-empty">{t('market_no_data')}</div>
        )}

        <section className="market-disclaimer">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('market_disclaimer_title')}</strong>
            <p>{t('market_disclaimer')}</p>
          </div>
        </section>
      </main>

      <style jsx>{`
        .market-shell{min-height:100dvh;background:#F7F3EA;color:#111;overflow-x:hidden;font-family:Tajawal,Arial,sans-serif}
        .market-main{width:100%;max-width:1320px;margin:0 auto;padding:22px;margin-inline-start:230px;display:grid;gap:16px;overflow-x:hidden}
        .market-hero{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(135deg,#111 0%,#2B1A0D 58%,#D8AE63 150%);color:#FFFDFC;padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end;box-shadow:0 20px 60px rgba(45,26,10,.16);border:1px solid rgba(216,174,99,.24)}
        .market-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(216,174,99,.14);filter:blur(18px)}
        .market-hero-copy,.market-hero-card{position:relative;z-index:1}.market-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(216,174,99,.28);background:rgba(216,174,99,.12);color:#D8AE63;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin-bottom:14px}
        .market-hero h1{margin:0 0 10px;font-size:clamp(30px,5vw,52px);line-height:1.02;font-weight:900}.market-hero p{max-width:760px;margin:0;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .market-search-panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;align-items:end}.market-search-panel label{display:grid;gap:7px}.market-search-panel label>span{font-size:12px;font-weight:900;color:#D8AE63}.market-search-panel label>div{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);padding:0 13px}.market-search-panel input,.market-search-panel select{width:100%;height:48px;min-width:0;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);color:#FFFDFC;padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.market-search-panel input{border:0;background:transparent;padding:0}.market-search-panel input::placeholder{color:rgba(255,255,255,.48)}.market-search-panel select option{color:#111}.market-search-panel button{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}.market-search-panel button:disabled{opacity:.65;cursor:wait}
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:#D8AE63;line-height:1}.market-hero-card p{margin:0;font-size:13px}.risk{justify-self:start;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.risk.low{background:rgba(34,197,94,.14);color:#16A34A}.risk.medium{background:rgba(216,174,99,.18);color:#9A6C3C}.risk.high{background:rgba(239,68,68,.12);color:#DC2626}
        .market-card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-card,.market-panel,.market-disclaimer,.market-notice{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 6px 24px rgba(90,67,51,.06)}.market-card{padding:16px;display:grid;gap:10px}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:#8A7060;font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:#111}.change{font-size:13px;font-weight:900}.change.up{color:#16A34A}.change.down{color:#DC2626}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:#9A6C3C;font-weight:900;background:#FFFDFC;border:1px dashed rgba(216,174,99,.24);border-radius:18px}.market-notice{padding:13px 15px;color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18);font-weight:900}
        .market-service{display:flex;align-items:center;gap:9px;background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:18px;padding:12px 14px;color:#5B4332;font-weight:900;box-shadow:0 6px 24px rgba(90,67,51,.05)}.market-service.connected{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-service.not_configured{color:#9A6C3C;background:rgba(216,174,99,.10)}.market-service.unavailable{color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18)}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px}.market-panel{padding:18px;min-width:0}.market-section-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:#D8AE63}.market-section-head span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:3px}.market-section-head h2{margin:0;color:#111;font-size:17px;font-weight:900}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.metric{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:16px;padding:12px;display:grid;gap:5px}.metric span{font-size:11px;color:#9A6C3C;font-weight:900}.metric strong{font-size:15px;color:#111;display:flex;align-items:center;gap:6px}.indicator-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:#5B4332;line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:#8A7060;font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span{border-radius:999px;background:#F7F3EA;border:1px solid rgba(216,174,99,.14);padding:7px 11px;color:#5B4332;font-weight:900;font-size:12px}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:#5B4332}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,#D8AE63,#9A6C3C);display:block}
        .market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:16px;color:#9A6C3C}.market-disclaimer strong{display:block;color:#111;margin-bottom:4px}.market-disclaimer p{margin:0;color:#5B4332;font-size:13px;line-height:1.7;font-weight:800}
        @media(max-width:1180px){.market-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid{grid-template-columns:1fr}.market-search-panel{grid-template-columns:1fr 1fr}}
        @media(max-width:1024px){.market-main{margin-inline-start:0;padding:calc(88px + env(safe-area-inset-top)) 16px 18px;max-width:100%}}
        @media(max-width:720px){.market-main{padding-inline:14px}.market-hero{grid-template-columns:1fr;padding:22px;border-radius:22px}.market-search-panel,.market-card-grid,.market-stat-row,.indicator-list{grid-template-columns:1fr}.market-search-panel button{width:100%}.market-hero-card strong{font-size:36px}.market-panel,.market-card{border-radius:18px}.compare-bars div{grid-template-columns:42px minmax(0,1fr) 48px}}
      `}</style>
    </div>
  );
}

function MarketMetric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{icon}{value}</strong>
    </div>
  );
}
