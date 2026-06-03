'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  LineChart,
  Percent,
  PieChart,
  RefreshCcw,
  ShieldAlert,
  ShoppingCart,
  WalletCards,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type RiskLevel = 'low' | 'medium' | 'high' | null;

type PortfolioComparisonItem = {
  id: string;
  symbol: string;
  providerSymbol: string;
  name: string;
  quantity: number | null;
  purchasePrice: number | null;
  currentPrice: number | null;
  currency: string | null;
  currentMarketValue: number | null;
  costBasis: number | null;
  unrealizedProfitLoss: number | null;
  profitLossPercent: number | null;
  portfolioWeight: number | null;
  concentrationRisk: RiskLevel;
  latestChangePercent: number | null;
  updated_at: string | null;
  source: string | null;
  unavailable?: {
    purchasePrice?: boolean;
    quantity?: boolean;
    currentPrice?: boolean;
    marketPriceReason?: string | null;
  };
};

type PortfolioComparisonResponse =
  | {
    ok: true;
    market: string;
    marketName: string;
    totalPortfolioMarketValue?: number;
    updated_at?: string;
    message?: 'NO_PORTFOLIO_INVESTMENTS' | 'NO_MATCHING_INVESTMENTS';
    items: PortfolioComparisonItem[];
  }
  | {
    ok: false;
    code?: string;
    market?: string;
    items?: PortfolioComparisonItem[];
  };

type Props = {
  market: string;
  marketLabel: string;
  locale: string;
  t: (key: string) => string;
};

function toneForNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return 'unavailable';
  if (value > 0) return 'success';
  if (value < 0) return 'danger';
  return 'default';
}

function moneyDigits(currency: string | null | undefined, value: number | null | undefined) {
  const code = currency?.toUpperCase();
  if (code === 'KWD' || code === 'BHD' || code === 'OMR') return Math.abs(Number(value ?? 0)) < 10 ? 3 : 2;
  return 2;
}

