'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, Clock3, Gauge } from 'lucide-react';
import type { ApiListState } from './types';
import { EmptyToolState } from './NewsSentimentPanel';
import { getActiveOverlapIds, getTradingSessionsState, isHighLiquidityPeriod, TRADING_OVERLAPS } from '@/lib/trading/sessions';

export function MarketDataPanel({
  icon,
  title,
  eyebrow,
  state,
  emptyTitle,
  emptyBody,
  loadingLabel,
}: {
  icon: ReactNode;
  title: string;
  eyebrow: string;
  state: ApiListState<Record<string, any>>;
  emptyTitle: string;
  emptyBody: string;
  loadingLabel: string;
}) {
  return (
    <section className="market-panel">
      <div className="market-section-head">
        {icon}
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {state.loading ? <div className="market-empty">{loadingLabel}</div> : (
        <EmptyToolState title={emptyTitle} body={state.message || emptyBody} />
      )}
    </section>
  );
}

type TradingOverlapId = 'sydney-tokyo' | 'tokyo-london' | 'london-newyork';

const TIMELINE_HOUR_MARKERS = [0, 4, 8, 12, 16, 20, 24];

const SESSION_TONE: Record<string, string> = {
  sydney: 'sydney',
  tokyo: 'tokyo',
  london: 'london',
  newyork: 'newyork',
};

const OVERLAP_TONE: Record<TradingOverlapId, 'medium' | 'high' | 'highest'> = {
  'sydney-tokyo': 'medium',
  'tokyo-london': 'high',
  'london-newyork': 'highest',
};

function tradingSessionNameKey(id: string) {
  return `market_session_name_${id}`;
}

function tradingOverlapNameKey(id: string) {
  return `market_overlap_${id.replace('-', '_')}`;
}

function tradingOverlapDescriptionKey(id: string) {
  return `market_overlap_${id.replace('-', '_')}_description`;
}

function tradingLiquidityLabelKey(tone: 'medium' | 'high' | 'highest') {
  if (tone === 'highest') return 'market_liquidity_highest';
  if (tone === 'high') return 'market_liquidity_high';
  return 'market_liquidity_medium';
}

function utcHourToLocalMinute(hourUtc: number, referenceDate: Date) {
  const date = new Date(referenceDate);
  date.setUTCSeconds(0, 0);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.getHours() * 60 + date.getMinutes();
}

function timelineSegments(startHourUtc: number, endHourUtc: number, referenceDate: Date) {
  const start = utcHourToLocalMinute(startHourUtc, referenceDate);
  const end = utcHourToLocalMinute(endHourUtc, referenceDate);
  const rawSegments = start < end
    ? [{ start, end }]
    : [{ start, end: 1440 }, { start: 0, end }];
  return rawSegments
    .filter(segment => segment.end > segment.start)
    .map(segment => ({
      left: `${(segment.start / 1440) * 100}%`,
      width: `${((segment.end - segment.start) / 1440) * 100}%`,
    }));
}

