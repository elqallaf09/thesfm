-- Real database regression tests, not mocked query builders.
-- Synthetic records exist only in this disposable CI transaction.
-- Never run on a linked Supabase Preview/Production project.
\set ON_ERROR_STOP on

begin;
set local timezone = 'UTC';
set local row_security = on;

do $$
begin
  if current_database() <> 'sfm_property_isolation_ci'
     or current_setting('sfm.disposable_ci', true) is distinct from '1'
     or current_user <> 'postgres' then
    raise exception 'Disposable property CI database required';
  end if;
end;
$$;

create temporary table property_fixture (
  owner_id uuid primary key,
  position_id uuid not null,
  subject jsonb not null,
  valuation jsonb not null,
  evidence jsonb not null
);

create function pg_temp.check_true(ok boolean, label text) returns void
language plpgsql security invoker as $$
begin
  if ok is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

create function pg_temp.reject_snapshot(
  label text, expected_state text, owner_id uuid, position_id uuid,
  valuation jsonb, evidence jsonb, subject jsonb
) returns void language plpgsql security invoker as $$
declare observed_state text;
begin
  begin
    perform public.persist_investment_valuation_snapshot(owner_id, position_id, valuation, evidence, subject);
  exception when others then
    get stacked diagnostics observed_state = returned_sqlstate;
  end;
  perform pg_temp.check_true(observed_state = expected_state,
    format('%s (expected SQLSTATE %s, received %s)', label, expected_state, coalesce(observed_state, 'no error')));
end;
$$;

-- GRANT requires the concrete session schema; pg_temp is a relation/function
-- lookup alias, not a catalog schema name accepted by GRANT ON SCHEMA.
-- Only test helpers receive these privileges; application ACLs stay untouched.
do $$
declare temporary_schema text;
begin
  select nspname into strict temporary_schema from pg_namespace where oid = pg_my_temp_schema();
  execute format('grant usage on schema %I to anon, authenticated, service_role', temporary_schema);
  execute format('grant execute on all functions in schema %I to anon, authenticated, service_role', temporary_schema);
end;
$$;
grant select on property_fixture to anon, authenticated, service_role;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'property-ci-a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'property-ci-b@example.invalid');

insert into public.investment_positions (id, user_id, asset_type, migration_state) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'REAL_ESTATE', 'VERIFIED'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'REAL_ESTATE', 'VERIFIED'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'REAL_ESTATE', 'PENDING_VERIFICATION'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111', 'STOCK', 'VERIFIED');

insert into property_fixture (owner_id, position_id, subject, valuation, evidence)
select owner_id::uuid, position_id::uuid,
  '{"countryCode":"KW","city":"CI fixture only","propertyType":"LAND","landArea":100,"landAreaUnit":"M2"}'::jsonb,
  jsonb_build_object(
    'status', 'VALUED', 'currency', 'KWD', 'lowValue', 9000, 'midpointValue', 10000, 'highValue', 11000,
    'confidence', 'LOW', 'reasons', jsonb_build_array('Synthetic database test only'),
    'methodologyVersion', 'ci-fixture', 'evidenceIds', jsonb_build_array(prefix || '-1', prefix || '-2')
  ),
  jsonb_build_array(
    jsonb_build_object(
      'id', prefix || '-1', 'type', 'OFFICIAL_TRANSACTION', 'authority', 'GOVERNMENT',
      'sourceName', 'Synthetic registry fixture', 'sourceUrl', 'https://example.invalid/ci/registry',
      'observedOn', '2026-08-01', 'retrievedAt', '2026-09-16T00:00:00Z',
      'assetMatch', 'EXACT', 'geographyMatch', 'EXACT', 'currency', 'KWD', 'unitValue', 90, 'unitCode', 'M2'
    ),
    jsonb_build_object(
      'id', prefix || '-2', 'type', 'MARKET_TRANSACTION', 'authority', 'ESTABLISHED_DATA_PROVIDER',
      'sourceName', 'Synthetic market fixture', 'sourceUrl', 'https://example.invalid/ci/market',
      'observedOn', '2026-08-02', 'retrievedAt', '2026-09-16T00:00:00Z',
      'assetMatch', 'STRONG', 'geographyMatch', 'STRONG', 'currency', 'KWD', 'unitValue', 110, 'unitCode', 'M2',
      'limitations', 'Synthetic comparison limitation'
    )
  )
