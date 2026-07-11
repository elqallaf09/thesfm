'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { CapabilityMatrixSection } from '@/components/market/CapabilityMatrixSection';
import { PROVIDER_STATUS_ICON, PROVIDER_STATUS_TONE } from '@/components/market/statusPresentation';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { SymbolCoverageCard } from '../components/SymbolCoverageCard';

/**
 * Deliberately does NOT reuse MarketHeaderSummary (it self-fetches via useMarketSystemContext(),
 * a second independent poll) — every Operations Center tab reads the same one OperationsCenterState
 * payload so sections can never drift out of sync. CapabilityMatrixSection is prop-driven so it's
 * reused as-is.
 */
export function MarketTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  const tone = PROVIDER_STATUS_TONE[ops.market.overall];
  const Icon = PROVIDER_STATUS_ICON[ops.market.overall];

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_market')}>
      <div className={`market-status-card tone-${tone}`} role="status">
        <span className="market-status-icon"><Icon size={16} /></span>
        <div className="market-status-body">
          <small dir="auto">{t(`market_state_status_${ops.market.overall}`)}</small>
        </div>
      </div>
      <SymbolCoverageCard coverage={ops.symbolCoverage} />
      <CapabilityMatrixSection system={ops.market} />
    </section>
  );
}
