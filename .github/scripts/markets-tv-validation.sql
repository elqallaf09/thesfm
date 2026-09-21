-- Disposable CI database only. Every fixture is rolled back.
begin;
do $$ begin
  if current_setting('sfm.disposable_ci', true) is distinct from '1' then
    raise exception 'A disposable CI database is required';
  end if;
end $$;
alter role service_role bypassrls;
grant usage on schema public to service_role;
insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
set local role service_role;
do $$
declare device_id uuid; affected integer; rejected boolean := false;
begin
  -- Compile/execute the actual owner-filtered column projections as the API
  -- role. Testing device-table permissions alone misses source read failures.
  perform symbol from public.market_watchlist
    where user_id='11111111-1111-4111-8111-111111111111' order by created_at desc limit 50;
  perform id,symbol,alert_type,threshold,currency,status from public.market_price_alerts
    where user_id='11111111-1111-4111-8111-111111111111' and status in ('saved','active') limit 50;
  device_id := public.create_markets_tv_pair('CI TV', repeat('a',64), repeat('b',64), repeat('c',64));
  update public.markets_tv_devices set user_id='11111111-1111-4111-8111-111111111111', state='approved', code_hash=null
    where id=device_id and code_hash=repeat('b',64) and state='pending' and user_id is null and expires_at>now();
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Approval failed'; end if;
  update public.markets_tv_devices set user_id='22222222-2222-4222-8222-222222222222'
    where code_hash=repeat('b',64) and state='pending';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Approval replay succeeded'; end if;
  update public.markets_tv_devices set state='active', secret_hash=repeat('d',64)
    where id=device_id and secret_hash=repeat('a',64) and state='approved' and expires_at>now();
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Claim failed'; end if;
  if exists(select 1 from public.markets_tv_devices where secret_hash=repeat('a',64)) then raise exception 'Poll credential survived claim'; end if;
  update public.markets_tv_devices set state='revoked' where id=device_id and user_id='22222222-2222-4222-8222-222222222222';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Wrong owner revoked a device'; end if;
  for i in 1..7 loop
    perform public.create_markets_tv_pair('CI TV', lpad(i::text,64,'e'), lpad(i::text,64,'f'), repeat('c',64));
  end loop;
  begin
    perform public.create_markets_tv_pair('CI TV',repeat('1',64),repeat('2',64),repeat('c',64));
  exception when others then
    if sqlerrm <> 'TV_PAIR_RATE_LIMIT' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Durable rate limit was bypassed'; end if;
  update public.markets_tv_devices set expires_at=now()-interval '1 second' where id=device_id;
  if exists(select 1 from public.markets_tv_devices where secret_hash=repeat('d',64) and state='active' and expires_at>now()) then raise exception 'Expired token accepted'; end if;
  update public.markets_tv_devices set state='revoked' where id=device_id and user_id='11111111-1111-4111-8111-111111111111';
  if exists(select 1 from public.markets_tv_devices where secret_hash=repeat('d',64) and state='active') then raise exception 'Revoked device accepted'; end if;
end $$;
reset role;
do $$ begin
  if not (select relrowsecurity from pg_class where oid='public.markets_tv_devices'::regclass) then raise exception 'RLS missing'; end if;
  if has_table_privilege('anon','public.markets_tv_devices','SELECT') or has_table_privilege('authenticated','public.markets_tv_devices','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Client table access leaked'; end if;
  if has_function_privilege('anon','public.create_markets_tv_pair(text,text,text,text)','EXECUTE') or has_function_privilege('authenticated','public.create_markets_tv_pair(text,text,text,text)','EXECUTE') then raise exception 'Client RPC access leaked'; end if;
end $$;
rollback;
