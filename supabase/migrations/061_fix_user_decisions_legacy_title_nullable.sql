do $$
begin
  if to_regclass('public.user_decisions') is not null then
    alter table public.user_decisions
      alter column title drop not null;

    alter table public.user_decisions
      alter column expected_benefit type text
      using expected_benefit::text;
  end if;
end $$;

notify pgrst, 'reload schema';
