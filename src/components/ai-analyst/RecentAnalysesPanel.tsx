'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock3, FileClock } from 'lucide-react';
import type {
  AnalysisStatus,
  ConfidenceQuality,
  FreshnessState,
  IntelligenceAssetType,
  IntelligenceHorizon,
  IntelligenceRecommendation,
  IntelligenceRisk,
} from '@/domain/intelligence/contracts';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, HORIZON_LABELS, RECOMMENDATION_LABELS, RISK_LABELS, aiAnalystLocale, aiAnalystNumber, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';
import panelStyles from './RecentAnalysesPanel.module.css';

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
  confidenceQuality: ConfidenceQuality;
  risk: IntelligenceRisk;
  horizon: IntelligenceHorizon;
  generatedAt: string;
  freshness: FreshnessState;
  status: AnalysisStatus;
};

type RecentResponse = { ok?: unknown; recent?: { items?: unknown } };

const ASSET_TYPES = new Set<IntelligenceAssetType>(['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND']);
const HORIZONS = new Set<IntelligenceHorizon>(['INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM']);
const RECOMMENDATIONS = new Set<IntelligenceRecommendation>(['BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA']);
const RISKS = new Set<IntelligenceRisk>(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'UNAVAILABLE']);
const CONFIDENCE_QUALITIES = new Set<ConfidenceQuality>(['STRONG_EVIDENCE', 'MODERATE_EVIDENCE', 'LIMITED_EVIDENCE', 'INSUFFICIENT_EVIDENCE']);
const FRESHNESS = new Set<FreshnessState>(['FRESH', 'DELAYED', 'STALE', 'UNAVAILABLE']);
const STATUSES = new Set<AnalysisStatus>(['COMPLETE', 'PARTIAL', 'INSUFFICIENT_DATA', 'FAILED']);

const INSUFFICIENT_REASON_COPY = {
  ar: {
    risk: 'دليل المخاطر غير متاح',
    unavailable: 'بيانات السوق غير متاحة',
    stale: 'البيانات السوقية قديمة أو متأخرة',
    evidence: 'الأدلة المتاحة غير كافية',
    coverage: 'التغطية السوقية غير مكتملة',
  },
  en: {
    risk: 'Risk evidence is unavailable',
    unavailable: 'Market data is unavailable',
    stale: 'Market data is stale or delayed',
    evidence: 'Available evidence is insufficient',
    coverage: 'Market coverage is incomplete',
  },
  fr: {
    risk: 'Les données de risque sont indisponibles',
    unavailable: 'Les données de marché sont indisponibles',
    stale: 'Les données de marché sont anciennes ou retardées',
    evidence: 'Les éléments disponibles sont insuffisants',
    coverage: 'La couverture du marché est incomplète',
  },
} as const;

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
  const normalized = stringValue(value).toUpperCase() as T;
  return allowed.has(normalized) ? normalized : null;
}

function itemFromUnknown(value: unknown): RecentItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const assetRaw = row.asset;
  if (!assetRaw || typeof assetRaw !== 'object' || Array.isArray(assetRaw)) return null;
  const asset = assetRaw as Record<string, unknown>;
  const assetType = enumValue(asset.assetType, ASSET_TYPES);
  const horizon = enumValue(row.horizon, HORIZONS);
  const recommendation = enumValue(row.recommendation, RECOMMENDATIONS);
  const risk = enumValue(row.risk, RISKS);
  const confidenceQuality = enumValue(row.confidenceQuality, CONFIDENCE_QUALITIES);
  const freshness = enumValue(row.freshness, FRESHNESS);
  const status = enumValue(row.status, STATUSES);
  const confidence = Number(row.confidence);
  const analysisId = stringValue(row.analysisId);
  const canonicalSymbol = stringValue(asset.canonicalSymbol);
  const displaySymbol = stringValue(asset.displaySymbol);
  const name = stringValue(asset.name);
  const generatedAt = stringValue(row.generatedAt);
  if (!analysisId || !canonicalSymbol || !displaySymbol || !name || !generatedAt || !assetType || !horizon || !recommendation || !risk || !confidenceQuality || !freshness || !status || !Number.isFinite(confidence)) return null;
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
    confidenceQuality,
    risk,
    horizon,
    generatedAt,
    freshness,
    status,
  };
}

function insufficientReason(item: RecentItem, locale: 'ar' | 'en' | 'fr') {
  if (item.recommendation !== 'INSUFFICIENT_DATA') return null;
  const copy = INSUFFICIENT_REASON_COPY[locale];
  if (item.risk === 'UNAVAILABLE') return copy.risk;
  if (item.freshness === 'UNAVAILABLE') return copy.unavailable;
  if (item.freshness === 'STALE' || item.freshness === 'DELAYED') return copy.stale;
  if (item.confidenceQuality === 'INSUFFICIENT_EVIDENCE') return copy.evidence;
  return copy.coverage;
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
            const reason = insufficientReason(item, locale);
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
                  <span className={`${styles.recentMetrics} ${panelStyles.metrics}`}>
                    <span className={`${styles.tag} ${styles.recommendation}`} data-recommendation={item.recommendation}>{RECOMMENDATION_LABELS[locale][item.recommendation]}</span>
                    <span className={styles.metricPill} dir="ltr">{aiAnalystNumber(locale, item.confidence)}%</span>
                    <span className={styles.metricPill}>{HORIZON_LABELS[locale][item.horizon]}</span>
                    <small className={styles.numeric} dir="ltr">{aiAnalystTimestamp(locale, item.generatedAt)}</small>
                    {reason ? <small className={panelStyles.reason}>{reason}</small> : null}
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
