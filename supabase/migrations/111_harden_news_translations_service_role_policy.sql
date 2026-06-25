-- Harden the news translation cache for the 2026 Supabase explicit-grants model.
-- The table was already intended to be service-role only; this migration removes
-- the deprecated auth.role() policy check and makes the intended grants explicit.

alter table public.news_translations enable row level security;

drop policy if exists "Service role can manage news translations" on public.news_translations;

create policy "Service role can manage news translations"
  on public.news_translations
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.news_translations from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.news_translations to service_role;
