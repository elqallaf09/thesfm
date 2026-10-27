'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { loadSupabaseClient } from '@/integrations/supabase/loadClient';
import { createDashboardDataSource, type DashboardQueryClient } from '@/lib/dashboard/sharedDataSource';

type DashboardData = ReturnType<typeof createDashboardDataSource> & { refresh: () => void };
const DashboardDataContext = createContext<DashboardData | null>(null);
// Keep the generated SDK schema narrow at the dynamic-table query boundary.
const loadDashboardClient = async (): Promise<DashboardQueryClient> =>
  await loadSupabaseClient() as unknown as DashboardQueryClient;

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = loading ? null : user?.id ?? null;
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const value = useMemo(() => ({
    // Auth resolves the same singleton before any owner-scoped read starts.
    ...createDashboardDataSource(loadDashboardClient, userId),
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