function formatUtcHourRange(startHourUtc: number, endHourUtc: number, referenceDate: Date, formatter: Intl.DateTimeFormat) {
  const start = new Date(referenceDate);
  start.setUTCSeconds(0, 0);
  start.setUTCHours(startHourUtc, 0, 0, 0);
  const end = new Date(referenceDate);
  end.setUTCSeconds(0, 0);
  end.setUTCHours(endHourUtc, 0, 0, 0);
  if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function TradingSessionsPanel({ t, locale }: { t: (key: string) => string; locale: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const sessions = getTradingSessionsState(now);
  const activeOverlapIds = getActiveOverlapIds(now);
  const formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="market-panel trading-sessions-dashboard">
      <div className="session-liquidity-head">
        <span className="session-liquidity-icon"><Clock3 size={22} /></span>
        <div>
          <small>{isHighLiquidityPeriod(now) ? t('market_high_liquidity') : t('market_sessions_utc_note')}</small>
          <h2>{t('market_liquidity_overlaps')}</h2>
          <p>{t('market_london_newyork_liquidity_note')}</p>
        </div>
      </div>

      <div className="session-overlap-summary-grid">
        {TRADING_OVERLAPS.map(overlap => {
          const tone = OVERLAP_TONE[overlap.id as TradingOverlapId];
          return (
            <article className={`session-overlap-card ${tone} ${activeOverlapIds.includes(overlap.id) ? 'active' : ''}`} key={overlap.id}>
              <span className="session-overlap-card-icon"><Activity size={16} /></span>
              <div>
                <strong>{t(tradingOverlapNameKey(overlap.id))}</strong>
                <p>{t(tradingOverlapDescriptionKey(overlap.id))}</p>
                <small dir="ltr">{formatUtcHourRange(overlap.startHourUtc, overlap.endHourUtc, now, formatter)}</small>
              </div>
              <b>{t(tradingLiquidityLabelKey(tone))}</b>
            </article>
          );
        })}
      </div>

      <div className="session-timeline-shell">
        <div className="session-timeline-title">
          <strong>{t('market_twenty_four_hour_timeline')}</strong>
          <span>{t('market_sessions_utc_note')}</span>
        </div>
        <div className="session-timeline-scroll">
          <div className="session-timeline-board" dir="ltr">
            <div className="session-hour-row" aria-hidden="true">
              {TIMELINE_HOUR_MARKERS.map(hour => (
                <span key={hour} style={{ left: `${(hour / 24) * 100}%` }}>{String(hour).padStart(2, '0')}</span>
              ))}
            </div>
            <div className="session-overlap-lane" aria-label={t('market_liquidity_overlaps')}>
              {TRADING_OVERLAPS.map(overlap => {
                const tone = OVERLAP_TONE[overlap.id as TradingOverlapId];
                return timelineSegments(overlap.startHourUtc, overlap.endHourUtc, now).map((segment, segmentIndex) => (
                  <span
                    key={`${overlap.id}-${segmentIndex}`}
                    className={`session-overlap-zone ${tone} ${activeOverlapIds.includes(overlap.id) ? 'active' : ''}`}
                    style={{ left: segment.left, width: segment.width }}
                  >
                    <b dir={locale === 'ar' ? 'rtl' : 'ltr'}>{t(tradingOverlapNameKey(overlap.id))}</b>
                  </span>
                ));
              })}
            </div>
            <div className="session-rows">
              {sessions.map(session => (
                <div className={`session-row ${SESSION_TONE[session.id] ?? ''}`} key={session.id}>
                  <div className="session-row-label" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <strong>{t(tradingSessionNameKey(session.id))}</strong>
                    <span className={`session-badge ${session.isOpen ? 'open' : ''}`}>{session.isOpen ? t('market_session_open') : t('market_session_closed')}</span>
                    <small dir="ltr">{formatUtcHourRange(session.openHourUtc, session.closeHourUtc, now, formatter)}</small>
                  </div>
                  <div className="session-row-track">
                    {timelineSegments(session.openHourUtc, session.closeHourUtc, now).map((segment, segmentIndex) => (
                      <span key={`${session.id}-${segmentIndex}`} className={`session-bar ${session.isOpen ? 'open' : ''}`} style={{ left: segment.left, width: segment.width }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .trading-sessions-dashboard{font-family:var(--font-ui)}
        .session-liquidity-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}
        .session-liquidity-icon{width:54px;height:54px;border-radius:var(--radius-panel);display:grid;place-items:center;background:var(--surface-muted);border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);color:var(--primary-hover)}
        .session-liquidity-head small{display:block;color:var(--primary-hover);font-size:12px;font-weight: 700;line-height:1.4}
        .session-liquidity-head h2{margin:3px 0 0;color:var(--foreground);font-size:clamp(24px,3vw,34px);font-weight: 700;line-height:1.2}
        .session-liquidity-head p{margin:8px 0 0;max-width:760px;color:var(--foreground-muted);font-size:14px;font-weight: 500;line-height:1.85}
        .session-overlap-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .session-overlap-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;border:1px solid color-mix(in srgb, var(--accent) 16%, transparent);background:var(--surface);border-radius:var(--radius-panel);padding:14px;box-shadow: var(--shadow-sm);overflow:hidden}
        .session-overlap-card::before{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:4px;background:color-mix(in srgb, var(--accent) 55%, transparent)}
        .session-overlap-card.high::before{background:var(--primary)}.session-overlap-card.highest::before{background:var(--accent)}
        .session-overlap-card.active{border-color:color-mix(in srgb, var(--accent) 38%, transparent);box-shadow: var(--shadow-sm)}
        .session-overlap-card-icon{width:40px;height:40px;border-radius:var(--radius-card);display:grid;place-items:center;border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--primary-hover)}
        .session-overlap-card strong{display:block;color:var(--foreground);font-size:15px;font-weight: 700;line-height:1.45}
        .session-overlap-card p{margin:5px 0 0;color:var(--foreground-muted);font-size:12px;font-weight: 500;line-height:1.65}
        .session-overlap-card small{display:inline-flex;margin-top:9px;border-radius:var(--radius-pill);border:1px solid color-mix(in srgb, var(--accent) 16%, transparent);background:var(--surface-muted);color:var(--foreground);padding:6px 9px;font-family:var(--font-data);font-size:12px;font-weight:700;line-height:1.2;font-variant-numeric:tabular-nums}
        .session-overlap-card b{grid-column:1/-1;width:max-content;max-width:100%;border-radius: var(--radius-pill);border:1px solid color-mix(in srgb, var(--warning) 22%, transparent);background:color-mix(in srgb, var(--warning) 10%, transparent);color:var(--warning);padding:6px 10px;font-size:12px;font-weight: 700;line-height:1.2}
        .session-overlap-card.high b{border-color:color-mix(in srgb, var(--primary) 22%, transparent);background:color-mix(in srgb, var(--primary) 10%, transparent);color:var(--primary)}
        .session-overlap-card.highest b{border-color:color-mix(in srgb, var(--accent) 25%, transparent);background:color-mix(in srgb, var(--accent) 12%, transparent);color:var(--primary-hover)}
        .session-timeline-shell{display:grid;gap:12px;border:1px solid color-mix(in srgb, var(--accent) 16%, transparent);border-radius:var(--radius-panel);padding:16px;background:var(--surface);min-width:0;overflow:hidden}
        .session-timeline-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}
        .session-timeline-title strong{color:var(--foreground);font-size:15px;font-weight: 700;line-height:1.45}
        .session-timeline-title span{max-width:560px;color:var(--foreground-muted);font-size:12px;font-weight: 500;line-height:1.65}
        .session-timeline-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:4px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
        .session-timeline-board{position:relative;min-width:760px;display:grid;gap:10px;padding:10px 12px 14px;border-radius:var(--radius-panel);border:1px solid color-mix(in srgb, var(--accent) 14%, transparent);background:var(--surface)}
        .session-hour-row{position:relative;height:24px;border-bottom:1px solid color-mix(in srgb, var(--foreground-muted) 18%, transparent)}
        .session-hour-row span{position:absolute;top:0;transform:translateX(-50%);color:var(--foreground-muted);font-family:var(--font-data);font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
        .session-hour-row span::after{content:"";position:absolute;top:20px;left:50%;width:1px;height:218px;background:color-mix(in srgb, var(--foreground-muted) 16%, transparent)}
        .session-overlap-lane{position:relative;height:58px;border-radius:var(--radius-card);background:var(--surface-muted);border:1px solid color-mix(in srgb, var(--accent) 12%, transparent);overflow:visible}
        .session-overlap-zone{position:absolute;top:10px;height:38px;border-radius: var(--radius-pill);background:color-mix(in srgb, var(--warning) 15%, transparent);border:1px solid color-mix(in srgb, var(--warning) 26%, transparent);box-shadow: var(--shadow-sm)}
        .session-overlap-zone.high{background:color-mix(in srgb, var(--primary) 14%, transparent);border-color:color-mix(in srgb, var(--primary) 28%, transparent)}
        .session-overlap-zone.highest{background:color-mix(in srgb, var(--accent) 18%, transparent);border-color:color-mix(in srgb, var(--accent) 34%, transparent)}
        .session-overlap-zone.active{box-shadow: var(--focus-shadow)}
        .session-overlap-zone b{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:max-content;max-width:180px;white-space:nowrap;border-radius: var(--radius-pill);background:var(--surface);border:1px solid color-mix(in srgb, var(--accent) 18%, transparent);color:var(--foreground);padding:6px 9px;font-size:12px;font-weight: 700;line-height:1.2;box-shadow: var(--shadow-sm)}
        .session-rows{display:grid;gap:10px}
        .session-row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px;align-items:center}
        .session-row-label{min-width:0;border:1px solid color-mix(in srgb, var(--accent) 14%, transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:10px;display:grid;gap:7px}
        .session-row-label strong{color:var(--foreground);font-size:14px;font-weight: 700;line-height:1.35}
        .session-row-label small{color:var(--foreground-muted);font-family:var(--font-data);font-size:12px;font-weight:700;line-height:1.2;font-variant-numeric:tabular-nums}
        .session-row-label .session-badge{width:max-content;border-radius: var(--radius-pill);padding:6px 9px;background:color-mix(in srgb, var(--foreground-muted) 12%, transparent);color:var(--foreground-muted);font-size:12px;font-weight: 700;line-height:1.2}
        .session-row-label .session-badge.open{background:color-mix(in srgb, var(--accent) 14%, transparent);color:var(--primary-hover)}
        .session-row-track{position:relative;height:44px;border-radius: var(--radius-pill);border:1px solid color-mix(in srgb, var(--accent) 12%, transparent);background:color-mix(in srgb, var(--foreground-muted) 10%, transparent);overflow:hidden}
        .session-bar{position:absolute;top:8px;bottom:8px;border-radius: var(--radius-pill);background:var(--chart-5);border:1px solid color-mix(in srgb, var(--surface) 14%, transparent)}
        .session-row.sydney .session-bar{background:var(--chart-1)}
        .session-row.tokyo .session-bar{background:var(--chart-3)}
        .session-row.london .session-bar{background:var(--chart-1)}
        .session-row.newyork .session-bar{background:var(--chart-4)}
        .session-bar.open{box-shadow: var(--shadow-sm)}
        @media(max-width:980px){.session-overlap-summary-grid{grid-template-columns:1fr}.session-timeline-title{display:grid}.session-timeline-title span{max-width:100%}}
        @media(max-width:640px){.session-liquidity-head{grid-template-columns:1fr}.session-timeline-shell{border-radius:var(--radius-panel);padding:12px}.session-overlap-card{border-radius:var(--radius-card)}.session-timeline-board{min-width:760px}.session-row{grid-template-columns:160px minmax(0,1fr);gap:10px}}
      `}</style>
    </section>
  );
}

export function SessionMetric({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'rtl' }) {
  return (
    <div className="session-metric">
      <span>{label}</span>
      <strong dir={valueDir}>{value}</strong>
    </div>
  );
}

function technicalEmptyStateCopy(code: string | undefined, t: (key: string) => string) {
  const normalizedCode = String(code ?? '').toUpperCase();
  if (normalizedCode === 'MARKET_DATA_TIMEOUT') {
    return { title: t('market_section_timeout_title'), body: t('market_section_timeout_body') };
  }
  if (normalizedCode === 'SYMBOL_REQUIRED') {
    return { title: t('market_technical_choose_asset_title'), body: t('market_technical_symbol_required_body') };
  }
  if (normalizedCode === 'UNSUPPORTED_SYMBOL') {
    return { title: t('market_technical_unified_empty_title'), body: t('market_technical_unsupported_symbol_body') };
  }
  if (normalizedCode === 'OHLC_DATA_NOT_AVAILABLE') {
    return { title: t('market_technical_partial_title'), body: t('market_technical_ohlc_unavailable_body') };
  }
  if (normalizedCode === 'PROVIDER_UNAVAILABLE' || normalizedCode === 'MARKET_DATA_UNAVAILABLE') {
    return { title: t('market_analysis_unavailable'), body: t('market_technical_provider_unavailable_body') };
  }
  return { title: t('market_technical_unified_empty_title'), body: t('market_technical_unified_empty_body') };
}

