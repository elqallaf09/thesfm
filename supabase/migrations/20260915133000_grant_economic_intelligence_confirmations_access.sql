begin;

-- Real local Auth/PostgREST verification found that the existing RLS policies
-- were present but authenticated sessions lacked table privileges (42501).
-- Table privileges and row ownership are separate gates. Grant only CRUD;
-- retain every existing auth.uid() ownership policy and never grant TRUNCATE.
grant select, insert, update, delete
  on table public.economic_intelligence_confirmations
  to authenticated;

commit;
