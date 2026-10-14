'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { businessPermissions, type BusinessRole } from '@/lib/businessOperations';

function normalizeRole(value: unknown): BusinessRole {
  return value === 'accountant' || value === 'employee' || value === 'manager' ? value : 'employee';
}

export function useBusinessRole(userId?: string | null) {
  const [role, setRole] = useState<BusinessRole>('employee');
  const [loading, setLoading] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const generation = useRef(0);

  const loadRole = useCallback(async () => {
    const current = ++generation.current;
    setResolvedUserId(null);
    if (!userId) {
      setRole('employee');
      setLoading(false);
      return;
    }

    setLoading(true);
    setRole('employee');
    const db = supabase;
    const result = await db.from('business_user_roles').select('role').eq('user_id', userId).maybeSingle();

    if (generation.current !== current) return;
    if (result.error) { setRole('employee'); setLoading(false); return; }

    if (result.data?.role) {
      setResolvedUserId(userId);
      setRole(normalizeRole(result.data.role));
      setLoading(false);
      return;
    }

    const insertResult = await db
      .from('business_user_roles')
      .insert({ user_id: userId, role: 'manager' })
      .select('role')
      .maybeSingle();

    if (generation.current !== current) return;
    setResolvedUserId(userId);
    setRole(normalizeRole(insertResult.data?.role));
    setLoading(false);
  }, [userId]);

  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => {
    void loadRole();
    return invalidate;
  }, [loadRole, invalidate]);

  return useMemo(() => ({
    role: resolvedUserId === userId ? role : 'employee' as BusinessRole,
    loading,
    permissions: businessPermissions(resolvedUserId === userId ? role : 'employee'),
    reload: loadRole,
  }), [loadRole, loading, role, resolvedUserId, userId]);
}
