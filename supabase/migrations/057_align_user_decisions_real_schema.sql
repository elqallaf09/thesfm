do $$
begin
  if to_regclass('public.user_decisions') is not null then
    alter table public.user_decisions
      alter column expected_benefit type text
      using expected_benefit::text;
  end if;
end $$;

alter table public.user_decisions enable row level security;

drop policy if exists "Users can view own decisions" on public.user_decisions;
drop policy if exists "Users can insert own decisions" on public.user_decisions;
drop policy if exists "Users can update own decisions" on public.user_decisions;
drop policy if exists "Users can delete own decisions" on public.user_decisions;
drop policy if exists "Users can select own decisions" on public.user_decisions;

create policy "Users can view own decisions"
on public.user_decisions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own decisions"
on public.user_decisions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own decisions"
on public.user_decisions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own decisions"
on public.user_decisions
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
