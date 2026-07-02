'use client';

import { AlertTriangle, Bell, Clock3, Database, Gauge, ShieldAlert, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  MARKET_SIGNAL_DISCLAIMER_AR,
  MARKET_SIGNAL_DISCLAIMER_EN,
  type MarketSignal,
  type MarketSignalAction,
  type MarketSignalDataQuality,
  type MarketSignalRiskLevel,
} from '@/lib/market/signalEngine';

type MarketSignalPanelProps = {
  signal: MarketSignal | null;
  loading?: boolean;
  compact?: boolean;
};

const ACTION_BADGE: Record<MarketSignalAction, { label: string; className: string }> = {
  buy: { label: 'شراء', className: 'buy' },
  cautious_buy: { label: 'شراء بحذر', className: 'cautious-buy' },
  sell: { label: 'تجنب / بيع', className: 'sell' },
  sell_or_avoid: { label: 'تجنب / بيع', className: 'sell' },
  wait: { label: 'انتظار', className: 'wait' },
  watch: { label: 'مراقبة', className: 'watch' },
  insufficient_data: { label: 'بيانات غير كافية', className: 'insufficient' },
};

const RISK_LABELS: Record<MarketSignalRiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
};

const DATA_QUALITY_LABELS: Record<MarketSignalDataQuality, string> = {
  live: 'مباشرة',
  delayed: 'متأخرة',
  partial: 'جزئية',
  unavailable: 'غير متاحة',
};

function formatNumber(value: number | null | undefined, digits = 2) {
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value).toLocaleString('en-US', {
    numberingSystem: 'latn',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatPrice(value: number | null | undefined, currency?: string | null) {
  if (!Number.isFinite(Number(value))) return '--';
  const abs = Math.abs(Number(value));
  const digits = abs < 1 ? 6 : abs < 10 ? 4 : 2;
  return `${formatNumber(value, digits)} ${currency || ''}`.trim();
}

function formatPercent(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value, 2)}%`;
}

function formatRiskReward(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value, 2)}:1`;
}

function actionLabel(action: MarketSignalAction) {
  return ACTION_BADGE[action] ?? ACTION_BADGE.watch;
}

