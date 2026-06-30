'use client';

import { useEffect, useState } from 'react';
import { EMPTY_ADMIN_PERMISSIONS, type AdminPermissions } from '@/lib/adminPermissions';

export type ClientAdminAccess = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: 'admin' | 'super_admin' | null;
  roleId: string | null;
  permissions: AdminPermissions;
};

const DEFAULT_ADMIN_ACCESS: ClientAdminAccess = {
  isAdmin: false,
  isSuperAdmin: false,
  role: null,
  roleId: null,
  permissions: { ...EMPTY_ADMIN_PERMISSIONS },
};

export function useAdminAccess(userId?: string | null) {
  const [access, setAccess] = useState<ClientAdminAccess>(DEFAULT_ADMIN_ACCESS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setAccess(DEFAULT_ADMIN_ACCESS);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!response.ok) {
          if (!cancelled) setAccess(DEFAULT_ADMIN_ACCESS);
          return;
        }
        const payload = await response.json() as Partial<ClientAdminAccess>;
        if (!cancelled) {
          setAccess({
            isAdmin: payload.isAdmin === true,
            isSuperAdmin: payload.isSuperAdmin === true,
            role: payload.role === 'admin' || payload.role === 'super_admin' ? payload.role : null,
            roleId: typeof payload.roleId === 'string' ? payload.roleId : null,
            permissions: { ...EMPTY_ADMIN_PERMISSIONS, ...(payload.permissions ?? {}) },
          });
        }
      } catch {
        if (!cancelled) setAccess(DEFAULT_ADMIN_ACCESS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { access, loading };
}
