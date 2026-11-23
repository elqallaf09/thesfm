-- Shariah refresh: reap runs abandoned mid-flight instead of leaving them 'running' forever.
--
-- refreshSfmShariahClassifications inserts a run row, works, then writes the
-- final status in a trailing update. When the serverless invocation is killed
-- between those two writes (deploy, instance recycle, hard timeout), the row
-- keeps status='running' with a null finished_at for good. One such row had sat
-- since 2026-11-21 13:23 UTC.
--
-- Nothing is blocked by it: claim_shariah_refresh_batch leases symbols for 90
-- seconds, so an abandoned run holds no symbol. But every cadence and alert
-- query filters on finished_at or on a terminal status, so the row is silently
-- excluded and the run ledger under-reports both throughput and genuine
-- infrastructure failures.
--
-- The threshold sits far outside any legitimate run -- the cron budget is 45s,
-- the interactive budget 22s and the symbol lease 90s -- so a row still
-- 'running' after ten minutes cannot be in flight. An abandoned run is a real
-- execution failure, so it is recorded as 'failed' and becomes visible to
-- repeated_shariah_failed_runs rather than staying hidden. Shariah
-- classification is untouched: this writes only to the run ledger, never to
-- market_symbols, and never produces or clears a compliance verdict.

create or replace function public.reap_abandoned_shariah_refresh_runs(p_older_than interval default interval '10 minutes')
returns integer
language plpgsql security definer set search_path = '' as $$
declare reaped integer;
begin
  -- A short threshold could close a run that is still working.
  if p_older_than is null or p_older_than < interval '5 minutes' then
    raise exception 'ABANDONED_RUN_THRESHOLD_TOO_SHORT';
  end if;
  update public.shariah_refresh_runs set
    status = 'failed',
    finished_at = clock_timestamp(),
    result = result || jsonb_build_object(
      'ok', false, 'fatal', true, 'status', 'failed', 'reapedAt', clock_timestamp(),
      'failed', jsonb_build_array(jsonb_build_object('symbol', 'refresh', 'reason', 'refresh_run_abandoned')))
  where status = 'running' and started_at < clock_timestamp() - p_older_than;
  get diagnostics reaped = row_count;
  return reaped;
end;
$$;

revoke all on function public.reap_abandoned_shariah_refresh_runs(interval) from public, anon, authenticated;
grant execute on function public.reap_abandoned_shariah_refresh_runs(interval) to service_role;

-- Its own five-minute job, so it stays independent of the observability alert
-- sweep and can be rescheduled or dropped on its own.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('sfm-shariah-reap-abandoned-runs')
      where exists (select 1 from cron.job where jobname = 'sfm-shariah-reap-abandoned-runs');
    perform cron.schedule('sfm-shariah-reap-abandoned-runs', '*/5 * * * *',
      'select public.reap_abandoned_shariah_refresh_runs()');
  end if;
end $$;
