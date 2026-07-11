'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import type { ProviderConfigEntry } from '@/lib/market-state/types';

/**
 * Admin-only safe configuration overview — env var NAME and presence only, never the credential
 * value. The API route omits `configuration` entirely (null, not []) from the public payload, so
 * this component simply renders nothing when there is nothing safe to show.
 */
export function ConfigurationStatusList({ configuration }: { configuration: ProviderConfigEntry[] | null }) {
  const { t } = useLanguage();
  if (!configuration || configuration.length === 0) return null;

  return (
    <section className="market-configuration-list" aria-label={t('market_configuration_title')}>
      <h3>{t('market_configuration_title')}</h3>
      <ul>
        {configuration.map(entry => (
          <li key={entry.envVar} className={entry.configured ? 'tone-success' : 'tone-danger'}>
            <span className="market-configuration-icon" aria-hidden="true">
              {entry.configured ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
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
