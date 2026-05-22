import { supabase } from '@/integrations/supabase/client';

/* ═══════════════════════════════════════════════════
   Notification domain model + service
   Backed by the `notifications` table (see supabase/migrations).
═══════════════════════════════════════════════════ */

export type NotificationType =
  | 'analysis'
  | 'alert'
  | 'system'
  | 'goal'
  | 'investment'
  | 'expense';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  /** Full content (Markdown / safe HTML) */
  body: string | null;
  /** One-line summary for the list view */
  summary: string | null;
  severity: NotificationSeverity;
  /** Analysis metadata: numbers, percentages, recommendations */
  data: Record<string, unknown> | null;
  read: boolean | null;
  link: string | null;
  related_entity: string | null;
  created_at: string | null;
}

/** Shape produced by any analysis routine that wants to raise a notification. */
export interface AnalysisResult {
  title: string;
  summary: string;
  body: string;
  type?: NotificationType;
  severity?: NotificationSeverity;
  data?: Record<string, unknown>;
  relatedEntity?: string;
  link?: string;
}

export interface ListOptions {
  type?: NotificationType;
  severity?: NotificationSeverity;
  limit?: number;
  /** ISO timestamp cursor — returns rows older than this (keyset pagination) */
  cursor?: string;
}

export interface ListResult {
  items: NotificationRecord[];
  nextCursor: string | null;
}

const SELECT_COLS =
  'id,user_id,type,title,body,summary,severity,data,read,link,related_entity,created_at';

export const NotificationService = {
  /** Turn a finished analysis into a persisted notification. */
  async createFromAnalysis(analysis: AnalysisResult, userId: string): Promise<NotificationRecord | null> {
    if (!userId) return null;
    const row = {
      user_id: userId,
      type: analysis.type ?? ('analysis' as NotificationType),
      title: analysis.title,
      body: analysis.body,
      summary: analysis.summary,
      // keep legacy `message` populated for any older readers
      message: analysis.summary,
      severity: analysis.severity ?? 'info',
      data: analysis.data ?? null,
      related_entity: analysis.relatedEntity ?? null,
      link: analysis.link ?? '/notifications',
      read: false,
    };
    const { data, error } = await supabase
      .from('notifications')
      .insert(row)
      .select(SELECT_COLS)
      .single();
    if (error) {
      console.error('createFromAnalysis failed', error);
      return null;
    }
    return data as NotificationRecord;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      console.error('getUnreadCount failed', error);
      return 0;
    }
    return count ?? 0;
  },

  async list(userId: string, opts: ListOptions = {}): Promise<ListResult> {
    const limit = opts.limit ?? 20;
    let query = supabase
      .from('notifications')
      .select(SELECT_COLS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (opts.type) query = query.eq('type', opts.type);
    if (opts.severity) query = query.eq('severity', opts.severity);
    if (opts.cursor) query = query.lt('created_at', opts.cursor);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as NotificationRecord[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;
    return { items, nextCursor };
  },

  async delete(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) throw error;
  },

  /**
   * Subscribe to live changes for a user's notifications.
   * Returns an unsubscribe function. Falls back silently if realtime is unavailable.
   */
  subscribe(userId: string, onChange: () => void): () => void {
    if (!userId) return () => {};
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
