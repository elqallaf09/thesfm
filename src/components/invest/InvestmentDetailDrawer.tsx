'use client';

import { RefreshCw, TrendingUp, X } from 'lucide-react';
import type { Investment } from '@/types/investment';
import { calculateInvestmentHoldingMetrics, investmentHoldingCurrency, investmentQuoteCurrency } from '@/lib/investmentCalculations';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  open: boolean;
  investment: Investment | null;
  labels: {
    details: string;
    type: string;
    currentValue: string;
    monthly: string;
    startDate: string;
    risk: string;
    expectedReturn: string;
    notes: string;
    close: string;
    symbol?: string;
    market?: string;
    quantity?: string;
    numberOfUnits?: string;
    assetQuantity?: string;
    metalCount?: string;
    metalWeight?: string;
    currentPrice?: string;
    currentMarketValue?: string;
    dataSource?: string;
    lastUpdated?: string;
    refreshPrice?: string;
    refreshingPrice?: string;
    unavailable?: string;
    purchasePrice?: string;
    totalInvested?: string;
    profitLoss?: string;
    currentPriceUnavailable?: string;
    purchasePriceMissing?: string;
    purchasePlatform?: string;
    purchasePlatformPending?: string;
    purchasePlatformNotSpecified?: string;
    platformTypeLabels?: Record<string, string>;
    marketQuoteCurrency?: string;
    conversionStale?: string;
    conversionUnavailable?: string;
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  formatNativeMoney: (amount: number | null | undefined, currency?: string | null, item?: Investment | null, options?: { unitPrice?: boolean }) => string;
  accountValue: number | null;
  detailsReady?: boolean;
  onClose: () => void;
  onRefreshPrice?: (item: Investment) => void;
  refreshing?: boolean;
}

