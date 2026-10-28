'use client';

import { useEffect, useState } from 'react';
import { loadSupabaseClient } from '@/integrations/supabase/loadClient';

export function useUnreadNotifications(userId?: string | null) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      if (!userId) {
        setUnreadNotifications(0);
        return;
      }
      if (document.visibilityState === 'hidden') return;

      try {
        const db = await loadSupabaseClient() as any;
        if (cancelled) return;
        let result = await db
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'unread');
        if (result.error) {
          result = await db
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);
        }
        if (!cancelled) setUnreadNotifications(result.error ? 0 : (result.count ?? 0));
      } catch {
        if (!cancelled) setUnreadNotifications(0);
      }
    }

    void loadUnread();
    const intervalId = window.setInterval(loadUnread, 60000);
    document.addEventListener('visibilitychange', loadUnread);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', loadUnread);
    };
  }, [userId]);

  return unreadNotifications;
}
