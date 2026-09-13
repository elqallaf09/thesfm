'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { ProviderCard } from '@/components/market/ProviderCard';
import { ConfigurationStatusList } from '@/components/market/ConfigurationStatusList';
import { buildProviderProfiles } from '@/lib/market-state/capabilityMatrixView';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';

/**
 * Provider cards are rebuilt from the current capability matrix so persisted snapshots created by
 * an older deployment cannot keep stale/misleading success percentages on screen.
 */
export function ProvidersTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  const profiles = buildProviderProfiles(ops.market.capabilityMatrix);

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_providers')}>
      <div className="ops-provider-grid">
        {profiles.map(profile => (
          <ProviderCard profile={profile} key={profile.provider} />
        ))}
      </div>
      <ConfigurationStatusList configuration={ops.market.configuration} />
      <style jsx global>{`
        .ops-provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
      `}</style>
    </section>
  );
}
