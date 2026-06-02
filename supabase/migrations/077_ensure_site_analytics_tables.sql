CREATE TABLE IF NOT EXISTS public.site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  page_path text NOT NULL,
  page_title text,
  section_name text,
  referrer text,
  language text,
  device_type text,
  browser text,
  os text,
  country text,
  city text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  language text,
  device_type text,
  browser text,
  os text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_events
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS section_name text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.site_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.site_events
SET metadata = COALESCE(metadata, '{}'::jsonb);

ALTER TABLE public.site_events
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS site_events_created_at_idx ON public.site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_event_type_idx ON public.site_events (event_type);
CREATE INDEX IF NOT EXISTS site_events_page_path_idx ON public.site_events (page_path);
CREATE INDEX IF NOT EXISTS site_events_section_name_idx ON public.site_events (section_name);
CREATE INDEX IF NOT EXISTS site_events_session_id_idx ON public.site_events (session_id);
CREATE INDEX IF NOT EXISTS site_sessions_session_id_idx ON public.site_sessions (session_id);
CREATE INDEX IF NOT EXISTS site_sessions_last_seen_at_idx ON public.site_sessions (last_seen_at DESC);

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No browser reads site events" ON public.site_events;
CREATE POLICY "No browser reads site events"
  ON public.site_events
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "No browser writes site events" ON public.site_events;
CREATE POLICY "No browser writes site events"
  ON public.site_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No browser reads site sessions" ON public.site_sessions;
CREATE POLICY "No browser reads site sessions"
  ON public.site_sessions
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "No browser writes site sessions" ON public.site_sessions;
CREATE POLICY "No browser writes site sessions"
  ON public.site_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_sessions TO service_role;
