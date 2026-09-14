\set ON_ERROR_STOP on
-- Disposable CI database only. No production URL or credential is accepted here.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table public.sharia_financial_values(id uuid primary key default gen_random_uuid());
create table public.sharia_screening_results(id uuid primary key default gen_random_uuid());
create table public.market_symbols(
  id uuid primary key default gen_random_uuid(), symbol text not null, provider_symbol text,
  name text, asset_type text default 'stock', exchange text default 'NASDAQ', country text default 'US',
  is_active boolean not null default true, updated_at timestamptz not null default clock_timestamp(),
  shariah_status text not null default 'unclassified', shariah_reason text, shariah_source text,
  shariah_last_reviewed_at timestamptz, shariah_manual_override boolean not null default false,
  shariah_reviewed_by text, shariah_screening_data jsonb not null default '{}'::jsonb
);
create function public.touch_screening_test_row() returns trigger language plpgsql as $$
begin new.updated_at=clock_timestamp(); return new; end; $$;
create trigger touch_row before update on public.market_symbols for each row execute function public.touch_screening_test_row();
\ir ../../supabase/migrations/20260914090000_shariah_evidence_refresh.sql
begin;
do $$
declare run_a uuid; run_b uuid; row_a public.market_symbols; row_b public.market_symbols; n integer; old_date timestamptz; patch jsonb;
begin
  insert into public.market_symbols(symbol,name) values ('TEST_A','Synthetic A'),('TEST_B','Synthetic B');
  insert into public.market_symbols(symbol,name,shariah_manual_override) values ('TEST_MANUAL','Manual',true);
  insert into public.market_symbols(symbol,name,asset_type) values ('TEST_ETF','Synthetic fund','etf');
  insert into public.market_symbols(symbol,name) values ('TEST_MISLABELLED_FUND','Synthetic ETF');
  insert into public.shariah_refresh_runs default values returning id into run_a;
  insert into public.shariah_refresh_runs default values returning id into run_b;
  select count(*) into n from public.claim_shariah_refresh_batch(run_a,10);
  assert n=2, 'claim must skip manual reviews and funds before applying limit';
  select count(*) into n from public.claim_shariah_refresh_batch(run_a,10,true);
  assert n=0, 'same run must never reclaim its own rows';
  select count(*) into n from public.claim_shariah_refresh_batch(run_b,10,true);
  assert n=0, 'another worker must not take live leases';
  select * into row_a from public.market_symbols where symbol='TEST_A';
  select * into row_b from public.market_symbols where symbol='TEST_B';
  patch=jsonb_build_object('shariah_status','compliant','shariah_reason','Synthetic test only','shariah_source','Synthetic',
    'shariah_last_reviewed_at',clock_timestamp(),'shariah_reviewed_by','test', 'shariah_screening_data',jsonb_build_object('evidenceVersion','sfm-evidence-v2'));
  n=public.finish_shariah_refresh(run_a,row_a.id,row_a.updated_at,patch,null);
  assert n=1, 'first persisted update must affect exactly one row';
  n=public.finish_shariah_refresh(run_a,row_a.id,row_a.updated_at,patch,null);
  assert n=0, 'replayed update must not count as success';
  update public.market_symbols set shariah_manual_override=true,shariah_status='needs_review' where id=row_b.id;
  n=public.finish_shariah_refresh(run_a,row_b.id,row_b.updated_at,patch,null);
  assert n=0, 'manual override must win a concurrent update';
  select shariah_last_reviewed_at into old_date from public.market_symbols where id=row_a.id;
  perform public.claim_shariah_refresh_batch(run_b,1,true,row_a.id);
  select * into row_a from public.market_symbols where id=row_a.id;
  n=public.finish_shariah_refresh(run_b,row_a.id,row_a.updated_at,null,'provider_unavailable');
  assert n=1;
  assert exists(select 1 from public.market_symbols where id=row_a.id and shariah_status='compliant'
    and shariah_last_reviewed_at=old_date and shariah_refresh_error='provider_unavailable'), 'failed fetch must not refresh old evidence';
  assert not has_function_privilege('anon','public.claim_shariah_refresh_batch(uuid,integer,boolean,uuid)','execute');
  assert not has_function_privilege('authenticated','public.finish_shariah_refresh(uuid,uuid,timestamp with time zone,jsonb,text)','execute');
  assert not has_table_privilege('anon','public.shariah_refresh_runs','select');
  raise notice 'PASS: real PostgreSQL claims, leases, persistence, replay, manual race, failed refresh, and privileges';
end $$;
rollback;
