'use client';

import { useEffect, useState } from 'react';
import { Activity, Layers3, WalletCards } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { computeFreshness } from '@/lib/market-state/freshness';
import { getActiveOverlapIds, getTradingSessionsState } from '@/lib/trading/sessions';
import { useMarketSystemContext } from '@/components/market/MarketSystemStateProvider';
import { resolveMarketCommandDataHealth, type MarketCommandDataHealthState } from './marketCommandDataHealth';
import { MarketStatusStrip, type MarketStatusVisualState } from './MarketStatusStrip';

type MarketCommandCenterStatusProps = {
  selectedSymbol?: string | null;
};

const DATA_HEALTH_LABEL_KEYS = {
  loading: 'market_command_data_state_loading',
  ready: 'market_command_data_state_ready',
  partial: 'market_command_data_state_partial',
  stale: 'market_command_data_state_stale',
  unavailable: 'market_command_data_state_unavailable',
  providerError: 'market_command_data_state_provider_error',
  configurationRequired: 'market_command_data_state_configuration_required',
} as const;

const DATA_HEALTH_DESCRIPTION_KEYS = {
  loading: 'market_command_data_loading_description',
  ready: 'market_command_data_ready_description',
  partial: 'market_command_data_partial_description',
  stale: 'market_command_data_stale_description',
  unavailable: 'market_command_data_unavailable_description',
  providerError: 'market_command_data_provider_error_description',
  configurationRequired: 'market_command_data_configuration_required_description',
} as const;

const DATA_HEALTH_VISUAL_STATE: Record<MarketCommandDataHealthState, MarketStatusVisualState> = {
  loading: 'checking',
  ready: 'ready',
  partial: 'limited',
  stale: 'delayed',
  unavailable: 'unavailable',
  providerError: 'unavailable',
  configurationRequired: 'unknown',
};

const OVERLAP_LABEL_KEYS = {
  'sydney-tokyo': 'market_overlap_sydney_tokyo',
  'tokyo-london': 'market_overlap_tokyo_london',
  'london-newyork': 'market_overlap_london_newyork',
} as const;

export function MarketCommandCenterStatus({ selectedSymbol }: MarketCommandCenterStatusProps) {
  const { lang, t } = useLanguage();
  const { system, isLoading, error, retry } = useMarketSystemContext();
  const [sessionNow, setSessionNow] = useState<Date | null>(null);
  useEffect(() => {
    setSessionNow(new Date());
    const intervalId = window.setInterval(() => setSessionNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);
  const freshness = computeFreshness(system?.lastSynchronizedAt ?? null, 'quotes');
  const healthState = resolveMarketCommandDataHealth({
    isLoading,
    hasRequestError: Boolean(error),
    isStale: freshness.isStale,
    system,
  });
  const openSessions = sessionNow
    ? getTradingSessionsState(sessionNow).filter(session => session.isOpen)
    : [];
  const activeOverlaps = sessionNow ? getActiveOverlapIds(sessionNow) : [];
  const lastProviderUpdate = system?.lastSynchronizedAt
    ? formatDateTime(system.lastSynchronizedAt, lang)
    : '';

  const sessionValue = sessionNow === null
    ? t('market_command_data_state_loading')
    : openSessions.length > 0
    ? openSessions.map(session => t(`market_session_name_${session.id}`)).join(' · ')
    : t('market_command_no_active_session');
  const overlapValue = sessionNow === null
    ? t('market_command_data_state_loading')
    : activeOverlaps.length > 0
    ? activeOverlaps
        .map(overlap => t(OVERLAP_LABEL_KEYS[overlap as keyof typeof OVERLAP_LABEL_KEYS]))
        .join(' · ')
    : t('market_command_no_session_overlap');

  return (
    <MarketStatusStrip
      ariaLabel={t('market_command_status_title')}
      status={{
        state: DATA_HEALTH_VISUAL_STATE[healthState],
        label: `${t('market_command_data_health')}: ${t(DATA_HEALTH_LABEL_KEYS[healthState])}`,
        detail: t(DATA_HEALTH_DESCRIPTION_KEYS[healthState]),
      }}
      facts={[
        {
          id: 'selected-asset',
          label: t('market_command_selected_asset'),
          value: selectedSymbol || t('market_command_no_selected_asset'),
          icon: WalletCards,
          valueDirection: selectedSymbol ? 'ltr' : 'auto',
        },
        {
          id: 'active-sessions',
          label: t('market_command_active_sessions'),
          value: sessionValue,
          icon: Activity,
        },
        {
          id: 'session-overlap',
          label: t('market_command_session_overlap'),
          value: overlapValue,
          icon: Layers3,
        },
      ]}
      timestamp={lastProviderUpdate && system?.lastSynchronizedAt ? {
        value: system.lastSynchronizedAt,
        label: t('market_command_last_provider_update'),
        display: lastProviderUpdate,
      } : undefined}
      refreshAction={{
        label: t('market_command_refresh_status'),
        pendingLabel: t('market_refreshing_section'),
        onRefresh: retry,
        pending: isLoading,
      }}
    />
  );
}
