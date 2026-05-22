-- Extend notifications for the analysis-notification system (additive, non-breaking)

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity text;

-- Speeds up the unread badge count and per-type filtering
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_user_type_idx ON notifications (user_id, type);

-- Enable realtime so the sidebar unread badge updates live.
-- Guarded so re-running the migration does not error if already published.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- supabase_realtime publication not present in this environment; skip
    NULL;
END $$;