export function InvestmentDetailDrawer({
  open,
  investment,
  labels,
  typeLabel,
  riskLabel,
  formatMoney,
  formatNativeMoney,
  accountValue,
  detailsReady = true,
  onClose,
  onRefreshPrice,
  refreshing = false,
}: Props) {
  const { t, lang, dir } = useLanguage();
  if (!open || !investment) return null;

  const linkedSymbol = investment.providerSymbol || investment.symbol;
  const unavailable = labels.unavailable || '-';
  const holdingCurrency = investmentHoldingCurrency(investment);
  const quoteCurrency = investmentQuoteCurrency(investment);
  const metrics = calculateInvestmentHoldingMetrics(investment);
  const quoteValueNumber = Number(investment.nativeMarketValue ?? investment.currentMarketValue);
  const quoteValue = Number.isFinite(quoteValueNumber) ? quoteValueNumber : null;
  const isMetal = investment.type === 'gold' || investment.type === 'silver';
  const metalPieceCount = Number(investment.quantity);

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onClose}>
      <aside className="invest-drawer" role="dialog" aria-modal="true" dir={dir} onMouseDown={event => event.stopPropagation()}>
        <div className="invest-drawer-head">
          <div className="invest-drawer-title">
            <span><TrendingUp size={18} /></span>
            <div>
              <p>{labels.details}</p>
              <h3>{investment.name}</h3>
            </div>
          </div>
          <button type="button" className="invest-icon-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        {linkedSymbol && onRefreshPrice && (
          <button type="button" className="invest-refresh-wide" onClick={() => onRefreshPrice(investment)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'invest-spin' : undefined} />
            {refreshing ? labels.refreshingPrice : labels.refreshPrice}
          </button>
        )}

        {detailsReady && (
          <>
        <section className="invest-drawer-section" aria-label={S('نظرة عامة', 'Overview', 'Aperçu', lang)}>
          <h4>{S('نظرة عامة', 'Overview', 'Aperçu', lang)}</h4>
          <div className="invest-detail-grid">
            <Info label={labels.type} value={typeLabel(investment.type)} />
            <Info label={labels.risk} value={riskLabel(investment.riskLevel)} />
            {linkedSymbol && <Info label={labels.symbol || t('invest_detail_symbol')} value={linkedSymbol} ltr />}
            {investment.market && <Info label={labels.market || t('invest_detail_market')} value={investment.market} />}
            {investment.type === 'project' && investment.projectId && <Info label={t('invest_detail_linked_project')} value={investment.projectName || investment.name} />}
          </div>
        </section>

        <section className="invest-drawer-section" aria-label={S('الأسعار', 'Prices', 'Prix', lang)}>
          <h4>{S('الأسعار', 'Prices', 'Prix', lang)}</h4>
          <div className="invest-detail-grid">
            {metrics.purchasePrice !== null && (
              <Info label={labels.purchasePrice || t('invest_detail_purchase_price')} value={formatNativeMoney(metrics.purchasePrice, holdingCurrency, investment, { unitPrice: true })} ltr />
            )}
            {metrics.currentPrice !== null && quoteCurrency && (
              <Info label={labels.currentPrice || t('invest_detail_current_price')} value={formatNativeMoney(metrics.currentPrice, quoteCurrency, investment, { unitPrice: true })} ltr />
            )}
            {metrics.currentPrice === null && metrics.isMarketLinked && (
              <Info label={labels.currentPrice || t('invest_detail_current_price')} value={labels.currentPriceUnavailable || unavailable} />
            )}
            {investment.lastPriceUpdatedAt && <Info label={labels.lastUpdated || t('invest_detail_last_updated')} value={formatDate(investment.lastPriceUpdatedAt, lang) || unavailable} ltr />}
          </div>
        </section>

        <section className="invest-drawer-section" aria-label={S('الملكية', 'Ownership', 'Propriété', lang)}>
          <h4>{S('الملكية', 'Ownership', 'Propriété', lang)}</h4>
          <div className="invest-detail-grid">
            {!isMetal && metrics.quantity !== null && <Info label={quantityLabel(investment, labels, t)} value={formatPreciseNumber(metrics.quantity, lang)} ltr />}
            {isMetal && Number.isFinite(metalPieceCount) && metalPieceCount > 0 && (
              <Info label={labels.metalCount || labels.assetQuantity || t('invest_detail_piece_count')} value={formatPreciseNumber(metalPieceCount, lang)} ltr />
            )}
            {isMetal && investment.metalProductType && (
              <Info label={t('invest_detail_metal_type')} value={metalProductLabel(investment.metalProductType, t)} />
            )}
            {investment.type === 'gold' && typeof investment.metalKarat === 'number' && <Info label={t('invest_detail_karat')} value={`${investment.metalKarat}K`} ltr />}
            {investment.type === 'silver' && typeof investment.metalPurity === 'number' && <Info label={t('invest_detail_purity')} value={formatPreciseNumber(investment.metalPurity, lang)} ltr />}
            {(investment.type === 'gold' || investment.type === 'silver') && typeof investment.grams === 'number' && <Info label={t('invest_detail_weight_grams')} value={`${formatPreciseNumber(investment.grams, lang)} g`} ltr />}
            {(investment.type === 'gold' || investment.type === 'silver') && typeof investment.pureMetalGrams === 'number' && <Info label={t('invest_detail_pure_metal')} value={`${formatPreciseNumber(investment.pureMetalGrams, lang)} g`} ltr />}
            {metrics.totalInvested !== null && holdingCurrency && (
              <Info label={labels.totalInvested || t('invest_detail_total_invested')} value={formatNativeMoney(metrics.totalInvested, holdingCurrency, investment)} ltr />
            )}
          </div>
        </section>

        <section className="invest-drawer-section" aria-label={S('الأداء', 'Performance', 'Performance', lang)}>
          <h4>{S('الأداء', 'Performance', 'Performance', lang)}</h4>
          <div className="invest-detail-grid">
            <Info
              label={labels.currentMarketValue || labels.currentValue}
              value={metrics.currentValue !== null && holdingCurrency
                ? formatNativeMoney(metrics.currentValue, holdingCurrency, investment)
                : labels.currentPriceUnavailable || unavailable}
              ltr={metrics.currentValue !== null}
            />
            {quoteValue !== null && quoteCurrency && holdingCurrency !== quoteCurrency && <Info label={labels.marketQuoteCurrency || t('invest_detail_original_value')} value={formatNativeMoney(quoteValue, quoteCurrency, null)} ltr />}
            {accountValue !== null && <Info label={t('invest_detail_account_value')} value={formatMoney(accountValue, 'valid')} />}
            {metrics.profitLossAmount !== null && holdingCurrency && (
              <Info
                label={labels.profitLoss || S('الربح / الخسارة', 'Profit / loss', 'Profit / perte', lang)}
                value={`${metrics.profitLossAmount > 0 ? '+' : ''}${formatNativeMoney(metrics.profitLossAmount, holdingCurrency, investment)}`}
                tone={metrics.profitLossAmount > 0 ? 'gain' : metrics.profitLossAmount < 0 ? 'loss' : undefined}
                ltr
              />
            )}
            {metrics.profitLossPercent !== null && (
              <Info
                label={S('نسبة العائد', 'ROI', 'ROI', lang)}
                value={`${metrics.profitLossPercent > 0 ? '+' : ''}${formatNumber(metrics.profitLossPercent, lang)}%`}
                tone={metrics.profitLossPercent > 0 ? 'gain' : metrics.profitLossPercent < 0 ? 'loss' : undefined}
                ltr
              />
            )}
          </div>
        </section>

        <section className="invest-drawer-section" aria-label={S('المزود', 'Provider', 'Fournisseur', lang)}>
          <h4>{S('المزود', 'Provider', 'Fournisseur', lang)}</h4>
          <div className="invest-detail-grid">
            <Info label={labels.purchasePlatform || t('invest_platform_detail_label')} value={investment.purchasePlatformName || labels.purchasePlatformNotSpecified || t('invest_platform_not_specified')} />
            {investment.purchasePlatformType && <Info label={t('invest_platform_type')} value={labels.platformTypeLabels?.[investment.purchasePlatformType] || investment.purchasePlatformType} />}
            {investment.purchasePlatformStatus === 'pending' && <Info label={t('invest_platform_detail_label')} value={labels.purchasePlatformPending || t('invest_platform_pending')} />}
            {(investment.priceSource || investment.dataSource) && <Info label={labels.dataSource || t('invest_detail_data_source')} value={investment.priceSource || investment.dataSource || ''} />}
            {metrics.conversionState === 'stale' && <Info label={labels.marketQuoteCurrency || 'FX'} value={labels.conversionStale || 'Using the last verified currency conversion'} />}
            {metrics.conversionState === 'unavailable' && <Info label={labels.marketQuoteCurrency || 'FX'} value={labels.conversionUnavailable || 'Currency conversion is currently unavailable'} />}
            {investment.fxRateToUserCurrency && quoteCurrency && investment.userCurrency && quoteCurrency !== investment.userCurrency && (
              <Info label={t('invest_detail_exchange_rate')} value={`1 ${quoteCurrency} = ${formatNumber(investment.fxRateToUserCurrency, lang)} ${investment.userCurrency}`} ltr />
            )}
          </div>
        </section>

        {investment.notes ? (
          <section className="invest-drawer-section" aria-label={labels.notes}>
            <h4>{labels.notes}</h4>
            <div className="invest-notes-box">
              <p>{investment.notes}</p>
            </div>
          </section>
        ) : null}

        <section className="invest-drawer-section" aria-label={S('بيانات إضافية', 'Metadata', 'Métadonnées', lang)}>
          <h4>{S('بيانات إضافية', 'Metadata', 'Métadonnées', lang)}</h4>
          <div className="invest-detail-grid">
            <Info label={labels.startDate} value={investment.startDate} />
            <Info label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
            <Info label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '-' : `${investment.expectedAnnualReturn}%`} />
          </div>
        </section>
          </>
        )}
      </aside>
    </div>
  );
}

