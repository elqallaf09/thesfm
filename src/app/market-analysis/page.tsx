'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Brain, LineChart, Search, ShieldAlert, Sparkles, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';

type AssetType = 'stocks' | 'crypto' | 'commodities';
type Trend = 'bullish' | 'neutral' | 'bearish';
type Risk = 'low' | 'medium' | 'high';

type MockAsset = {
  symbol: string;
  name: string;
  type: AssetType;
  latestPrice: number;
  changePercent: number;
  trend: Trend;
  riskLevel: Risk;
  rsi: number;
  sma20: number;
  sma50: number;
  support: number;
  resistance: number;
  history: number[];
};

const MOCK_ASSETS: MockAsset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stocks', latestPrice: 192.44, changePercent: 1.18, trend: 'bullish', riskLevel: 'medium', rsi: 61, sma20: 188.2, sma50: 181.7, support: 184.5, resistance: 198.4, history: [174, 178, 176, 181, 185, 183, 188, 190, 192] },
  { symbol: 'MSFT', name: 'Microsoft', type: 'stocks', latestPrice: 428.73, changePercent: 0.64, trend: 'bullish', riskLevel: 'low', rsi: 57, sma20: 421.1, sma50: 410.8, support: 414.3, resistance: 436.8, history: [398, 404, 409, 413, 419, 416, 423, 426, 429] },
  { symbol: 'TSLA', name: 'Tesla', type: 'stocks', latestPrice: 174.92, changePercent: -2.42, trend: 'bearish', riskLevel: 'high', rsi: 39, sma20: 183.4, sma50: 190.2, support: 168.1, resistance: 188.8, history: [205, 198, 192, 189, 184, 179, 181, 177, 175] },
  { symbol: 'NVDA', name: 'NVIDIA', type: 'stocks', latestPrice: 138.21, changePercent: 2.86, trend: 'bullish', riskLevel: 'medium', rsi: 68, sma20: 131.4, sma50: 124.8, support: 128.9, resistance: 142.6, history: [112, 117, 121, 124, 129, 132, 130, 135, 138] },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', latestPrice: 67240, changePercent: 3.12, trend: 'bullish', riskLevel: 'high', rsi: 64, sma20: 64180, sma50: 61520, support: 62800, resistance: 69100, history: [58500, 60200, 59600, 62100, 63800, 63100, 65200, 66100, 67240] },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', latestPrice: 3420, changePercent: 1.74, trend: 'neutral', riskLevel: 'high', rsi: 54, sma20: 3360, sma50: 3255, support: 3190, resistance: 3565, history: [3010, 3090, 3180, 3260, 3340, 3310, 3390, 3445, 3420] },
  { symbol: 'XAU', name: 'Gold Spot', type: 'commodities', latestPrice: 2368.4, changePercent: -0.28, trend: 'neutral', riskLevel: 'low', rsi: 49, sma20: 2374.2, sma50: 2348.7, support: 2325.5, resistance: 2410.8, history: [2295, 2318, 2330, 2350, 2382, 2374, 2390, 2372, 2368] },
];

