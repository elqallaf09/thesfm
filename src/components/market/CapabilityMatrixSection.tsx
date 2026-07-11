'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { buildCapabilityMatrixView, DRAWER_CAPABILITY_ROWS } from '@/lib/market-state/capabilityMatrixView';
import type { MarketCapabilityKey, MarketSystemState } from '@/lib/market-state/types';
import { ConfigurationStatusList } from './ConfigurationStatusList';
import { ProviderCard } from './ProviderCard';
import { PROVIDER_STATUS_ICON, PROVIDER_STATUS_TONE } from './statusPresentation';

/** Label keys for exactly the 11 rows in DRAWER_CAPABILITY_ROWS — every row this section renders. */
const CAPABILITY_LABEL_KEY: Partial<Record<MarketCapabilityKey, string>> = {
  quotes: 'market_capability_quotes',
  news: 'market_capability_news',
  earnings: 'market_capability_earnings',
  dividends: 'market_capability_dividends',
  economic_calendar: 'market_capability_economic_calendar',
  profiles: 'market_capability_profiles',
  technical_data: 'market_capability_technical_data',
  gcc_markets: 'market_capability_gcc_markets',
  forex: 'market_capability_forex',
  crypto: 'market_capability_crypto',
  shariah_financials: 'market_capability_shariah_financials',
};

function capabilityLabelKey(capability: MarketCapabilityKey): string {
  return CAPABILITY_LABEL_KEY[capability] ?? 'market_state_capability_column';
}

/**
 * The full provider-cards + 11-row capability matrix + admin configuration list — the single
 * shared implementation used by both ProviderDetailsDrawer (inside a Sheet) and the admin
 * diagnostics page (inline, full width). Every provider/capability value is routed through
 * traderProviderDisplayName()/translation keys — never a raw MarketProviderId/MarketCapabilityKey.
 */
export function CapabilityMatrixSection({ system }: { system: MarketSystemState }) {
  const { t } = useLanguage();

  const configuredProviders = system.providerProfiles.filter(profile => profile.configured).map(profile => profile.provider);
  const matrixView = buildCapabilityMatrixView(system.capabilityMatrix, configuredProviders, DRAWER_CAPABILITY_ROWS);
  const columnTemplate = `minmax(170px,1.3fr) repeat(${Math.max(configuredProviders.length, 1)}, minmax(112px,1fr))`;

  return (
    <>
      {system.providerProfiles.length > 0 ? (
        <div className="market-provider-cards">
          {system.providerProfiles.map(profile => (
            <ProviderCard profile={profile} key={profile.provider} />
          ))}
        </div>
      ) : null}

      {configuredProviders.length === 0 ? (
        <p className="market-provider-drawer-empty">{t('market_header_not_configured')}</p>
      ) : (
        <div
          className="market-capability-matrix"
          role="table"
          aria-colcount={configuredProviders.length + 1}
          aria-rowcount={DRAWER_CAPABILITY_ROWS.length + 1}
        >
          <div className="market-capability-matrix-row market-capability-matrix-head" role="row" aria-rowindex={1} style={{ gridTemplateColumns: columnTemplate }}>
            <span role="columnheader" aria-colindex={1}>{t('market_state_capability_column')}</span>
            {configuredProviders.map((provider, index) => (
              <span role="columnheader" aria-colindex={index + 2} dir="ltr" key={provider}>
                {traderProviderDisplayName(provider) ?? provider}
              </span>
            ))}
          </div>
          {DRAWER_CAPABILITY_ROWS.map((capability, rowIndex) => (
            <div className="market-capability-matrix-row" role="row" aria-rowindex={rowIndex + 2} key={capability} style={{ gridTemplateColumns: columnTemplate }}>
              <span role="rowheader" aria-colindex={1}>{t(capabilityLabelKey(capability))}</span>
              {configuredProviders.map((provider, colIndex) => {
                const cell = matrixView[rowIndex]?.[colIndex];
                const cellStatus = cell?.status ?? 'unsupported';
                const tone = PROVIDER_STATUS_TONE[cellStatus];
                const Icon = PROVIDER_STATUS_ICON[cellStatus];
                const statusLabel = t(`market_state_status_${cellStatus}`);
                const providerName = traderProviderDisplayName(provider) ?? provider;
                const capabilityLabel = t(capabilityLabelKey(capability));
                return (
                  <span
                    role="cell"
                    aria-colindex={colIndex + 2}
                    key={provider}
                    data-label={providerName}
                    title={`${providerName} · ${capabilityLabel}: ${statusLabel}`}
                  >
                    <span className={`market-status-badge ${tone}`}>
                      <Icon size={13} aria-hidden="true" /> {statusLabel}
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <ConfigurationStatusList configuration={system.configuration} />
    </>
  );
}