from (values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ci-a'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ci-b')
) seed(owner_id, position_id, prefix);

-- Check exposure without granting anything after the migrations under test.
do $$
declare table_name text; function_name text := 'public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb)';
begin
  foreach table_name in array array['investment_valuation_evidence', 'investment_valuation_snapshots', 'investment_snapshot_evidence'] loop
    perform pg_temp.check_true((select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass), table_name || ': RLS enabled');
    perform pg_temp.check_true(has_table_privilege('authenticated', 'public.' || table_name, 'SELECT'), table_name || ': owner reads explicitly granted');
    perform pg_temp.check_true(not has_table_privilege('authenticated', 'public.' || table_name, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), table_name || ': browser write privileges absent');
    perform pg_temp.check_true(not has_table_privilege('anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), table_name || ': anonymous exposure absent');
  end loop;
  perform pg_temp.check_true(not has_function_privilege('anon', function_name, 'EXECUTE'), 'anonymous RPC execution denied');
  perform pg_temp.check_true(not has_function_privilege('authenticated', function_name, 'EXECUTE'), 'browser RPC execution denied');
  perform pg_temp.check_true(has_function_privilege('service_role', function_name, 'EXECUTE'), 'server RPC execution granted');
  perform pg_temp.check_true(not (select prosecdef from pg_proc where oid = function_name::regprocedure), 'RPC is security invoker');
end;
$$;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare f record; saved jsonb; saved_snapshot_id uuid;
begin
  perform pg_temp.check_true(current_user = 'service_role' and not (select rolsuper from pg_roles where rolname = current_user), 'RPC runs as actual non-superuser service role');
  for f in select * from pg_temp.property_fixture order by owner_id loop
    saved := public.persist_investment_valuation_snapshot(f.owner_id, f.position_id, f.valuation, f.evidence, f.subject);
    saved_snapshot_id := (saved->>'snapshotId')::uuid;
    perform pg_temp.check_true((saved->>'evidenceCount')::int = 2 and saved_snapshot_id is not null, 'server save returns snapshot identity and evidence count');
    perform pg_temp.check_true((select count(*) = 1 from public.investment_valuation_snapshots s where s.id = saved_snapshot_id and s.user_id = f.owner_id and s.position_id = f.position_id
      and s.low_value = 9000 and s.midpoint_value = 10000 and s.high_value = 11000
      and s.subject_asset = f.subject and s.confidence_level = 'LOW' and s.methodology_version = 'ci-fixture'
      and s.evidence_count = 2 and s.official_evidence_count = 1
      and s.freshest_evidence_at = '2026-08-02T00:00:00Z'::timestamptz
      and s.limitations = '["Synthetic comparison limitation"]'::jsonb), 'saved snapshot preserves subject, range, provenance, observation date and limitations');
    perform pg_temp.check_true((select count(*) = 2 from public.investment_snapshot_evidence l
      join public.investment_valuation_evidence e on e.id = l.evidence_id
      where l.snapshot_id = saved_snapshot_id and l.user_id = f.owner_id and e.user_id = f.owner_id and e.position_id = f.position_id), 'both lineage links belong to the same owner and subject');
    perform pg_temp.check_true((select jsonb_agg(e.raw_evidence order by e.source_record_identifier) = f.evidence
      from public.investment_snapshot_evidence l join public.investment_valuation_evidence e on e.id = l.evidence_id
      where l.snapshot_id = saved_snapshot_id), 'exact raw evidence survives persistence');
  end loop;
end;
$$;

-- Rejections include a late failure AFTER a snapshot, an evidence row and a
-- lineage row have been inserted. Catching only the expected SQLSTATE cannot
-- silently accept a permission or schema failure in place of the intended test.
do $$
declare f record; snapshot_count bigint; evidence_count bigint; link_count bigint;
begin
  select * into strict f from pg_temp.property_fixture where owner_id = '11111111-1111-4111-8111-111111111111';
  select count(*) into snapshot_count from public.investment_valuation_snapshots;
  select count(*) into evidence_count from public.investment_valuation_evidence;
  select count(*) into link_count from public.investment_snapshot_evidence;
  perform pg_temp.reject_snapshot('cross-owner RPC mismatch rejected', '42501', f.owner_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', f.valuation, f.evidence, f.subject);
  perform pg_temp.reject_snapshot('unverified property rejected', '42501', f.owner_id, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', f.valuation, f.evidence, f.subject);
  perform pg_temp.reject_snapshot('non-property position rejected', '42501', f.owner_id, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', f.valuation, f.evidence, f.subject);
  perform pg_temp.reject_snapshot('missing property rejected', '42501', f.owner_id, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', f.valuation, f.evidence, f.subject);
  perform pg_temp.reject_snapshot('unavailable valuation rejected', '22023', f.owner_id, f.position_id, jsonb_set(f.valuation, '{status}', '"INSUFFICIENT_EVIDENCE"'), f.evidence, f.subject);
  perform pg_temp.reject_snapshot('invalid range rejected', '22023', f.owner_id, f.position_id, jsonb_set(f.valuation, '{highValue}', '1'), f.evidence, f.subject);
  perform pg_temp.reject_snapshot('duplicate evidence rejected', '22023', f.owner_id, f.position_id, f.valuation, jsonb_build_array(f.evidence->0, f.evidence->0), f.subject);
  perform pg_temp.reject_snapshot('unmatched evidence lineage rejected', '22023', f.owner_id, f.position_id, jsonb_set(f.valuation, '{evidenceIds,1}', '"not-in-evidence"'), f.evidence, f.subject);
  perform pg_temp.reject_snapshot('late missing source rolls back all three writes', '22023', f.owner_id, f.position_id, f.valuation, jsonb_set(f.evidence, '{1,sourceName}', '""'), f.subject);
  perform pg_temp.reject_snapshot('late unsafe source URL rolls back all three writes', '23514', f.owner_id, f.position_id, f.valuation, jsonb_set(f.evidence, '{1,sourceUrl}', '"javascript:alert(1)"'), f.subject);
  perform pg_temp.check_true((select count(*) = snapshot_count from public.investment_valuation_snapshots), 'failed RPCs leave no orphan snapshot');
  perform pg_temp.check_true((select count(*) = evidence_count from public.investment_valuation_evidence), 'failed RPCs leave no orphan evidence');
  perform pg_temp.check_true((select count(*) = link_count from public.investment_snapshot_evidence), 'failed RPCs leave no orphan lineage');
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}', true);

do $$
declare table_name text; f record;
begin
  perform pg_temp.check_true(auth.uid() = '11111111-1111-4111-8111-111111111111'::uuid and current_user = 'authenticated'
    and not (select rolbypassrls or rolsuper from pg_roles where rolname = current_user), 'user A claims resolved under non-bypass authenticated role');
  perform pg_temp.check_true((select count(*) = 1 from public.investment_valuation_snapshots), 'A sees only A snapshot');
  perform pg_temp.check_true((select count(*) = 2 from public.investment_valuation_evidence), 'A sees only A evidence');
  perform pg_temp.check_true((select count(*) = 2 from public.investment_snapshot_evidence), 'A sees only A lineage');
  perform pg_temp.check_true(not exists (select 1 from public.investment_valuation_snapshots where user_id <> auth.uid()), 'A cannot read B snapshot by owner filter');
  foreach table_name in array array['investment_valuation_evidence', 'investment_valuation_snapshots', 'investment_snapshot_evidence'] loop
    begin
      execute format('insert into public.%I default values', table_name);
      raise exception 'Browser INSERT unexpectedly allowed on %', table_name;
    exception when insufficient_privilege then raise notice 'PASS: browser INSERT denied on %', table_name;
    end;
    begin
      execute format('update public.%I set user_id = user_id where false', table_name);
      raise exception 'Browser UPDATE unexpectedly allowed on %', table_name;
    exception when insufficient_privilege then raise notice 'PASS: browser UPDATE denied on %', table_name;
    end;
    begin
      execute format('delete from public.%I where false', table_name);
      raise exception 'Browser DELETE unexpectedly allowed on %', table_name;
    exception when insufficient_privilege then raise notice 'PASS: browser DELETE denied on %', table_name;
    end;
  end loop;
  select * into strict f from pg_temp.property_fixture where owner_id = auth.uid();
  perform pg_temp.reject_snapshot('authenticated direct RPC rejected even for owned property', '42501', f.owner_id, f.position_id, f.valuation, f.evidence, f.subject);
end;
$$;

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}', true);
do $$
begin
  perform pg_temp.check_true(auth.uid() = '22222222-2222-4222-8222-222222222222'::uuid, 'same connection switches to user B claims');
  perform pg_temp.check_true((select count(*) = 1 from public.investment_valuation_snapshots), 'B sees only B snapshot');
  perform pg_temp.check_true((select count(*) = 2 from public.investment_valuation_evidence), 'B sees only B evidence');
  perform pg_temp.check_true((select count(*) = 2 from public.investment_snapshot_evidence), 'B sees only B lineage');
  perform pg_temp.check_true(not exists (select 1 from public.investment_valuation_snapshots where user_id <> auth.uid()), 'B cannot read A snapshot');
end;
$$;

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
do $$
begin
  perform pg_temp.check_true(auth.uid() is null, 'missing subject does not become a user');
  perform pg_temp.check_true(not exists (select 1 from public.investment_valuation_snapshots)
    and not exists (select 1 from public.investment_valuation_evidence)
    and not exists (select 1 from public.investment_snapshot_evidence), 'missing user claims fail closed on all three tables');
end;
$$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare table_name text; f record;
begin
  foreach table_name in array array['investment_valuation_evidence', 'investment_valuation_snapshots', 'investment_snapshot_evidence'] loop
    begin
      execute format('select count(*) from public.%I', table_name);
      raise exception 'Anonymous SELECT unexpectedly allowed on %', table_name;
    exception when insufficient_privilege then raise notice 'PASS: anonymous SELECT denied on %', table_name;
    end;
  end loop;
  select * into strict f from pg_temp.property_fixture limit 1;
  perform pg_temp.reject_snapshot('anonymous RPC rejected', '42501', f.owner_id, f.position_id, f.valuation, f.evidence, f.subject);
end;
$$;

reset role;
set local role service_role;
do $$
declare f record; saved jsonb; no_date_evidence jsonb;
begin
  select * into strict f from pg_temp.property_fixture limit 1;
  no_date_evidence := jsonb_build_array((f.evidence->0) - 'observedOn', (f.evidence->1) - 'observedOn');
  saved := public.persist_investment_valuation_snapshot(f.owner_id, f.position_id, f.valuation, no_date_evidence, f.subject);
  perform pg_temp.check_true((select freshest_evidence_at is null from public.investment_valuation_snapshots where id = (saved->>'snapshotId')::uuid), 'retrieval date never substitutes for a missing observation date');
end;
$$;

reset role;
rollback;

do $$
begin
  if exists (select 1 from auth.users where id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'))
     or exists (select 1 from public.investment_valuation_snapshots where user_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'))
     or exists (select 1 from public.investment_valuation_evidence where user_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'))
     or exists (select 1 from public.investment_snapshot_evidence where user_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) then
    raise exception 'CI fixture transaction did not roll back completely';
  end if;
  raise notice 'PASS: all synthetic property fixtures rolled back';
end;
$$;
