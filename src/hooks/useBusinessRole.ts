'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { businessPermissions, type BusinessRole } from '@/lib/businessOperations';

function normalizeRole(value: unknown): BusinessRole {
  return value === 'accountant' || value === 'employee' || value === 'manager' ? value : 'manager';
}

export function useBusinessRole(userId?: string | null) {
  const [role, setRole] = useState<BusinessRole>('manager');
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback(async () => {
    if (!userId) {
      setRole('manager');
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = supabase as any;
    const result = await db.from('business_user_roles').select('role').eq('user_id', userId).maybeSingle();

    if (!result.error && result.data?.role) {
      setRole(normalizeRole(result.data.role));
      setLoading(false);
      return;
    }

    const insertResult = await db
      .from('business_user_roles')
      .insert({ user_id: userId, role: 'manager' })
      .select('role')
      .maybeSingle();

    setRole(normalizeRole(insertResult.data?.role));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  return useMemo(() => ({
    role,
    loading,
    permissions: businessPermissions(role),
    reload: loadRole,
  }), [loadRole, loading, role]);
}
