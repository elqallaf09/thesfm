'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { PriceHistoryChart } from '@/components/market-analysis/MarketChartComponents';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

type HistoryPoint = { time?: unknown; date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown; volume?: unknown };
type HistoryResponse = { ok?: boolean; success?: boolean; code?: unknown; points?: unknown; updated_at?: unknown; currency?: unknown };

function chartRangeForHorizon(horizon: AnalysisResult['horizon']): '1D' | '1W' | '1M' | '1Y' | 'ALL' {
  if (horizon === 'INTRADAY') return '1D';
  if (horizon === 'SHORT_TERM') return '1W';
  if (horizon === 'SWING') return '1M';
  if (horizon === 'POSITION') return '1Y';
  return 'ALL';
}

function marketAssetType(assetType: AnalysisResult['asset']['assetType']) {
  if (assetType === 'FUND') return 'etf';
  return assetType.toLowerCase();
}

function pointsFromResponse(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(raw => {
    const point = raw && typeof raw === 'object' ? raw as HistoryPoint : null;
    const close = Number(point?.close);
    const date = String(point?.time ?? point?.date ?? '').trim();
    if (!point || !date || !Number.isFinite(close)) return [];
    const optional = (item: unknown) => Number.isFinite(Number(item)) ? Number(item) : undefined;
    return [{
      date,
      close,
      open: optional(point.open),
      high: optional(point.high),
      low: optional(point.low),
      volume: optional(point.volume) ?? null,
    }];
  });
}

export function VerifiedPriceChart({ result }: { result: AnalysisResult }) {
  const { lang, t } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const range = chartRangeForHorizon(result.horizon);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState<ReturnType<typeof pointsFromResponse>>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(result.asset.quoteCurrency);
  const [retryToken, setRetryToken] = useState(0);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      symbol: result.asset.displaySymbol,
      providerSymbol: result.asset.providerSymbol,
      assetType: marketAssetType(result.asset.assetType),
      range,
    });
    return `/api/market/history?${params.toString()}`;
  }, [range, result.asset.assetType, result.asset.displaySymbol, result.asset.providerSymbol]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(false);
    void fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal: controller.signal })
      .then(async response => ({ response, payload: await response.json().catch(() => ({})) as HistoryResponse }))
      .then(({ response, payload }) => {
        if (!active) return;
        const points = response.ok && payload.ok === true && payload.success === true ? pointsFromResponse(payload.points) : [];
        setHistory(points);
        setUpdatedAt(typeof payload.updated_at === 'string' ? payload.updated_at : null);
        setCurrency(typeof payload.currency === 'string' ? payload.currency : result.asset.quoteCurrency);
        setError(points.length < 2);
      })
      .catch(error => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setHistory([]);
        setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [result.asset.quoteCurrency, retryToken, url]);

  return (
    <div className={styles.disclosureBody} data-testid="ai-analyst-verified-chart">
      {error && !loading ? <p className={styles.errorText} role="status"><AlertTriangle size={15} aria-hidden="true" />{copy.analysis.chartUnavailable}</p> : null}
      <PriceHistoryChart
        history={history}
        loading={loading}
        message={error ? copy.analysis.chartUnavailable : ''}
        timeframe={range}
        chartType="area"
        locale={locale}
        currency={currency}
        exchange={result.asset.exchange}
        symbol={result.asset.displaySymbol}
        updatedAt={updatedAt}
        onRetry={() => setRetryToken(value => value + 1)}
        t={t}
      />
      {error ? <button className={styles.secondaryAction} type="button" onClick={() => setRetryToken(value => value + 1)}><RefreshCw size={15} aria-hidden="true" />{copy.actions.retry}</button> : null}
    </div>
  );
}