function quantityLabel(investment: Investment, labels: Props['labels'], t: (key: string) => string) {
  if (investment.type === 'fund') return labels.numberOfUnits || labels.quantity || t('invest_detail_units');
  if (investment.type === 'crypto') return labels.assetQuantity || labels.quantity || t('invest_detail_quantity');
  return labels.quantity || t('invest_detail_quantity');
}

/* Inline trilingual copy, matching the page-level L() helper. */
function S(ar: string, en: string, fr: string, lang: string) {
  return lang === 'ar' ? ar : lang === 'fr' ? fr : en;
}

function Info({ label, value, ltr = false, tone }: { label: string; value: string; ltr?: boolean; tone?: 'gain' | 'loss' }) {
  return (
    <div>
      <span>{label}</span>
      <strong dir={ltr ? 'ltr' : undefined} className={tone ? `invest-tone-${tone}` : undefined}>{value}</strong>
    </div>
  );
}

function formatNumber(value: number, lang: string) {
  return value.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatPreciseNumber(value: number, lang: string) {
  return value.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value > 0 && value < 1 ? 10 : 4,
  });
}

function metalProductLabel(value: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    bar: t('invest_metal_bar'),
    lira: t('invest_metal_lira'),
    half_lira: t('invest_metal_half_lira'),
    quarter_lira: t('invest_metal_quarter_lira'),
    makhmus: t('invest_metal_makhmus'),
    half_makhmus: t('invest_metal_half_makhmus'),
    ten_tola: t('invest_metal_ten_tola'),
    ten_gram: t('invest_metal_ten_gram'),
    twenty_gram: t('invest_metal_twenty_gram'),
    ounce: t('invest_metal_ounce'),
    kilo: t('invest_metal_kilo'),
    custom_grams: t('invest_metal_custom_grams'),
  };
  return labels[value] || value;
}

function formatDate(value: string, lang: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
