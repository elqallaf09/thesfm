'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

      const db = supabase as any;
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
      if (cancelled) return;
      setUnreadNotifications(result.error ? 0 : (result.count ?? 0));
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