export function PortfolioComparisonCard({ market, marketLabel, locale, t }: Props) {
  const [items, setItems] = useState<PortfolioComparisonItem[]>([]);
  const [message, setMessage] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');

  const unavailable = t('market_unavailable');

  const formatMoney = useCallback((value: number | null | undefined, currency: string | null | undefined, signed = false) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return unavailable;
    const digits = moneyDigits(currency, value);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Math.abs(value));
    const sign = signed && value > 0 ? '+' : signed && value < 0 ? '-' : '';
    return `${sign}${currency || ''} ${formatted}`.trim();
  }, [locale, unavailable]);

  const formatNumber = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return unavailable;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }, [locale, unavailable]);

  const formatPercent = useCallback((value: number | null | undefined, signed = false) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return unavailable;
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    const sign = signed && value > 0 ? '+' : signed && value < 0 ? '-' : '';
    return `${sign}${formatted}%`;
  }, [locale, unavailable]);

  const riskLabel = useCallback((risk: RiskLevel) => {
    if (!risk) return unavailable;
    return t(`market_concentration_${risk}`);
  }, [t, unavailable]);

  const load = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
      setNotice(t('portfolio_comparison_refreshing'));
    } else {
      setLoading(true);
      setNotice('');
    }
    setCode('');
    setMessage('');

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch(`/api/markets/portfolio-comparison?market=${encodeURIComponent(market)}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json().catch(() => ({})) as PortfolioComparisonResponse;

      if (!payload.ok) {
        setItems([]);
        setCode(payload.code || 'PORTFOLIO_COMPARISON_UNAVAILABLE');
        setNotice(manual ? t('portfolio_comparison_refresh_failed') : '');
        return;
      }

      setItems(payload.items ?? []);
      setMessage(payload.message ?? '');
      setNotice(manual ? t('portfolio_comparison_updated') : '');
    } catch {
      setItems([]);
      setCode('PORTFOLIO_COMPARISON_UNAVAILABLE');
      setNotice(manual ? t('portfolio_comparison_refresh_failed') : '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [market, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const primaryItem = useMemo(() => items[0] ?? null, [items]);
  const statusText = items.length > 0
    ? t('market_portfolio_data_available')
    : code === 'AUTH_REQUIRED'
      ? t('portfolio_comparison_login_required')
      : message === 'NO_PORTFOLIO_INVESTMENTS'
        ? t('market_no_portfolio_data')
        : t('portfolio_comparison_no_data_badge');

  const emptyTitle = code === 'AUTH_REQUIRED'
    ? t('portfolio_comparison_login_required')
    : code
      ? t('portfolio_comparison_error_title')
      : message === 'NO_PORTFOLIO_INVESTMENTS'
        ? t('portfolio_comparison_no_investments_title')
        : t('portfolio_comparison_no_matching');

  const emptyBody = code === 'AUTH_REQUIRED'
    ? t('portfolio_comparison_login_body')
    : code
      ? t('portfolio_comparison_error_body')
      : message === 'NO_PORTFOLIO_INVESTMENTS'
        ? t('portfolio_comparison_no_investments_body')
        : t('portfolio_comparison_no_matching_body');

  return (
    <section className="market-portfolio-card" aria-labelledby={`portfolio-comparison-${market}`}>
      <div className="market-portfolio-head">
        <div className="market-portfolio-title">
          <span aria-hidden="true"><WalletCards size={24} /></span>
          <div>
            <h2 id={`portfolio-comparison-${market}`}>{t('market_portfolio_comparison')}</h2>
            <p>{t('portfolio_comparison_market_subtitle')}</p>
          </div>
        </div>
        <div className="market-portfolio-actions">
          <span className={`market-portfolio-status ${items.length > 0 ? 'available' : 'unavailable'}`}>{statusText}</span>
          <button type="button" onClick={() => void load(true)} disabled={loading || refreshing}>
            <RefreshCcw size={15} className={refreshing ? 'spinning' : undefined} />
            {refreshing ? t('portfolio_comparison_refreshing_short') : t('portfolio_comparison_refresh')}
          </button>
        </div>
      </div>

      <div className="market-portfolio-context">
        <span>{t('market_symbol_exchange')}</span>
        <strong>{marketLabel}</strong>
        {notice ? <em>{notice}</em> : null}
      </div>

      {loading ? (
        <div className="market-portfolio-loading" aria-live="polite">
          <span />
          {t('portfolio_comparison_loading')}
        </div>
      ) : !primaryItem ? (
        <div className="market-portfolio-empty">
          <AlertTriangle size={19} />
          <div>
            <strong>{emptyTitle}</strong>
            <p>{emptyBody}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="market-portfolio-identity">
            <div>
              <span dir="ltr">{primaryItem.symbol}</span>
              <h3>{primaryItem.name}</h3>
              <p>{primaryItem.source ? `${t('market_data_source')}: ${primaryItem.source}` : t('portfolio_comparison_price_unavailable')}</p>
            </div>
            <strong className={`market-portfolio-risk ${primaryItem.concentrationRisk ?? 'unavailable'}`}>
              <ShieldAlert size={15} />
              {riskLabel(primaryItem.concentrationRisk)}
            </strong>
          </div>

          <div className="market-portfolio-metrics">
            <Metric icon={<CircleDollarSign size={18} />} label={t('market_current_price')} value={formatMoney(primaryItem.currentPrice, primaryItem.currency)} status={primaryItem.currentPrice === null ? 'unavailable' : 'default'} />
            <Metric icon={<ShoppingCart size={18} />} label={t('market_purchase_price')} value={formatMoney(primaryItem.purchasePrice, primaryItem.currency)} status={primaryItem.purchasePrice === null ? 'unavailable' : 'default'} />
            <Metric icon={<LineChart size={18} />} label={t('market_unrealized_pl')} value={formatMoney(primaryItem.unrealizedProfitLoss, primaryItem.currency, true)} status={toneForNumber(primaryItem.unrealizedProfitLoss)} />
            <Metric icon={<Percent size={18} />} label={t('market_gain_loss_percent')} value={formatPercent(primaryItem.profitLossPercent, true)} status={toneForNumber(primaryItem.profitLossPercent)} />
            <Metric icon={<PieChart size={18} />} label={t('market_portfolio_exposure')} value={formatPercent(primaryItem.portfolioWeight)} status={primaryItem.portfolioWeight === null ? 'unavailable' : 'default'} />
            <Metric icon={<ShieldAlert size={18} />} label={t('market_concentration_risk')} value={riskLabel(primaryItem.concentrationRisk)} status={primaryItem.concentrationRisk ?? 'unavailable'} valueDir={undefined} />
          </div>

          {items.length > 1 ? (
            <>
              <div className="market-portfolio-table-wrap">
                <table className="market-portfolio-table">
                  <thead>
                    <tr>
                      <th>{t('portfolio_comparison_symbol')}</th>
                      <th>{t('portfolio_comparison_company')}</th>
                      <th>{t('portfolio_comparison_quantity')}</th>
                      <th>{t('market_purchase_price')}</th>
                      <th>{t('market_current_price')}</th>
                      <th>{t('market_unrealized_pl')}</th>
                      <th>{t('market_gain_loss_percent')}</th>
                      <th>{t('market_portfolio_exposure')}</th>
                      <th>{t('market_concentration_risk')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td dir="ltr">{item.symbol}</td>
                        <td>{item.name}</td>
                        <td dir="ltr">{formatNumber(item.quantity)}</td>
                        <td dir="ltr">{formatMoney(item.purchasePrice, item.currency)}</td>
                        <td dir="ltr">{formatMoney(item.currentPrice, item.currency)}</td>
                        <td className={toneForNumber(item.unrealizedProfitLoss)} dir="ltr">{formatMoney(item.unrealizedProfitLoss, item.currency, true)}</td>
                        <td className={toneForNumber(item.profitLossPercent)} dir="ltr">{formatPercent(item.profitLossPercent, true)}</td>
                        <td dir="ltr">{formatPercent(item.portfolioWeight)}</td>
                        <td><span className={`market-portfolio-risk-chip ${item.concentrationRisk ?? 'unavailable'}`}>{riskLabel(item.concentrationRisk)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="market-portfolio-mobile-list">
                {items.map(item => (
                  <article key={item.id}>
                    <div>
                      <strong dir="ltr">{item.symbol}</strong>
                      <span>{item.name}</span>
                    </div>
                    <dl>
                      <dt>{t('portfolio_comparison_quantity')}</dt>
                      <dd dir="ltr">{formatNumber(item.quantity)}</dd>
                      <dt>{t('market_current_price')}</dt>
                      <dd dir="ltr">{formatMoney(item.currentPrice, item.currency)}</dd>
                      <dt>{t('market_unrealized_pl')}</dt>
                      <dd className={toneForNumber(item.unrealizedProfitLoss)} dir="ltr">{formatMoney(item.unrealizedProfitLoss, item.currency, true)}</dd>
                      <dt>{t('market_concentration_risk')}</dt>
                      <dd>{riskLabel(item.concentrationRisk)}</dd>
                    </dl>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      <style jsx global>{`
        .market-portfolio-card{--portfolio-panel:var(--gulf-panel,var(--europe-panel,var(--sfm-card)));--portfolio-panel-soft:var(--gulf-panel-soft,var(--europe-panel-soft,var(--sfm-light-card)));--portfolio-border:var(--gulf-border,var(--europe-border,rgba(29,140,255,.14)));--portfolio-border-strong:var(--gulf-border-strong,var(--europe-border-strong,rgba(29,140,255,.24)));--portfolio-text:var(--gulf-text,var(--europe-text,var(--sfm-primary-dark)));--portfolio-muted:var(--gulf-muted,var(--europe-muted,var(--sfm-muted)));--portfolio-accent:var(--gulf-accent,var(--europe-accent,var(--sfm-soft-cyan)));background:linear-gradient(180deg,var(--portfolio-panel),var(--portfolio-panel-soft));border:1px solid var(--portfolio-border);border-radius:24px;padding:20px;box-shadow:0 18px 48px rgba(3,18,37,.12);display:grid;gap:16px;min-width:0;overflow:hidden}
        .market-portfolio-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;min-width:0}.market-portfolio-title{display:flex;align-items:flex-start;gap:13px;min-width:0}.market-portfolio-title>span{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(29,140,255,.10));border:1px solid rgba(47,214,192,.28);color:var(--portfolio-accent);flex:0 0 auto}.market-portfolio-title h2{margin:0;color:var(--portfolio-text);font-size:24px;font-weight:950;line-height:1.25}.market-portfolio-title p{margin:6px 0 0;color:var(--portfolio-muted);font-size:13px;font-weight:850;line-height:1.7}.market-portfolio-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;justify-content:flex-end}.market-portfolio-status{border-radius:999px;padding:7px 11px;font-size:11px;font-weight:950;border:1px solid var(--portfolio-border);color:var(--portfolio-muted);background:rgba(142,166,195,.10);white-space:nowrap}.market-portfolio-status.available{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.24)}.dark .market-portfolio-status.available{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.market-portfolio-actions button{min-height:40px;border-radius:14px;border:1px solid rgba(47,214,192,.30);background:rgba(47,214,192,.10);color:#0F766E;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease}.dark .market-portfolio-actions button{color:#2FD6C0;background:rgba(47,214,192,.10);border-color:rgba(47,214,192,.26)}.market-portfolio-actions button:hover:not(:disabled),.market-portfolio-actions button:focus-visible:not(:disabled){outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.54);background:rgba(47,214,192,.16)}.market-portfolio-actions button:disabled{opacity:.65;cursor:not-allowed}.market-portfolio-context{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid var(--portfolio-border);background:rgba(47,214,192,.06);border-radius:18px;padding:11px 13px;color:var(--portfolio-muted);font-size:12px;font-weight:900}.market-portfolio-context strong{color:var(--portfolio-text)}.market-portfolio-context em{font-style:normal;color:#047857}.dark .market-portfolio-context em{color:#2FD6C0}.market-portfolio-loading,.market-portfolio-empty{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;border:1px dashed var(--portfolio-border-strong);border-radius:20px;padding:18px;color:var(--portfolio-muted);font-weight:850;line-height:1.7}.market-portfolio-loading span{width:26px;height:26px;border-radius:50%;border:3px solid rgba(47,214,192,.22);border-top-color:var(--portfolio-accent);animation:portfolioSpin .9s linear infinite}.market-portfolio-empty svg{color:var(--portfolio-accent)}.market-portfolio-empty strong{display:block;color:var(--portfolio-text);font-size:16px;font-weight:950}.market-portfolio-empty p{margin:4px 0 0;color:var(--portfolio-muted);font-size:13px;font-weight:850;line-height:1.7}@keyframes portfolioSpin{to{transform:rotate(360deg)}}
        .market-portfolio-identity{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--portfolio-border);border-radius:20px;padding:15px;background:rgba(255,255,255,.38);min-width:0}.dark .market-portfolio-identity{background:rgba(19,36,58,.45)}.market-portfolio-identity div{min-width:0}.market-portfolio-identity span{display:inline-flex;width:max-content;border-radius:999px;background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.24);color:#0F766E;padding:6px 10px;font:950 12px Arial,sans-serif}.dark .market-portfolio-identity span{color:#2FD6C0}.market-portfolio-identity h3{margin:8px 0 0;color:var(--portfolio-text);font-size:20px;font-weight:950;line-height:1.3;overflow-wrap:anywhere}.market-portfolio-identity p{margin:5px 0 0;color:var(--portfolio-muted);font-size:12px;font-weight:850;line-height:1.6}.market-portfolio-risk,.market-portfolio-risk-chip{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;white-space:nowrap;border:1px solid var(--portfolio-border);color:var(--portfolio-muted);background:rgba(142,166,195,.10)}.market-portfolio-risk.low,.market-portfolio-risk-chip.low{color:#047857;background:#D1FAE5;border-color:rgba(16,185,129,.24)}.market-portfolio-risk.medium,.market-portfolio-risk-chip.medium{color:#B45309;background:#FEF3C7;border-color:rgba(245,158,11,.28)}.market-portfolio-risk.high,.market-portfolio-risk-chip.high{color:#B91C1C;background:#FEE2E2;border-color:rgba(239,68,68,.26)}.dark .market-portfolio-risk.low,.dark .market-portfolio-risk-chip.low{color:#86EFAC;background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.26)}.dark .market-portfolio-risk.medium,.dark .market-portfolio-risk-chip.medium{color:#FCD34D;background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.28)}.dark .market-portfolio-risk.high,.dark .market-portfolio-risk-chip.high{color:#FCA5A5;background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.28)}
        .market-portfolio-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.market-portfolio-metric{min-width:0;border:1px solid var(--portfolio-border);border-radius:18px;padding:13px;background:rgba(255,255,255,.52);display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center}.dark .market-portfolio-metric{background:rgba(19,36,58,.45)}.market-portfolio-metric>span{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:rgba(47,214,192,.10);color:var(--portfolio-accent);border:1px solid rgba(47,214,192,.18)}.market-portfolio-metric small{display:block;color:var(--portfolio-muted);font-size:11px;font-weight:950;line-height:1.4}.market-portfolio-metric strong{display:block;margin-top:4px;color:var(--portfolio-text);font-size:16px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.market-portfolio-metric.success strong,.market-portfolio-table .success,.market-portfolio-mobile-list .success{color:#047857}.market-portfolio-metric.danger strong,.market-portfolio-table .danger,.market-portfolio-mobile-list .danger{color:#DC2626}.market-portfolio-metric.unavailable strong{color:var(--portfolio-muted)}.dark .market-portfolio-metric.success strong,.dark .market-portfolio-table .success,.dark .market-portfolio-mobile-list .success{color:#2FD6C0}.dark .market-portfolio-metric.danger strong,.dark .market-portfolio-table .danger,.dark .market-portfolio-mobile-list .danger{color:#FF5B6E}
        .market-portfolio-table-wrap{overflow-x:auto;border:1px solid var(--portfolio-border);border-radius:18px;background:rgba(255,255,255,.38)}.dark .market-portfolio-table-wrap{background:rgba(19,36,58,.42)}.market-portfolio-table{width:100%;min-width:920px;border-collapse:separate;border-spacing:0;font-size:12px;color:var(--portfolio-text)}.market-portfolio-table th,.market-portfolio-table td{padding:12px 13px;text-align:start;border-bottom:1px solid var(--portfolio-border);white-space:nowrap}.market-portfolio-table th{color:var(--portfolio-muted);font-weight:950;background:rgba(47,214,192,.06)}.market-portfolio-table td{font-weight:900}.market-portfolio-table tbody tr:hover{background:rgba(47,214,192,.06)}.market-portfolio-table tr:last-child td{border-bottom:0}.market-portfolio-mobile-list{display:none}.spinning{animation:portfolioSpin .9s linear infinite}
        @media(max-width:900px){.market-portfolio-head,.market-portfolio-identity{display:grid}.market-portfolio-actions{justify-content:flex-start}.market-portfolio-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.market-portfolio-table-wrap{display:none}.market-portfolio-mobile-list{display:grid;gap:10px}.market-portfolio-mobile-list article{border:1px solid var(--portfolio-border);border-radius:18px;background:rgba(255,255,255,.42);padding:13px;display:grid;gap:11px}.dark .market-portfolio-mobile-list article{background:rgba(19,36,58,.42)}.market-portfolio-mobile-list article>div{display:grid;gap:4px}.market-portfolio-mobile-list strong{color:var(--portfolio-text);font-size:15px}.market-portfolio-mobile-list span{color:var(--portfolio-muted);font-weight:850;line-height:1.5}.market-portfolio-mobile-list dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:8px 12px}.market-portfolio-mobile-list dt{color:var(--portfolio-muted);font-size:12px;font-weight:950}.market-portfolio-mobile-list dd{margin:0;color:var(--portfolio-text);font-size:12px;font-weight:950;text-align:end}}
        @media(max-width:640px){.market-portfolio-card{padding:15px;border-radius:20px}.market-portfolio-title h2{font-size:21px}.market-portfolio-title>span{width:46px;height:46px}.market-portfolio-actions,.market-portfolio-actions button{width:100%}.market-portfolio-status{width:100%;text-align:center}.market-portfolio-metrics{grid-template-columns:1fr}.market-portfolio-metric{padding:12px}.market-portfolio-context{display:grid}}
      `}</style>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  status = 'default',
  valueDir = 'ltr',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status?: 'default' | 'success' | 'danger' | 'low' | 'medium' | 'high' | 'unavailable';
  valueDir?: 'ltr' | undefined;
}) {
  return (
    <div className={`market-portfolio-metric ${status}`}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir={valueDir}>{value}</strong>
      </div>
    </div>
  );
}
