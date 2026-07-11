'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { ProviderCard } from '@/components/market/ProviderCard';
import { ConfigurationStatusList } from '@/components/market/ConfigurationStatusList';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';

/** Reuses the existing ProviderCard grid and ConfigurationStatusList verbatim — no duplication. */
export function ProvidersTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_providers')}>
      <div className="ops-provider-grid">
        {ops.market.providerProfiles.map(profile => (
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
