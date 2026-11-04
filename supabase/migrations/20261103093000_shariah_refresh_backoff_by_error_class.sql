-- Shariah refresh: back off by error class instead of retrying everything hourly.
--
-- `finish_shariah_refresh` previously scheduled EVERY failure one hour out:
--     shariah_next_refresh_at = clock_timestamp() + case when p_error is null
--       then interval '24 hours' else interval '1 hour' end
--
-- That treats a transient provider timeout and a permanently unreadable filing
-- the same way. A symbol whose official statement layout cannot be parsed
-- (`official_regional_statement_layout_unsupported`) is therefore re-claimed
-- every single hour, forever. Because the hourly cron often claims that one
-- symbol alone, the run ends with scanned=1 / updated=0 and is logged as a
-- whole-run `failed` -- which is how KFH turned one unreadable PDF into 58
-- "failed" refresh runs in seven days and buried the real cadence signal.
--
-- Only genuinely retryable transport failures keep the one-hour retry. Evidence
-- and parser gaps need a code or document fix, not a retry, so they wait a day
-- like a successful screen does. Nothing about Shariah classification itself
-- changes here: this function still never writes a status when p_error is set.

create or replace function public.finish_shariah_refresh(p_run_id uuid, p_symbol_id uuid, p_expected_updated_at timestamptz, p_patch jsonb default null, p_error text default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
  retry_after interval;
begin
  if p_error is null and (p_patch is null or p_patch #>> '{shariah_screening_data,evidenceVersion}' is distinct from 'sfm-evidence-v2'
    or coalesce(p_patch->>'shariah_status','') not in ('compliant','non_compliant','needs_review')) then
    raise exception 'INVALID_SCREENING_PATCH';
  end if;

  -- Transport-level failures are worth retrying soon; infrastructure failures
  -- (claim/persistence) likewise. Everything else -- unsupported statement
  -- layouts, issuer mismatches, undiscovered documents, PDF size/page/text
  -- limits, conflicting values, missing official evidence -- is a standing gap
  -- that an hourly retry cannot resolve.
  retry_after := case
    when p_error is null then interval '24 hours'
    when p_error ~ '(timed_out|rate_limited|dns_failed|fetch_failed)' then interval '1 hour'
    when p_error ~ '^refresh_(persistence_failed|database_or_claim_failed|run_log_write_failed)$' then interval '1 hour'
    else interval '24 hours'
  end;

  update public.market_symbols m set
    shariah_status=case when p_error is null then p_patch->>'shariah_status' else m.shariah_status end,
    shariah_reason=case when p_error is null then p_patch->>'shariah_reason' else m.shariah_reason end,
    shariah_source=case when p_error is null then p_patch->>'shariah_source' else m.shariah_source end,
    shariah_last_reviewed_at=case when p_error is null then (p_patch->>'shariah_last_reviewed_at')::timestamptz else m.shariah_last_reviewed_at end,
    shariah_reviewed_by=case when p_error is null then p_patch->>'shariah_reviewed_by' else m.shariah_reviewed_by end,
    shariah_screening_data=case when p_error is null then p_patch->'shariah_screening_data' else m.shariah_screening_data end,
    shariah_refresh_error=left(p_error,250), shariah_lease_until=null,
    shariah_next_refresh_at=clock_timestamp()+retry_after,
    updated_at=clock_timestamp()
  where m.id=p_symbol_id and m.shariah_refresh_run_id=p_run_id and not m.shariah_manual_override
    and m.updated_at=p_expected_updated_at and m.shariah_lease_until>clock_timestamp();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.finish_shariah_refresh(uuid,uuid,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_shariah_refresh(uuid,uuid,timestamptz,jsonb,text) to service_role;
