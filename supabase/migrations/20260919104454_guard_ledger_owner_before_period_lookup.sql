-- Check browser ownership before consulting private period metadata.
create or replace function sfm_private.guard_closed_month() returns trigger
language plpgsql security definer set search_path = '' as $$
declare old_row jsonb; new_row jsonb; item jsonb; owner_id uuid; item_date date;
begin
  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;
  -- Lock owners in a stable order, including both sides of a reassignment.
  for owner_id in select distinct (r->>'user_id')::uuid from unnest(array[old_row,new_row]) r
    where r is not null order by 1 loop
    -- SECURITY DEFINER changes current_user, but PostgREST's SET LOCAL ROLE
    -- remains available here. Service-role jobs still pass through period locks.
    if current_setting('role', true) in ('anon','authenticated')
      and (auth.uid() is null or owner_id is distinct from auth.uid()) then
      raise exception 'LEDGER_ACCESS_DENIED' using errcode = '42501';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 914));
  end loop;
  foreach item in array array[old_row,new_row] loop
    if item is null then continue; end if;
    -- Auth account deletion cascades after the parent row is gone. Only that
    -- cascade may bypass a closed period; ordinary ledger deletes stay locked.
    if tg_op = 'DELETE' and not exists (
      select 1 from auth.users where id = (item->>'user_id')::uuid
    ) then continue; end if;
    item_date := sfm_private.ledger_date(tg_table_name, item);
    if exists(select 1 from public.finance_month_closes c
      where c.user_id = (item->>'user_id')::uuid and c.month = date_trunc('month', item_date)::date) then
      raise exception 'MONTH_CLOSED' using errcode = '23514';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function sfm_private.guard_closed_month() from public,anon,authenticated;
