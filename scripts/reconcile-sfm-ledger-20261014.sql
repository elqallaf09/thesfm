-- Metadata-only identity repair for seven byte-identical deployed SQL bodies.
-- Read docs/infra/supabase-ledger-2026-10-14.md and retain the before-image.
-- This is NOT a migration or db push. No application DDL/DML is replayed.
begin;
set local lock_timeout='5s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $repair$
declare entry record; affected integer; total integer := 0;
begin
  for entry in select * from (values
    ('20260914100949','20260914090000','shariah_evidence_refresh','a98e02a419d891065e7ece7561b92ed8a46ce2df58eee31e99718ae0bf60e24f'),
    ('20260919101519','20260919093250','platform_completion_core','fabdee21d5161738e2545b0b0b62059e67039aa4dd068eb9e438eb53fb56cc9d'),
    ('20260919102051','20260919101941','preserve_account_deletion_with_month_locks','3660a0cb98ffb57aaeecb424f00be8ebc30eb8bf6c68a1334d1203fe1e0011d6'),
    ('20260919104625','20260919104454','guard_ledger_owner_before_period_lookup','e0a5e86339f967da77636aa767a9c19b8436c4236feaa1efeb1684c93bfa09cd'),
    ('20260919195054','20260919190522','advisor_plans_notification_delivery','f9389df58ae08abcb8167cf16546886e7a6986086f433ca125ccf221cd28ba5e'),
    ('20260919195103','20260919191919','investor_access_and_readonly_integrations','1d56a9a024779587d7c7795ba1337dba79321059c24ec163c12e45b9a10b1e5e'),
    ('20260919195110','20260919192531','collaboration_tasks_and_profiles','91f162592c1e5936dd1ec34fb21651a2bfde7b07eb48dde3034d5303faa3dd83')
  ) as mapping(old_version,new_version,migration_name,sql_sha256) loop
    if exists(select 1 from supabase_migrations.schema_migrations where version=entry.new_version) then
      raise exception 'Target migration identity already exists: %',entry.new_version;
    end if;
    update supabase_migrations.schema_migrations
      set version=entry.new_version
      where version=entry.old_version and name=entry.migration_name
        and encode(sha256(convert_to(array_to_string(statements,E'\n'),'UTF8')),'hex')=entry.sql_sha256;
    get diagnostics affected=row_count;
    if affected<>1 then raise exception 'Migration evidence changed: %',entry.old_version; end if;
    total:=total+affected;
  end loop;
  if total<>7 then raise exception 'Unexpected repair count'; end if;
end $repair$;
commit;
