begin;

-- The trigger is intentionally SECURITY INVOKER (the PostgreSQL default). Pin its
-- search_path so future objects in caller-controlled schemas cannot shadow names used
-- by the function body.
alter function public.track_economic_intelligence_notification_outcome()
  set search_path = pg_catalog, public;

commit;
