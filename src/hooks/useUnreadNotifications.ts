'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/lib/notifications';

/**
 * Live unread-notification count for the current user.
 * Uses Supabase realtime; also refreshes on a 30s interval as a safety net.
 */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }
    setCount(await NotificationService.getUnreadCount(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }
    refresh();
    const unsubscribe = NotificationService.subscribe(user.id, refresh);
    const interval = setInterval(refresh, 30_000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, refresh]);

  return { count, refresh };
}
