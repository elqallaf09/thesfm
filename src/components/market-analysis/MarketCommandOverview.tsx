'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTradingSessionsState, type TradingSessionId } from '@/lib/trading/sessions';
import {
  MarketOverviewPanel,
  type MarketOverviewPanelProps,
} from './MarketOverviewPanel';

type MarketCommandOverviewProps = Omit<MarketOverviewPanelProps, 'session'> & {
  sessionCopy: Readonly<{
    label: string;
    loading: string;
    noActiveSession: string;
    name: (sessionId: TradingSessionId) => string;
  }>;
};

export function MarketCommandOverview({ sessionCopy, ...props }: MarketCommandOverviewProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const session = useMemo(() => {
    if (now === null) {
      return {
        state: 'not-loaded' as const,
        label: sessionCopy.label,
        message: sessionCopy.loading,
        tone: 'neutral' as const,
      };
    }

    const openSessions = getTradingSessionsState(now).filter(item => item.isOpen);
    return {
      state: 'available' as const,
      label: sessionCopy.label,
      status: openSessions.length > 0
        ? openSessions.map(item => sessionCopy.name(item.id)).join(' · ')
        : sessionCopy.noActiveSession,
      tone: openSessions.length > 0 ? 'success' as const : 'neutral' as const,
    };
  }, [now, sessionCopy]);

  return <MarketOverviewPanel {...props} session={session} />;
}

export default MarketCommandOverview;
