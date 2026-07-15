'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAccountActivityRows, type AccountActivityRow } from '@/lib/accountActivity';

const CACHE_TTL_MS = 30_000;
const activityCache = new Map<string, { rows: AccountActivityRow[]; cachedAt: number }>();

export function useRecentAccountActivity(limit = 6) {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AccountActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (authLoading) return;
    if (!user) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    const cached = activityCache.get(user.id);
    if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      setRows(cached.rows.slice(0, limit));
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('account_activity')
        .select('id,user_id,event_type,title,description,entity_type,entity_id,metadata,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (queryError) throw new Error(queryError.message);

      const next = normalizeAccountActivityRows(data);
      activityCache.set(user.id, { rows: next, cachedAt: Date.now() });
      setRows(next);
      setError(null);
    } catch (loadError) {
      setRows(cached?.rows.slice(0, limit) ?? []);
      setError(loadError instanceof Error ? loadError.message : 'Account activity load failed');
    } finally {
      setLoading(false);
    }
  }, [authLoading, limit, user]);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { rows, loading: authLoading || loading, error, reload: () => load(true) };
}

