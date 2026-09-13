'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import type { ProviderConfigEntry } from '@/lib/market-state/types';

/**
 * Admin-only safe configuration overview — env var NAME and presence only, never the credential
 * value. A missing provider key is a configuration warning, not automatically a platform outage:
 * another connected provider may already serve the same capability. Active impact is determined
 * separately by the capability/root-cause health logic.
 */
export function ConfigurationStatusList({ configuration }: { configuration: ProviderConfigEntry[] | null }) {
  const { t } = useLanguage();
  if (!configuration || configuration.length === 0) return null;

  return (
    <section className="market-configuration-list" aria-label={t('market_configuration_title')}>
      <h3>{t('market_configuration_title')}</h3>
      <ul>
        {configuration.map(entry => (
          <li key={entry.envVar} className={entry.configured ? 'tone-success' : 'tone-warning'}>
            <span className="market-configuration-icon" aria-hidden="true">
              {entry.configured ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            </span>
            <span dir="ltr" className="market-configuration-envvar">{entry.envVar}</span>
            <span dir="ltr" className="market-configuration-provider">{traderProviderDisplayName(entry.provider) ?? entry.provider}</span>
            <span className="market-configuration-status">
              {t(entry.configured ? 'market_configuration_configured' : 'market_configuration_missing')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
