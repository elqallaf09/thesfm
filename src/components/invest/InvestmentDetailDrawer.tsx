'use client';

import { RefreshCw, TrendingUp, X } from 'lucide-react';
import type { Investment } from '@/types/investment';
import { calculateInvestmentHoldingMetrics, investmentNativeCurrency } from '@/lib/investmentCalculations';
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
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  formatNativeMoney: (amount: number | null | undefined, currency?: string | null, item?: Investment | null) => string;
  accountValue: number | null;
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
  onClose,
  onRefreshPrice,
  refreshing = false,
}: Props) {
  const { t, lang, dir } = useLanguage();
  if (!open || !investment) return null;

  const linkedSymbol = investment.providerSymbol || investment.symbol;
  const unavailable = labels.unavailable || '-';
  const nativeCurrency = investmentNativeCurrency(investment);
  const metrics = calculateInvestmentHoldingMetrics(investment);
  const nativeValue = metrics.currentValue;
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

        <div className="invest-detail-grid">
          <Info label={labels.type} value={typeLabel(investment.type)} />
          <Info
            label={labels.currentMarketValue || labels.currentValue}
            value={metrics.currentValue !== null && nativeCurrency
              ? formatNativeMoney(metrics.currentValue, nativeCurrency, investment)
              : labels.currentPriceUnavailable || unavailable}
            ltr={metrics.currentValue !== null}
          />
          {nativeValue !== null && nativeCurrency && <Info label={t('invest_detail_original_value')} value={formatNativeMoney(nativeValue, nativeCurrency, null)} ltr />}
          {accountValue !== null && <Info label={t('invest_detail_account_value')} value={formatMoney(accountValue, 'valid')} />}
          {investment.fxRateToUserCurrency && nativeCurrency && investment.userCurrency && nativeCurrency !== investment.userCurrency && (
            <Info label={t('invest_detail_exchange_rate')} value={`1 ${nativeCurrency} = ${formatNumber(investment.fxRateToUserCurrency, lang)} ${investment.userCurrency}`} ltr />
          )}
          <Info label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
          <Info label={labels.startDate} value={investment.startDate} />
          <Info label={labels.risk} value={riskLabel(investment.riskLevel)} />
          <Info label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '-' : `${investment.expectedAnnualReturn}%`} />
          {linkedSymbol && <Info label={labels.symbol || t('invest_detail_symbol')} value={linkedSymbol} ltr />}
          {investment.market && <Info label={labels.market || t('invest_detail_market')} value={investment.market} />}
          {investment.type === 'project' && investment.projectId && <Info label={t('invest_detail_linked_project')} value={investment.projectName || investment.name} />}
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
          {metrics.purchasePrice !== null && (
            <Info label={labels.purchasePrice || t('invest_detail_purchase_price')} value={formatNativeMoney(metrics.purchasePrice, nativeCurrency, investment)} ltr />
          )}
          {metrics.totalInvested !== null && nativeCurrency && (
            <Info label={labels.totalInvested || t('invest_detail_total_invested')} value={formatNativeMoney(metrics.totalInvested, nativeCurrency, investment)} ltr />
          )}
          {metrics.currentPrice !== null && nativeCurrency && (
            <Info label={labels.currentPrice || t('invest_detail_current_price')} value={formatNativeMoney(metrics.currentPrice, nativeCurrency, investment)} ltr />
          )}
          {metrics.currentPrice === null && metrics.isMarketLinked && (
            <Info label={labels.currentPrice || t('invest_detail_current_price')} value={labels.currentPriceUnavailable || unavailable} />
          )}
          {investment.lastPriceUpdatedAt && <Info label={labels.lastUpdated || t('invest_detail_last_updated')} value={formatDate(investment.lastPriceUpdatedAt, lang) || unavailable} ltr />}
          {(investment.priceSource || investment.dataSource) && <Info label={labels.dataSource || t('invest_detail_data_source')} value={investment.priceSource || investment.dataSource || ''} />}
        </div>

        <div className="invest-notes-box">
          <strong>{labels.notes}</strong>
          <p>{investment.notes || '-'}</p>
        </div>
      </aside>
    </div>
  );
}

function quantityLabel(investment: Investment, labels: Props['labels'], t: (key: string) => string) {
  if (investment.type === 'fund') return labels.numberOfUnits || labels.quantity || t('invest_detail_units');
  if (investment.type === 'crypto') return labels.assetQuantity || labels.quantity || t('invest_detail_quantity');
  return labels.quantity || t('invest_detail_quantity');
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <span>{label}</span>
      <strong dir={ltr ? 'ltr' : undefined}>{value}</strong>
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
