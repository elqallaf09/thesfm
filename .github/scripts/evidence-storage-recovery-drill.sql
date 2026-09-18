-- This destructive drill is valid only in the named disposable CI database.
-- The forward production migration itself never drops tables or user rows.
begin;
do $guard$
begin
  if current_database() <> 'sfm_property_isolation_ci'
     or current_setting('sfm.disposable_ci', true) is distinct from '1' then
    raise exception 'Recovery drill requires the disposable CI database';
  end if;
  if exists (select 1 from public.investment_valuation_evidence)
     or exists (select 1 from public.investment_valuation_snapshots)
     or exists (select 1 from public.investment_snapshot_evidence)
     or exists (select 1 from public.sfm_market_observations) then
    raise exception 'Recovery drill requires empty evidence storage';
  end if;
end;
$guard$;
drop function public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb);
drop table public.investment_snapshot_evidence;
drop table public.investment_valuation_snapshots;
drop table public.investment_valuation_evidence;
drop table public.sfm_market_observations;
commit;
