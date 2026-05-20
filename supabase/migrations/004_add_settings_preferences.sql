ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS charity_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dashboard_prefs jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}';
