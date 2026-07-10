import type { MarketServiceState } from './types';

export type ServiceStatusTone = 'success' | 'info' | 'warning';

/**
 * Single source of truth for how MarketServiceState renders — previously this was three separate
 * ternary chains (serviceStatusValue/serviceStatusTone/serviceNotice) duplicating the same
 * decision three times over, each of which could silently drift out of sync with the others.
 */
export function marketServiceStatusPresentation(
  state: MarketServiceState,
  t: (key: string) => string,
): { value: string; tone: ServiceStatusTone; notice: string } {
  switch (state) {
    case 'connected':
      return { value: t('market_connected_short'), tone: 'success', notice: t('market_service_connected') };
    case 'checking':
      return { value: t('market_service_checking_short'), tone: 'info', notice: t('loading') };
    case 'degraded':
    case 'slow':
      return { value: t('market_data_status_delayed'), tone: 'warning', notice: t('market_service_degraded') };
    case 'not_configured':
      return { value: t('market_service_not_connected_short'), tone: 'warning', notice: t('market_service_not_configured') };
    case 'unavailable':
      return { value: t('market_service_not_connected_short'), tone: 'warning', notice: t('market_service_unavailable') };
    default:
      return { value: t('market_service_not_connected_short'), tone: 'warning', notice: t('loading') };
  }
}
