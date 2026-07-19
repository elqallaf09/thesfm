'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock3, FileClock } from 'lucide-react';
import type { IntelligenceAssetType, IntelligenceHorizon, IntelligenceRecommendation, IntelligenceRisk } from '@/domain/intelligence/contracts';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, HORIZON_LABELS, RECOMMENDATION_LABELS, RISK_LABELS, aiAnalystLocale, aiAnalystNumber, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';

type RecentItem = {
  analysisId: string;
  asset: {
    canonicalSymbol: string;
    displaySymbol: string;
    name: string;
    assetType: IntelligenceAssetType;
    exchange: string | null;
    quoteCurrency: string | null;
  };
  recommendation: IntelligenceRecommendation;
  confidence: number;
  risk: IntelligenceRisk;
  horizon: IntelligenceHorizon;
  generatedAt: string;
};

type RecentResponse = { ok?: unknown; recent?: { items?: unknown } };

const ASSET_TYPES = new Set<IntelligenceAssetType>(['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND']);
const HORIZONS = new Set<IntelligenceHorizon>(['INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM']);
const RECOMMENDATIONS = new Set<IntelligenceRecommendation>(['BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA']);
const RISKS = new Set<IntelligenceRisk>(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'UNAVAILABLE']);

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function itemFromUnknown(value: unknown): RecentItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const assetRaw = row.asset;
  if (!assetRaw || typeof assetRaw !== 'object' || Array.isArray(assetRaw)) return null;
  const asset = assetRaw as Record<string, unknown>;
  const assetType = stringValue(asset.assetType).toUpperCase() as IntelligenceAssetType;
  const horizon = stringValue(row.horizon).toUpperCase() as IntelligenceHorizon;
  const recommendation = stringValue(row.recommendation).toUpperCase() as IntelligenceRecommendation;
  const risk = stringValue(row.risk).toUpperCase() as IntelligenceRisk;
  const confidence = Number(row.confidence);
  const analysisId = stringValue(row.analysisId);
  const canonicalSymbol = stringValue(asset.canonicalSymbol);
  const displaySymbol = stringValue(asset.displaySymbol);
  const name = stringValue(asset.name);
  const generatedAt = stringValue(row.generatedAt);
  if (!analysisId || !canonicalSymbol || !displaySymbol || !name || !generatedAt || !ASSET_TYPES.has(assetType) || !HORIZONS.has(horizon) || !RECOMMENDATIONS.has(recommendation) || !RISKS.has(risk) || !Number.isFinite(confidence)) return null;
  return {
    analysisId,
    asset: {
      canonicalSymbol,
      displaySymbol,
      name,
      assetType,
      exchange: stringValue(asset.exchange) || null,
      quoteCurrency: stringValue(asset.quoteCurrency) || null,
    },
    recommendation,
    confidence,
    risk,
    horizon,
    generatedAt,
  };
}

export function RecentAnalysesPanel({ className = '' }: { className?: string }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetch(`/api/intelligence/recent?locale=${encodeURIComponent(locale)}`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async response => ({ response, payload: await response.json().catch(() => ({})) as RecentResponse }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.recent?.items)) {
          setState('unavailable');
          return;
        }
        setItems(payload.recent.items.map(itemFromUnknown).filter((item): item is RecentItem => item !== null));
        setState('ready');
      })
      .catch(error => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setState('unavailable');
      });
    return () => { active = false; controller.abort(); };
  }, [locale]);

  return (
    <section className={`${styles.card} ${className}`} aria-labelledby="ai-analyst-recent-title" data-testid="ai-analyst-recent-analyses">
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{copy.overview.latestRecommendations}</p>
          <h2 id="ai-analyst-recent-title">{copy.overview.recent}</h2>
          <p>{copy.overview.recentBody}</p>
        </div>
        <FileClock aria-hidden="true" className={styles.placeholderIcon} />
      </header>
      {state === 'loading' ? <p className={styles.statusRail} role="status"><Clock3 size={16} aria-hidden="true" />{copy.overview.recentLoading}</p> : null}
      {state === 'unavailable' ? <p className={styles.errorText} role="status"><AlertTriangle size={16} aria-hidden="true" />{copy.overview.recentUnavailable}</p> : null}
      {state === 'ready' && items.length === 0 ? <p className={styles.statusRail}>{copy.overview.recentEmpty}</p> : null}
      {state === 'ready' && items.length > 0 ? (
        <ul className={styles.recentList}>
          {items.map(item => {
            const params = new URLSearchParams({ assetType: item.asset.assetType, horizon: item.horizon });
            return (
              <li key={item.analysisId}>
                <Link className={styles.recentItem} href={`/ai-analyst/analyze/${encodeURIComponent(item.asset.canonicalSymbol)}?${params.toString()}`}>
                  <AssetIdentity
                    variant="badge"
                    symbol={item.asset.displaySymbol}
                    name={item.asset.name}
                    assetType={marketAssetTypeFromIntelligence(item.asset.assetType)}
                    exchange={item.asset.exchange}
                    size="sm"
                    className={styles.recentIdentity}
                  />
                  <span className={styles.recentMetrics}>
                    <span className={`${styles.tag} ${styles.recommendation}`} data-recommendation={item.recommendation}>{RECOMMENDATION_LABELS[locale][item.recommendation]}</span>
                    <span className={styles.metricPill} dir="ltr">{aiAnalystNumber(locale, item.confidence)}%</span>
                    <span className={styles.metricPill}>{HORIZON_LABELS[locale][item.horizon]}</span>
                    <small className={styles.numeric} dir="ltr">{aiAnalystTimestamp(locale, item.generatedAt)}</small>
                    <span className={styles.visuallyHidden}>{RISK_LABELS[locale][item.risk]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