function Meter({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(95, Math.round(value)));
  return (
    <div className="market-signal-meter" aria-label={`confidence ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="market-signal-metric">
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function MarketSignalMiniBadge({ signal }: { signal: Pick<MarketSignal, 'action' | 'confidence'> | null | undefined }) {
  if (!signal) return null;
  const badge = actionLabel(signal.action);
  return (
    <span className={`market-signal-mini ${badge.className}`} title={`الثقة ${Math.round(signal.confidence)}%`}>
      {badge.label}
      <b>{Math.round(signal.confidence)}%</b>
      <style jsx>{`
        .market-signal-mini{
          display:inline-flex;
          align-items:center;
          gap:6px;
          border-radius:999px;
          padding:4px 8px;
          font-size:11px;
          font-weight:800;
          line-height:1;
          white-space:nowrap;
          border:1px solid rgba(15,23,42,.12);
          background:#f8fafc;
          color:#334155;
        }
        .market-signal-mini b{font:inherit;color:inherit;direction:ltr}
        .market-signal-mini.buy{background:#dcfce7;color:#166534;border-color:#86efac}
        .market-signal-mini.cautious-buy{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
        .market-signal-mini.sell{background:#fee2e2;color:#991b1b;border-color:#fecaca}
        .market-signal-mini.wait{background:#fef3c7;color:#92400e;border-color:#fde68a}
        .market-signal-mini.watch{background:#dbeafe;color:#1d4ed8;border-color:#bfdbfe}
        .market-signal-mini.insufficient{background:#f1f5f9;color:#475569;border-color:#cbd5e1}
      `}</style>
    </span>
  );
}

export function MarketSignalPanel({ signal, loading = false, compact = false }: MarketSignalPanelProps) {
  const badge = actionLabel(signal?.action ?? 'watch');
  const confidence = Math.max(0, Math.min(95, Math.round(signal?.confidence ?? 0)));
  const risk = signal?.riskLevel ? RISK_LABELS[signal.riskLevel] : '--';
  const dataQuality = signal?.dataQuality ? DATA_QUALITY_LABELS[signal.dataQuality] : '--';

  return (
    <article className={`market-signal-panel ${compact ? 'compact' : ''}`} dir="rtl" aria-busy={loading}>
      <header className="market-signal-header">
        <div>
          <span className="market-signal-eyebrow">
            <Bell size={14} />
            إشارة التداول
          </span>
          <h2>{signal?.symbol ? `تحليل الإشارة: ${signal.symbol}` : 'تحليل الإشارة'}</h2>
        </div>
        <span className={`market-signal-badge ${badge.className}`}>{badge.label}</span>
      </header>

      {loading ? (
        <div className="market-signal-loading" role="status">جاري تحليل البيانات المتاحة...</div>
      ) : !signal ? (
        <div className="market-signal-empty">
          <Database size={17} />
          البيانات غير كافية لإظهار إشارة موثوقة حالياً.
        </div>
      ) : (
        <>
          <div className="market-signal-main">
            <div className="market-signal-confidence">
              <span>الثقة</span>
              <strong dir="ltr">{confidence}%</strong>
              <Meter value={confidence} />
              <p className="market-signal-explanation">{signal.signalExplanationAr || signal.reasons[0] || badge.label}</p>
            </div>
            <div className="market-signal-price">
              <small>السعر الحالي</small>
              <strong dir="ltr">{formatPrice(signal.currentPrice, signal.currency)}</strong>
            </div>
          </div>

          <div className="market-signal-grid">
            <Metric icon={<Target size={16} />} label="الهدف" value={formatPrice(signal.targetPrice, signal.currency)} />
            <Metric icon={<ShieldAlert size={16} />} label="وقف الخسارة" value={formatPrice(signal.stopLoss, signal.currency)} />
            <Metric icon={<Target size={16} />} label="الصعود المتوقع" value={formatPercent(signal.upsidePercent)} />
            <Metric icon={<ShieldAlert size={16} />} label="الهبوط إلى وقف الخسارة" value={formatPercent(signal.downsidePercent)} />
            <Metric icon={<Gauge size={16} />} label="نسبة العائد إلى المخاطرة" value={formatRiskReward(signal.riskRewardRatio)} />
            <Metric icon={<Clock3 size={16} />} label="الأفق الزمني" value={signal.timeframe || '1-3 أسابيع'} />
            <Metric icon={<Gauge size={16} />} label="المخاطر" value={risk} />
            <Metric icon={<Database size={16} />} label="المزود" value={signal.provider || '--'} />
            <Metric icon={<AlertTriangle size={16} />} label="جودة البيانات" value={dataQuality} />
          </div>

          {!compact && (
            <div className="market-signal-details">
              <section>
                <h3>أسباب الإشارة</h3>
                <ul>
                  {signal.reasons.slice(0, 5).map(reason => <li key={reason}>{reason}</li>)}
                </ul>
              </section>
              <section>
                <h3>المخاطر والتنبيهات</h3>
                <ul>
                  {signal.warnings.slice(0, 5).map(warning => <li key={warning}>{warning}</li>)}
                </ul>
              </section>
              <section className="market-signal-score" aria-label="score breakdown">
                <h3>نقاط التقييم</h3>
                <dl>
                  <div><dt>فني</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.technicalScore, 0)} / 40</dd></div>
                  <div><dt>زخم</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.momentumScore, 0)} / 20</dd></div>
                  <div><dt>أخبار</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.newsScore, 0)} / 15</dd></div>
                  <div><dt>أساسيات</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.fundamentalsScore, 0)} / 15</dd></div>
                </dl>
              </section>
            </div>
          )}

          <p className="market-signal-disclaimer">
            {signal.disclaimerAr || MARKET_SIGNAL_DISCLAIMER_AR}
            <span>{signal.disclaimerEn || MARKET_SIGNAL_DISCLAIMER_EN}</span>
          </p>
        </>
      )}

      <style jsx>{`
        .market-signal-panel{
          border:1px solid rgba(15,23,42,.1);
          border-radius:16px;
          background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);
          box-shadow:0 16px 40px rgba(15,23,42,.07);
          padding:18px;
          display:grid;
          gap:16px;
          color:#0f172a;
        }
        .market-signal-header{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
        }
        .market-signal-eyebrow{
          display:inline-flex;
          align-items:center;
          gap:6px;
          color:#64748b;
          font-size:12px;
          font-weight:800;
        }
        .market-signal-header h2{
          margin:5px 0 0;
          font-size:clamp(18px,2vw,24px);
          letter-spacing:0;
        }
        .market-signal-badge{
          min-width:74px;
          text-align:center;
          border-radius:999px;
          padding:8px 12px;
          font-size:13px;
          font-weight:900;
          border:1px solid rgba(15,23,42,.1);
        }
        .market-signal-badge.buy{background:#dcfce7;color:#166534;border-color:#86efac}
        .market-signal-badge.cautious-buy{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
        .market-signal-badge.sell{background:#fee2e2;color:#991b1b;border-color:#fecaca}
        .market-signal-badge.wait{background:#fef3c7;color:#92400e;border-color:#fde68a}
        .market-signal-badge.watch{background:#dbeafe;color:#1d4ed8;border-color:#bfdbfe}
        .market-signal-badge.insufficient{background:#f1f5f9;color:#475569;border-color:#cbd5e1}
        .market-signal-loading,.market-signal-empty{
          display:flex;
          align-items:center;
          gap:8px;
          min-height:72px;
          border:1px dashed rgba(100,116,139,.28);
          border-radius:12px;
          padding:14px;
          color:#475569;
          background:#fff;
        }
        .market-signal-main{
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(160px,.35fr);
          gap:12px;
          align-items:stretch;
        }
        .market-signal-confidence,.market-signal-price,.market-signal-metric{
          border:1px solid rgba(15,23,42,.08);
          border-radius:12px;
          background:#fff;
          padding:12px;
        }
        .market-signal-confidence span,.market-signal-price small,.market-signal-metric small{
          display:block;
          color:#64748b;
          font-size:12px;
          font-weight:800;
        }
        .market-signal-confidence strong,.market-signal-price strong{
          display:block;
          margin-top:4px;
          font-size:24px;
          letter-spacing:0;
        }
        .market-signal-meter{
          height:8px;
          margin-top:10px;
          border-radius:999px;
          overflow:hidden;
          background:#e2e8f0;
        }
        .market-signal-meter span{
          display:block;
          height:100%;
          border-radius:999px;
          background:linear-gradient(90deg,#2563eb,#16a34a);
        }
        .market-signal-explanation{
          margin:10px 0 0;
          color:#475569;
          font-size:12px;
          line-height:1.6;
          font-weight:800;
        }
        .market-signal-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
        }
        .market-signal-metric{
          display:flex;
          align-items:center;
          gap:10px;
        }
        .market-signal-metric > span{
          width:34px;
          height:34px;
          border-radius:10px;
          display:grid;
          place-items:center;
          color:#2563eb;
          background:#eff6ff;
          flex:0 0 auto;
        }
        .market-signal-metric strong{
          display:block;
          margin-top:2px;
          font-size:13px;
          color:#0f172a;
          overflow-wrap:anywhere;
        }
        .market-signal-details{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:12px;
        }
        .market-signal-details section{
          border:1px solid rgba(15,23,42,.08);
          border-radius:12px;
          background:#fff;
          padding:12px;
          min-width:0;
        }
        .market-signal-details h3{
          margin:0 0 8px;
          font-size:13px;
        }
        .market-signal-details ul{
          margin:0;
          padding:0 18px 0 0;
          color:#334155;
          font-size:13px;
          line-height:1.65;
        }
        .market-signal-score dl{
          margin:0;
          display:grid;
          gap:7px;
          font-size:13px;
        }
        .market-signal-score div{
          display:flex;
          justify-content:space-between;
          gap:10px;
          color:#334155;
        }
        .market-signal-score dt,.market-signal-score dd{margin:0}
        .market-signal-disclaimer{
          margin:0;
          border-radius:12px;
          background:#fff7ed;
          color:#7c2d12;
          padding:11px 12px;
          font-size:12px;
          line-height:1.7;
          border:1px solid #fed7aa;
        }
        .market-signal-disclaimer span{
          display:block;
          direction:ltr;
          margin-top:2px;
        }
        .market-signal-panel.compact .market-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        @media (max-width: 780px){
          .market-signal-panel{padding:14px;border-radius:14px}
          .market-signal-header{align-items:center}
          .market-signal-main,.market-signal-grid,.market-signal-details{grid-template-columns:1fr}
          .market-signal-badge{min-width:64px}
        }
      `}</style>
    </article>
  );
}
