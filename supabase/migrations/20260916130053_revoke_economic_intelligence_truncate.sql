-- RLS does not protect whole-table TRUNCATE operations. Remove that privilege
-- from application roles only; preserve all row privileges and admin access.
-- This single DO statement is atomic and never executes TRUNCATE or row writes.
DO $guard$
DECLARE
  target_table regclass;
  caller_role text;
  before_privileges boolean[];
  after_privileges boolean[];
  service_truncate_before boolean;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'public.user_decisions'::regclass,
    'public.notifications'::regclass,
    'public.economic_intelligence_confirmations'::regclass
  ] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = target_table) THEN
      RAISE EXCEPTION 'RLS must already be enabled on %', target_table;
    END IF;

    SELECT array_agg(has_table_privilege(r.role_name, target_table, p.privilege_name)
                     ORDER BY r.role_name, p.privilege_name)
      INTO before_privileges
      FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(role_name)
      CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'REFERENCES', 'TRIGGER']) AS p(privilege_name);
    service_truncate_before := has_table_privilege('service_role', target_table, 'TRUNCATE');

    EXECUTE format('REVOKE TRUNCATE ON TABLE %s FROM anon, authenticated, PUBLIC', target_table);

    SELECT array_agg(has_table_privilege(r.role_name, target_table, p.privilege_name)
                     ORDER BY r.role_name, p.privilege_name)
      INTO after_privileges
      FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(role_name)
      CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'REFERENCES', 'TRIGGER']) AS p(privilege_name);
    IF before_privileges IS DISTINCT FROM after_privileges THEN
      RAISE EXCEPTION 'Non-TRUNCATE privileges changed on %', target_table;
    END IF;
    IF service_truncate_before IS DISTINCT FROM has_table_privilege('service_role', target_table, 'TRUNCATE') THEN
      RAISE EXCEPTION 'Administrative privileges changed on %', target_table;
    END IF;

    FOREACH caller_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(caller_role, target_table, 'TRUNCATE') THEN
        RAISE EXCEPTION 'Role % still has TRUNCATE on %', caller_role, target_table;
      END IF;
    END LOOP;
  END LOOP;
END;
$guard$;
