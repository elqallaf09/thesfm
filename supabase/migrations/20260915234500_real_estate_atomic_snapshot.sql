-- Append-only hardening for the property analyst release.
-- A snapshot and all of its evidence links commit or roll back together.
begin;

alter table public.investment_valuation_snapshots
  add column if not exists subject_asset jsonb not null default '{}'::jsonb;

-- Personal reads still use the existing owner RLS policies. Verified evidence
-- and historical outputs are not writable directly by a browser client.
revoke insert, update, delete on public.investment_valuation_evidence from anon, authenticated;
revoke insert, update, delete on public.investment_valuation_snapshots from anon, authenticated;
revoke insert, update, delete on public.investment_snapshot_evidence from anon, authenticated;
grant select, insert on public.investment_valuation_evidence, public.investment_valuation_snapshots, public.investment_snapshot_evidence to service_role;

create or replace function public.persist_investment_valuation_snapshot(
  p_user_id uuid,
  p_position_id uuid,
  p_valuation jsonb,
  p_evidence jsonb,
  p_subject_asset jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  snapshot_id_value uuid := gen_random_uuid();
  evidence_id_value uuid;
  item jsonb;
  evidence_total integer;
  official_total integer;
  freshest_observed_at timestamptz;
  preserved_limitations jsonb;
begin
  if jsonb_typeof(p_valuation) is distinct from 'object'
     or p_valuation->>'status' is distinct from 'VALUED'
     or jsonb_typeof(p_valuation->'evidenceIds') is distinct from 'array'
     or jsonb_typeof(p_evidence) is distinct from 'array'
     or jsonb_typeof(p_subject_asset) is distinct from 'object' then
    raise exception 'Invalid valuation payload' using errcode = '22023';
  end if;
  evidence_total := jsonb_array_length(p_evidence);
  if evidence_total < 2 or evidence_total > 500
     or jsonb_array_length(p_valuation->'evidenceIds') <> evidence_total then
    raise exception 'Incomplete valuation evidence' using errcode = '22023';
  end if;
  if (select count(distinct e->>'id') from jsonb_array_elements(p_evidence) e) <> evidence_total
     or (select count(distinct id) from jsonb_array_elements_text(p_valuation->'evidenceIds') id) <> evidence_total
     or exists (
       select 1 from jsonb_array_elements_text(p_valuation->'evidenceIds') expected(id)
       where not exists (select 1 from jsonb_array_elements(p_evidence) e where e->>'id' = expected.id)
     ) then
    raise exception 'Invalid evidence lineage' using errcode = '22023';
  end if;
  if jsonb_typeof(p_valuation->'lowValue') is distinct from 'number'
     or jsonb_typeof(p_valuation->'midpointValue') is distinct from 'number'
     or jsonb_typeof(p_valuation->'highValue') is distinct from 'number'
     or coalesce(p_valuation->>'currency', '') !~ '^[A-Z]{3}$'
     or coalesce(p_valuation->>'confidence', '') not in ('HIGH', 'MEDIUM', 'LOW')
     or nullif(btrim(p_valuation->>'methodologyVersion'), '') is null then
    raise exception 'Invalid valuation result' using errcode = '22023';
  end if;
  if (p_valuation->>'lowValue')::numeric <= 0
     or (p_valuation->>'lowValue')::numeric > (p_valuation->>'midpointValue')::numeric
     or (p_valuation->>'midpointValue')::numeric > (p_valuation->>'highValue')::numeric then
    raise exception 'Invalid valuation range' using errcode = '22023';
  end if;

  -- Recheck ownership inside the same transaction, not only in the HTTP route.
  perform 1 from public.investment_positions p
    where p.id = p_position_id and p.user_id = p_user_id
      and p.asset_type = 'REAL_ESTATE' and p.migration_state = 'VERIFIED'
    for share;
  if not found then
    raise exception 'Owned verified property required' using errcode = '42501';
  end if;

  select count(*) filter (where e->>'authority' in ('GOVERNMENT', 'REGULATOR', 'EXCHANGE', 'OFFICIAL_STATISTICS')),
         max(nullif(e->>'observedOn', '')::date)::timestamptz,
         coalesce(jsonb_agg(e->>'limitations') filter (where nullif(btrim(e->>'limitations'), '') is not null), '[]'::jsonb)
    into official_total, freshest_observed_at, preserved_limitations
    from jsonb_array_elements(p_evidence) e;

  insert into public.investment_valuation_snapshots (
    id, user_id, position_id, valuation_kind, currency,
    low_value, midpoint_value, high_value, confidence_level,
    confidence_reasons, evidence_count, official_evidence_count,
    freshest_evidence_at, methodology_version, limitations, subject_asset
  ) values (
    snapshot_id_value, p_user_id, p_position_id, 'EVIDENCE_RANGE', p_valuation->>'currency',
    (p_valuation->>'lowValue')::numeric, (p_valuation->>'midpointValue')::numeric, (p_valuation->>'highValue')::numeric,
    p_valuation->>'confidence', coalesce(p_valuation->'reasons', '[]'::jsonb), evidence_total, official_total,
    freshest_observed_at, p_valuation->>'methodologyVersion', preserved_limitations, p_subject_asset
  );

  for item in select value from jsonb_array_elements(p_evidence) loop
    if nullif(btrim(item->>'sourceName'), '') is null then
      raise exception 'Evidence source is required' using errcode = '22023';
    end if;
    insert into public.investment_valuation_evidence (
      user_id, position_id, evidence_type, source_name, source_url,
      source_authority, source_record_identifier, observed_on, retrieved_at,
      asset_match_quality, geography_match_quality, value_amount,
      value_currency, unit_value, unit_code, raw_evidence, limitations
    ) values (
      p_user_id, p_position_id, item->>'type', item->>'sourceName', item->>'sourceUrl',
      item->>'authority', item->>'id', nullif(item->>'observedOn', '')::date, (item->>'retrievedAt')::timestamptz,
      item->>'assetMatch', item->>'geographyMatch', (item->>'amount')::numeric,
      item->>'currency', (item->>'unitValue')::numeric, item->>'unitCode', item, item->>'limitations'
    ) returning id into evidence_id_value;
    insert into public.investment_snapshot_evidence (snapshot_id, evidence_id, user_id, inclusion_reason)
      values (snapshot_id_value, evidence_id_value, p_user_id, 'Server-authored evidence used by the valuation engine.');
  end loop;
  return jsonb_build_object('snapshotId', snapshot_id_value, 'evidenceCount', evidence_total);
end;
$$;

revoke all on function public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb) to service_role;
comment on function public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb) is 'Server-only atomic write of an owned verified property valuation and exact evidence lineage. Browser payloads are not evidence authority.';

commit;
