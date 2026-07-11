'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import type { ProviderProfile, ProviderRole } from '@/lib/market-state/types';
import { PROVIDER_STATUS_ICON, PROVIDER_STATUS_TONE } from './statusPresentation';

const ROLE_LABEL_KEY: Record<ProviderRole, string> = {
  primary: 'market_provider_role_primary',
  secondary: 'market_provider_role_secondary',
  fallback: 'market_provider_role_fallback',
  discovery_only: 'market_provider_role_discovery_only',
  news_only: 'market_provider_role_news_only',
  metadata_only: 'market_provider_role_metadata_only',
};

/**
 * One provider's status card for the Provider Details Drawer. Never renders a raw
 * MarketProviderId — always routed through traderProviderDisplayName().
 */
export function ProviderCard({ profile }: { profile: ProviderProfile }) {
  const { lang, t } = useLanguage();
  const tone = PROVIDER_STATUS_TONE[profile.status];
  const Icon = PROVIDER_STATUS_ICON[profile.status];
  const name = traderProviderDisplayName(profile.provider) ?? profile.provider;

  const stats: Array<{ label: string; value: string }> = [];
  if (profile.latencyMs !== null) {
    stats.push({ label: t('market_provider_latency'), value: `${profile.latencyMs.toLocaleString()} ms` });
  }
  if (profile.successRatePercent !== null) {
    stats.push({ label: t('market_provider_success_rate'), value: `${profile.successRatePercent}%` });
  }
  if (profile.lastSuccessAt) {
    stats.push({ label: t('market_provider_last_success'), value: formatDateTime(profile.lastSuccessAt, lang) });
  }
  if (profile.lastErrorAt) {
    stats.push({ label: t('market_provider_last_failure'), value: formatDateTime(profile.lastErrorAt, lang) });
  }
  if (profile.rateLimitedUntil) {
    stats.push({ label: t('market_provider_rate_limit_reset'), value: formatDateTime(profile.rateLimitedUntil, lang) });
  }

  return (
    <article className={`market-provider-card tone-${tone}`}>
      <header>
        <span className="market-provider-card-icon" aria-hidden="true"><Icon size={16} /></span>
        <div className="market-provider-card-heading">
          <strong dir="ltr">{name}</strong>
          <span className="market-provider-card-role">{t(ROLE_LABEL_KEY[profile.role])}</span>
        </div>
        <span className={`market-status-badge ${tone}`}>{t(`market_state_status_${profile.status}`)}</span>
      </header>
      {stats.length > 0 ? (
        <dl className="market-provider-card-stats">
          {stats.map(stat => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd dir="auto">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
