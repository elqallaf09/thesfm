CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  total_budget numeric NOT NULL,
  duration_days integer NOT NULL,
  platforms jsonb NOT NULL,
  industry text,
  estimated_reach integer,
  estimated_clicks integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own campaigns" ON ad_campaigns;
CREATE POLICY "Users manage own campaigns"
  ON ad_campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
