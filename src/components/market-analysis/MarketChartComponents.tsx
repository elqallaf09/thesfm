'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, LineChart, RefreshCw } from 'lucide-react';
import type { MarketHistoryPoint } from '@/lib/market/marketService';
import type { MarketChartType, MarketTimeframe } from './types';
import { money, percent } from './utils';

export function MarketMetric({ label, value, icon, valueDir }: { label: string; value: string; icon?: ReactNode; valueDir?: 'ltr' | 'rtl' }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong dir={valueDir} className={valueDir === 'ltr' ? 'market-numeric-value' : undefined}>{icon}{value}</strong>
    </div>
  );
}

export function PriceHistoryChart({
  history,
  loading,
  message,
  timeframe,
  chartType,
  locale,
  currency,
  exchange,
  symbol,
  currentPrice,
  changePercent,
  trend,
  support,
  resistance,
  source,
  updatedAt,
  onRetry,
  t,
}: {
  history: MarketHistoryPoint[];
  loading: boolean;
  message: string;
  timeframe: MarketTimeframe;
  chartType: MarketChartType;
  locale: string;
  currency: string | null;
  exchange?: string | null;
  symbol?: string | null;
  currentPrice?: number | null;
  changePercent?: number | null;
  trend?: MarketTrend | null;
  support?: number | null;
  resistance?: number | null;
  source?: string | null;
  updatedAt?: string | null;
  onRetry?: () => void;
  t: (key: string) => string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartId = useId().replace(/:/g, '');
  const lineGradientId = `${chartId}-price-line`;
  const areaGradientId = `${chartId}-price-area`;
  const clipPathId = `${chartId}-price-clip`;
  const viewportClipPathId = `${chartId}-price-viewport-clip`;

  type ChartPoint = {
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    volume: number | null;
  };

  type OhlcChartPoint = ChartPoint & {
    open: number;
    high: number;
    low: number;
  };

  const numberOrNull = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const rawHistory = Array.isArray(history) ? history : [];

  const points = rawHistory
    .map(point => {
      const close = numberOrNull(point.close);
      const date = String(point.date ?? '').trim();
      const parsedTime = new Date(date).getTime();
      if (!date || !Number.isFinite(parsedTime) || close === null || close <= 0) return null;
      return {
        date,
        open: numberOrNull(point.open),
        high: numberOrNull(point.high),
        low: numberOrNull(point.low),
        close,
        volume: numberOrNull(point.volume),
        parsedTime,
      };
    })
    .filter((point): point is ChartPoint & { parsedTime: number } => point !== null)
    .sort((left, right) => left.parsedTime - right.parsedTime)
    .map(({ parsedTime: _parsedTime, ...point }) => point);

  const ohlcPoints = points
    .filter((point): point is OhlcChartPoint => (
      point.open !== null
      && point.high !== null
      && point.low !== null
      && point.open > 0
      && point.high > 0
      && point.low > 0
      && point.high >= Math.max(point.open, point.close)
      && point.low <= Math.min(point.open, point.close)
    ));
  const requiresOhlc = chartType === 'candlestick' || chartType === 'ohlc';
  const activePoints = requiresOhlc ? ohlcPoints : points;
  const hasOhlcForChart = ohlcPoints.length >= 2;
  const width = 760;
  const height = 320;
  const chartTop = 22;
  const chartBottom = 276;
  const chartLeft = 58;
  const chartRight = 666;
  const axisRight = width - 12;
  const plotWidth = chartRight - chartLeft;
  const candleSlot = plotWidth / Math.max(activePoints.length, 1);
  const candleWidth = Math.max(4, Math.min(13, candleSlot * 0.62));
  const edgeInset = Math.min(11, Math.max(5, candleWidth / 2 + 2));
  const xStart = chartLeft + edgeInset;
  const xEnd = chartRight - edgeInset;
  const domainBaseValues = (requiresOhlc && hasOhlcForChart
    ? activePoints.flatMap(point => [point.high, point.low, point.open, point.close])
    : points.map(point => point.close)
  )
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const domainLevelValues = [support, currentPrice, resistance]
    .map(value => numberOrNull(value))
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const domainValues = [...domainBaseValues, ...domainLevelValues];
  const min = domainValues.length > 0 ? Math.min(...domainValues) : 0;
  const max = domainValues.length > 0 ? Math.max(...domainValues) : 0;
  const rawSpread = max - min;
  const domainPadding = Math.max(rawSpread * 0.08, Math.max(max, 1) * 0.0035);
  const domainMin = Math.max(0, min - domainPadding);
  const domainMax = max + domainPadding;
  const spread = domainMax - domainMin || Math.max(max, 1) * 0.01;
  const xFor = (index: number) => activePoints.length <= 1
    ? (xStart + xEnd) / 2
    : xStart + (index / (activePoints.length - 1)) * (xEnd - xStart);
  const yFor = (value: number) => chartTop + ((domainMax - value) / spread) * (chartBottom - chartTop);
  const path = activePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point.close).toFixed(2)}`).join(' ');
  const areaPath = activePoints.length > 1
    ? `${path} L ${xFor(activePoints.length - 1).toFixed(2)} ${chartBottom.toFixed(2)} L ${xFor(0).toFixed(2)} ${chartBottom.toFixed(2)} Z`
    : '';
  const first = activePoints[0];
  const last = activePoints.at(-1);
  const isPositive = first && last ? last.close >= first.close : true;
  const ohlcUnavailable = !loading && requiresOhlc && points.length > 0 && !hasOhlcForChart;
  const insufficientChartPoints = !loading && activePoints.length < 2;
  const chartMessage = message
    || (ohlcUnavailable ? t('market_chart_ohlc_unavailable_short') : '')
    || (insufficientChartPoints ? t('market_chart_empty_range') : '');
  const chartStateTitle = ohlcUnavailable
    ? t('market_chart_ohlc_unavailable_short')
    : chartMessage === t('market_chart_provider_error')
      ? t('market_chart_error_title')
      : t('market_chart_partial_data_title');
  const chartStateDescription = ohlcUnavailable
    ? t('market_chart_ohlc_use_line_or_area')
    : t('market_chart_partial_data_body');
  const lineStartColor = isPositive ? '#1D8CFF' : '#EF4444';
  const lineEndColor = isPositive ? '#2FD6C0' : '#F59E0B';
  const areaColor = isPositive ? '#22D3EE' : '#EF4444';
  const axisValues = Array.from({ length: 5 }, (_, index) => domainMax - (spread * index) / 4);
  const verticalGridCount = Math.min(6, Math.max(3, Math.floor(activePoints.length / 8)));
  const tickWidth = Math.max(5, Math.min(11, candleWidth * 0.86));
  const chartMoney = (value: number) => money(value, currency, { locale, exchange, symbol });
  const chartMoneyOrUnavailable = (value: number | null) => value === null ? t('market_unavailable') : chartMoney(value);
  const resolvedCurrentPrice = numberOrNull(currentPrice) ?? last?.close ?? null;
  const levelLines = [
    { key: 'support', label: t('market_support_zone'), value: numberOrNull(support), className: 'support' },
    { key: 'current', label: t('market_current_price'), value: resolvedCurrentPrice, className: 'current' },
    { key: 'resistance', label: t('market_resistance_zone'), value: numberOrNull(resistance), className: 'resistance' },
  ].filter((item): item is { key: string; label: string; value: number; className: string } => item.value !== null && item.value > 0);
  const xLabelIndices = Array.from(new Set([
    0,
    Math.floor((activePoints.length - 1) * 0.25),
    Math.floor((activePoints.length - 1) * 0.5),
    Math.floor((activePoints.length - 1) * 0.75),
    activePoints.length - 1,
  ].filter(index => index >= 0 && index < activePoints.length)));
  const normalizedLocale = locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US';
  const formatVolume = (value: number | null) => value === null
    ? t('market_unavailable')
    : new Intl.NumberFormat(normalizedLocale, {
      notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: 2,
    }).format(value);
  const formatUpdatedAt = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(normalizedLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  const numericChange = numberOrNull(changePercent);
  type PartialSummaryItem = { key: string; label: string; value: string; tone?: string; dir?: 'ltr' };
  const partialSummaryItems: PartialSummaryItem[] = [];
  const summarySupport = numberOrNull(support);
  const summaryResistance = numberOrNull(resistance);
  const formattedUpdatedAt = formatUpdatedAt(updatedAt);
  if (resolvedCurrentPrice !== null) partialSummaryItems.push({ key: 'price', label: t('market_current_price'), value: chartMoney(resolvedCurrentPrice), dir: 'ltr' });
  if (numericChange !== null) partialSummaryItems.push({ key: 'change', label: t('market_daily_change'), value: percent(numericChange), tone: numericChange >= 0 ? 'up' : 'down', dir: 'ltr' });
  if (trend) partialSummaryItems.push({ key: 'trend', label: t('market_trend'), value: t(`market_trend_${trend}`) });
  if (summarySupport !== null) partialSummaryItems.push({ key: 'support', label: t('market_support_zone'), value: chartMoney(summarySupport), dir: 'ltr' });
  if (summaryResistance !== null) partialSummaryItems.push({ key: 'resistance', label: t('market_resistance_zone'), value: chartMoney(summaryResistance), dir: 'ltr' });
  if (source) partialSummaryItems.push({ key: 'source', label: t('market_asset_profile_data_source'), value: source });
  if (formattedUpdatedAt) partialSummaryItems.push({ key: 'updated', label: t('market_last_updated'), value: formattedUpdatedAt, dir: 'ltr' });
  const hoveredPoint = hoveredIndex !== null ? activePoints[hoveredIndex] ?? null : null;
  const tooltipX = hoveredIndex !== null ? xFor(hoveredIndex) : 0;
  const tooltipY = hoveredPoint ? yFor(hoveredPoint.close) : 0;
  const tooltipLeft = Math.min(78, Math.max(8, (tooltipX / width) * 100));
  const tooltipTop = Math.min(72, Math.max(12, (tooltipY / height) * 100));
  const handlePointerMove = (event: MouseEvent<SVGRectElement>) => {
    if (activePoints.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const nextIndex = Math.round(Math.min(1, Math.max(0, ratio)) * (activePoints.length - 1));
    setHoveredIndex(nextIndex);
  };
  const clearHover = () => setHoveredIndex(null);
  const canRenderChart = activePoints.length >= 2 && !chartMessage;

  return (
    <div className="price-history-chart" aria-busy={loading}>
      {canRenderChart ? (
        <>
          <div className="price-chart-values">
            <span>{t('market_price_chart')}</span>
            <strong dir="ltr">{chartMoney(last?.close ?? 0)}</strong>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t('market_price_chart')}
            preserveAspectRatio="none"
            onMouseLeave={clearHover}
          >
            <defs>
              <linearGradient id={lineGradientId} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor={lineStartColor} />
                <stop offset="100%" stopColor={lineEndColor} />
              </linearGradient>
              <linearGradient id={areaGradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={areaColor} stopOpacity="0.22" />
                <stop offset="62%" stopColor={areaColor} stopOpacity="0.08" />
                <stop offset="100%" stopColor={areaColor} stopOpacity="0" />
              </linearGradient>
              <clipPath id={clipPathId}>
                <rect x={chartLeft} y={chartTop} width={chartRight - chartLeft} height={chartBottom - chartTop} rx="8" />
              </clipPath>
              <clipPath id={viewportClipPathId}>
                <rect x="0" y="0" width={width} height={height} rx="12" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${viewportClipPathId})`}>
              {[0, 1, 2, 3, 4].map(index => {
                const y = chartTop + (index / 4) * (chartBottom - chartTop);
                return <line key={`h-${index}`} x1={chartLeft} x2={chartRight} y1={y} y2={y} className="price-chart-grid-line" />;
              })}
              {Array.from({ length: verticalGridCount }, (_, index) => index).map(index => {
                const x = chartLeft + (index / Math.max(verticalGridCount - 1, 1)) * (chartRight - chartLeft);
                return <line key={`v-${index}`} x1={x} x2={x} y1={chartTop} y2={chartBottom} className="price-chart-grid-line vertical" />;
              })}
              {axisValues.map((value, index) => {
                const y = yFor(value);
                return (
                  <text key={`axis-${index}`} x={axisRight} y={y} className="price-chart-y-label" textAnchor="end" dominantBaseline="middle">
                    {chartMoney(value)}
                  </text>
                );
              })}
              {xLabelIndices.map(index => {
                const point = activePoints[index];
                if (!point) return null;
                const x = xFor(index);
                return (
                  <text key={`x-axis-${point.date}-${index}`} x={x} y={height - 12} className="price-chart-x-label" textAnchor="middle">
                    {formatChartTimestamp(point.date, locale, timeframe)}
                  </text>
                );
              })}
              <g clipPath={`url(#${clipPathId})`}>
                {levelLines.map(level => {
                  const y = yFor(level.value);
                  return (
                    <g key={`level-${level.key}`} className={`price-chart-level ${level.className}`}>
                      <line x1={chartLeft} x2={chartRight} y1={y} y2={y} />
                      <title>{`${level.label}: ${chartMoney(level.value)}`}</title>
                    </g>
                  );
                })}
                {chartType === 'area' && areaPath ? <path d={areaPath} className="price-chart-area-path" fill={`url(#${areaGradientId})`} /> : null}
                {(chartType === 'line' || chartType === 'area') ? (
                  <>
                    <path d={path} className="price-chart-line-path" stroke={`url(#${lineGradientId})`} />
                    {last ? <circle cx={xFor(activePoints.length - 1)} cy={yFor(last.close)} r="4.2" className="price-chart-last-dot" /> : null}
                  </>
                ) : null}
                {chartType === 'candlestick' ? ohlcPoints.map((point, index) => {
                  const x = xFor(index);
                  const bullish = point.close >= point.open;
                  const openY = yFor(point.open);
                  const closeY = yFor(point.close);
                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(2, Math.abs(closeY - openY));
                  return (
                    <g key={`${point.date}-candle-${index}`} className={bullish ? 'price-candle up' : 'price-candle down'}>
                      <line x1={x} x2={x} y1={yFor(point.high)} y2={yFor(point.low)} className="price-candle-wick" />
                      <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx={Math.min(3, candleWidth / 2)} className="price-candle-body" />
                      <title>{[
                        `${t('market_time')}: ${formatChartTimestamp(point.date, locale, timeframe)}`,
                        `${t('market_open')}: ${chartMoney(point.open)}`,
                        `${t('market_high')}: ${chartMoney(point.high)}`,
                        `${t('market_low')}: ${chartMoney(point.low)}`,
                        `${t('market_close')}: ${chartMoney(point.close)}`,
                        point.volume !== null ? `${t('market_volume')}: ${Number(point.volume).toLocaleString('en-US')}` : '',
                      ].filter(Boolean).join('\n')}</title>
                    </g>
                  );
                }) : null}
                {chartType === 'ohlc' ? ohlcPoints.map((point, index) => {
                  const x = xFor(index);
                  const bullish = point.close >= point.open;
                  return (
                    <g key={`${point.date}-ohlc-${index}`} className={bullish ? 'price-ohlc up' : 'price-ohlc down'}>
                      <line x1={x} x2={x} y1={yFor(point.high)} y2={yFor(point.low)} className="price-ohlc-line" />
                      <line x1={x - tickWidth} x2={x} y1={yFor(point.open)} y2={yFor(point.open)} className="price-ohlc-tick" />
                      <line x1={x} x2={x + tickWidth} y1={yFor(point.close)} y2={yFor(point.close)} className="price-ohlc-tick" />
                      <title>{[
                        `${t('market_time')}: ${formatChartTimestamp(point.date, locale, timeframe)}`,
                        `${t('market_open')}: ${chartMoney(point.open)}`,
                        `${t('market_high')}: ${chartMoney(point.high)}`,
                        `${t('market_low')}: ${chartMoney(point.low)}`,
                        `${t('market_close')}: ${chartMoney(point.close)}`,
                        point.volume !== null ? `${t('market_volume')}: ${Number(point.volume).toLocaleString('en-US')}` : '',
                      ].filter(Boolean).join('\n')}</title>
                    </g>
                  );
                }) : null}
                {hoveredPoint ? (
                  <g className="price-chart-crosshair">
                    <line x1={tooltipX} x2={tooltipX} y1={chartTop} y2={chartBottom} />
                    <circle cx={tooltipX} cy={tooltipY} r="4" />
                  </g>
                ) : null}
              </g>
              {levelLines.map(level => {
                const y = yFor(level.value);
                return (
                  <text key={`level-label-${level.key}`} x={axisRight} y={y} className={`price-chart-level-label ${level.className}`} textAnchor="end" dominantBaseline="middle">
                    {chartMoney(level.value)}
                  </text>
                );
              })}
              <rect
                x={chartLeft}
                y={chartTop}
                width={chartRight - chartLeft}
                height={chartBottom - chartTop}
                className="price-chart-hit-zone"
                onMouseMove={handlePointerMove}
                onMouseLeave={clearHover}
              />
            </g>
          </svg>
          {hoveredPoint ? (
            <div
              className="price-chart-tooltip"
              style={{ insetInlineStart: `${tooltipLeft}%`, top: `${tooltipTop}%` }}
            >
              <strong dir="ltr">{formatChartTimestamp(hoveredPoint.date, locale, timeframe)}</strong>
              <dl>
                <div><dt>{t('market_open')}</dt><dd dir="ltr">{chartMoneyOrUnavailable(hoveredPoint.open)}</dd></div>
                <div><dt>{t('market_high')}</dt><dd dir="ltr">{chartMoneyOrUnavailable(hoveredPoint.high)}</dd></div>
                <div><dt>{t('market_low')}</dt><dd dir="ltr">{chartMoneyOrUnavailable(hoveredPoint.low)}</dd></div>
                <div><dt>{t('market_close')}</dt><dd dir="ltr">{chartMoney(hoveredPoint.close)}</dd></div>
                <div><dt>{t('market_volume')}</dt><dd dir="ltr">{formatVolume(hoveredPoint.volume)}</dd></div>
              </dl>
            </div>
          ) : null}
          <div className="price-chart-axis">
            <span dir="ltr">{first ? formatChartTimestamp(first.date, locale, timeframe) : ''}</span>
            <span dir="ltr">{chartMoney(min)} - {chartMoney(max)}</span>
            <span dir="ltr">{last ? formatChartTimestamp(last.date, locale, timeframe) : ''}</span>
          </div>
        </>
      ) : null}
      {chartMessage ? (
        <div className={`price-chart-state ${partialSummaryItems.length ? 'partial' : ''} ${chartMessage === t('market_chart_provider_error') ? 'error' : ''}`}>
          <span className="price-chart-state-icon" aria-hidden="true">
            {chartMessage === t('market_chart_provider_error') ? <AlertTriangle size={22} /> : <LineChart size={22} />}
          </span>
          <div className="price-chart-state-copy">
            <strong>{chartStateTitle}</strong>
            <p>{chartStateDescription}</p>
            <small>{t('market_chart_timeframe_empty_hint').replace('{timeframe}', timeframe)}</small>
          </div>
          {partialSummaryItems.length ? (
            <div className="price-chart-summary-grid">
              {partialSummaryItems.map(item => (
                <div key={item.key} className={item.tone ? `price-chart-summary-item ${item.tone}` : 'price-chart-summary-item'}>
                  <span>{item.label}</span>
                  <b dir={item.dir}>{item.value}</b>
                </div>
              ))}
            </div>
          ) : null}
          <div className="price-chart-state-actions">
            {onRetry ? (
              <button type="button" onClick={onRetry}>
                <RefreshCw size={15} aria-hidden="true" />
                {t('market_retry')}
              </button>
            ) : null}
            <span>{t('market_chart_change_timeframe_hint')}</span>
          </div>
        </div>
      ) : null}
      {loading ? (
        <div className="price-chart-loading" role="status">
          <div className="price-chart-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>{t('market_chart_loading')}</strong>
        </div>
      ) : null}
    </div>
  );
}

type PortfolioMetricTone = 'default' | 'unavailable' | 'success' | 'warning' | 'danger';

export function PortfolioComparisonMetric({
  icon,
  label,
  value,
  valueDir,
  status = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueDir?: 'ltr' | 'rtl';
  status?: PortfolioMetricTone;
}) {
  return (
    <div className={`portfolio-comparison-metric ${status}`}>
      <span className="portfolio-metric-icon" aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir={valueDir}>{value}</strong>
      </div>
    </div>
  );
}