function money(value: number, symbol: string) {
  const maximumFractionDigits = value > 1000 ? 0 : 2;
  return `${symbol === 'BTC' || symbol === 'ETH' || symbol === 'XAU' ? '$' : '$'}${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

function sparkPath(values: number[]) {
  const width = 420;
  const height = 150;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  return values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / spread) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

export default function MarketAnalysisPage() {
  const { dir, t } = useLanguage();
  const [query, setQuery] = useState('AAPL');
  const [type, setType] = useState<AssetType | 'all'>('all');

  const filtered = useMemo(() => MOCK_ASSETS.filter(asset => {
    const matchesType = type === 'all' || asset.type === type;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || asset.symbol.toLowerCase().includes(q) || asset.name.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  }), [query, type]);

  const selected = filtered[0] ?? MOCK_ASSETS[0];
  const chartColor = selected.changePercent >= 0 ? '#22C55E' : '#EF4444';
  const riskClass = selected.riskLevel;
  const trendIcon = selected.trend === 'bearish' ? <TrendingDown size={18} /> : <TrendingUp size={18} />;

  return (
    <div className="market-shell" dir={dir}>
      <AppHeader />
      <Sidebar />
      <main className="market-main">
        <section className="market-hero">
          <div className="market-hero-copy">
            <span className="market-eyebrow"><Sparkles size={15} />{t('market_hero_badge')}</span>
            <h1>{t('market_title')}</h1>
            <p>{t('market_hero_subtitle')}</p>
            <div className="market-search-panel">
              <label>
                <span>{t('market_search_label')}</span>
                <div>
                  <Search size={17} />
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('market_search_placeholder')} />
                </div>
              </label>
              <label>
                <span>{t('market_asset_type')}</span>
                <select value={type} onChange={event => setType(event.target.value as AssetType | 'all')}>
                  <option value="all">{t('market_asset_all')}</option>
                  <option value="stocks">{t('market_asset_stocks')}</option>
                  <option value="crypto">{t('market_asset_crypto')}</option>
                  <option value="commodities">{t('market_asset_commodities')}</option>
                </select>
              </label>
              <button type="button"><Activity size={17} />{t('market_analyze_now')}</button>
            </div>
          </div>
          <div className="market-hero-card">
            <span>{t('market_selected_asset')}</span>
            <strong>{selected.symbol}</strong>
            <p>{selected.name}</p>
            <b className={`risk ${riskClass}`}>{t(`market_risk_${riskClass}`)}</b>
          </div>
        </section>

        <section className="market-card-grid" aria-label={t('market_sample_cards')}>
          {filtered.length === 0 ? (
            <div className="market-empty">{t('market_no_data')}</div>
          ) : filtered.slice(0, 4).map(asset => (
            <article className="market-card" key={asset.symbol}>
              <div className="market-card-head">
                <div>
                  <strong>{asset.symbol}</strong>
                  <span>{asset.name}</span>
                </div>
                <b className={`risk ${asset.riskLevel}`}>{t(`market_risk_${asset.riskLevel}`)}</b>
              </div>
              <div className="market-price">{money(asset.latestPrice, asset.symbol)}</div>
              <div className={asset.changePercent >= 0 ? 'change up' : 'change down'}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
              </div>
            </article>
          ))}
        </section>

        <section className="market-layout">
          <div className="market-panel market-chart">
            <div className="market-section-head">
              <LineChart size={19} />
              <div>
                <span>{t('market_price_chart')}</span>
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
            </svg>
            <div className="market-stat-row">
              <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice, selected.symbol)} />
              <MarketMetric label={t('market_daily_change')} value={`${selected.changePercent >= 0 ? '+' : ''}${selected.changePercent.toFixed(2)}%`} />
              <MarketMetric label={t('market_trend')} value={t(`market_trend_${selected.trend}`)} icon={trendIcon} />
            </div>
          </div>

          <aside className="market-panel">
            <div className="market-section-head">
              <BarChart3 size={19} />
              <div>
                <span>{t('market_mock_data')}</span>
                <h2>{t('market_technical_indicators')}</h2>
              </div>
            </div>
            <div className="indicator-list">
              <MarketMetric label="RSI" value={String(selected.rsi)} />
              <MarketMetric label="SMA 20" value={money(selected.sma20, selected.symbol)} />
              <MarketMetric label="SMA 50" value={money(selected.sma50, selected.symbol)} />
              <MarketMetric label={t('market_support_zone')} value={money(selected.support, selected.symbol)} />
              <MarketMetric label={t('market_resistance_zone')} value={money(selected.resistance, selected.symbol)} />
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
            <p className="market-copy">{t('market_ai_summary_text')}</p>
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
              {MOCK_ASSETS.slice(0, 5).map(asset => <span key={asset.symbol}>{asset.symbol}</span>)}
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
              {MOCK_ASSETS.slice(0, 4).map(asset => (
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
        .market-search-panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;align-items:end}.market-search-panel label{display:grid;gap:7px}.market-search-panel label>span{font-size:12px;font-weight:900;color:#D8AE63}.market-search-panel label>div{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);padding:0 13px}.market-search-panel input,.market-search-panel select{width:100%;height:48px;min-width:0;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);color:#FFFDFC;padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.market-search-panel input{border:0;background:transparent;padding:0}.market-search-panel input::placeholder{color:rgba(255,255,255,.48)}.market-search-panel select option{color:#111}.market-search-panel button{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:#D8AE63;line-height:1}.market-hero-card p{margin:0;font-size:13px}.risk{justify-self:start;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.risk.low{background:rgba(34,197,94,.14);color:#16A34A}.risk.medium{background:rgba(216,174,99,.18);color:#9A6C3C}.risk.high{background:rgba(239,68,68,.12);color:#DC2626}
        .market-card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-card,.market-panel,.market-disclaimer{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 6px 24px rgba(90,67,51,.06)}.market-card{padding:16px;display:grid;gap:10px}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:#8A7060;font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:#111}.change{font-size:13px;font-weight:900}.change.up{color:#16A34A}.change.down{color:#DC2626}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:#9A6C3C;font-weight:900}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px}.market-panel{padding:18px;min-width:0}.market-section-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:#D8AE63}.market-section-head span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:3px}.market-section-head h2{margin:0;color:#111;font-size:17px;font-weight:900}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.metric{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:16px;padding:12px;display:grid;gap:5px}.metric span{font-size:11px;color:#9A6C3C;font-weight:900}.metric strong{font-size:15px;color:#111;display:flex;align-items:center;gap:6px}.indicator-list{display:grid;gap:10px}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:#5B4332;line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:#8A7060;font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span{border-radius:999px;background:#F7F3EA;border:1px solid rgba(216,174,99,.14);padding:7px 11px;color:#5B4332;font-weight:900;font-size:12px}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:#5B4332}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,#D8AE63,#9A6C3C);display:block}
        .market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:16px;color:#9A6C3C}.market-disclaimer strong{display:block;color:#111;margin-bottom:4px}.market-disclaimer p{margin:0;color:#5B4332;font-size:13px;line-height:1.7;font-weight:800}
        @media(max-width:1180px){.market-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid{grid-template-columns:1fr}.market-search-panel{grid-template-columns:1fr 1fr}}
        @media(max-width:1024px){.market-main{margin-inline-start:0;padding:calc(88px + env(safe-area-inset-top)) 16px 18px;max-width:100%}}
        @media(max-width:720px){.market-main{padding-inline:14px}.market-hero{grid-template-columns:1fr;padding:22px;border-radius:22px}.market-search-panel,.market-card-grid,.market-stat-row{grid-template-columns:1fr}.market-search-panel button{width:100%}.market-hero-card strong{font-size:36px}.market-panel,.market-card{border-radius:18px}.compare-bars div{grid-template-columns:42px minmax(0,1fr) 48px}}
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
