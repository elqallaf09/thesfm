'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createDashboardDataSource, type DashboardQueryClient } from '@/lib/dashboard/sharedDataSource';

type DashboardData = ReturnType<typeof createDashboardDataSource> & { refresh: () => void };
const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = loading ? null : user?.id ?? null;
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const value = useMemo(() => ({
    // Narrow the generated Supabase schema at this dynamic-table boundary.
    ...createDashboardDataSource(supabase as unknown as DashboardQueryClient, userId),
    refresh,
    // Refresh replaces the entire scope; old responses cannot repopulate it.
    revision,
  }), [userId, revision, refresh]);
  return <DashboardDataContext.Provider key={userId ?? 'anonymous'} value={value}>{children}</DashboardDataContext.Provider>;
}

// Outside /dashboard the economic panels retain their standalone loading path.
export function useDashboardData() {
  return useContext(DashboardDataContext);
}
