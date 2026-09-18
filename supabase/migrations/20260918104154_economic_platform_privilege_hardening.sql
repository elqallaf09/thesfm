-- RLS does not protect whole-table TRUNCATE operations. Remove that privilege
-- from application roles only; preserve all row privileges and admin access.
-- Inventory verified on 2026-09-18. No table content or owner policies change.
DO $guard$
DECLARE
  target_table regclass;
  target_name text;
  caller_role text;
  before_privileges boolean[];
  after_privileges boolean[];
  service_truncate_before boolean;
BEGIN
  FOREACH target_name IN ARRAY ARRAY[
    'public.account_activity',
    'public.activity_logs',
    'public.ad_campaigns',
    'public.analytics_events',
    'public.business_customers',
    'public.business_employees',
    'public.business_funding_programs',
    'public.business_invoices',
    'public.business_jurisdictions',
    'public.business_operating_expenses',
    'public.business_sales',
    'public.business_suppliers',
    'public.business_user_roles',
    'public.charity_beneficiaries',
    'public.charity_commitments',
    'public.charity_documents',
    'public.charity_organizations',
    'public.charity_project_contributors',
    'public.charity_project_donations',
    'public.charity_project_impact_metrics',
    'public.charity_projects',
    'public.charity_reminders',
    'public.client_files',
    'public.client_notes',
    'public.clients',
    'public.company_listings',
    'public.debt_payments',
    'public.debts',
    'public.email_2fa_codes',
    'public.events',
    'public.expense_items',
    'public.financial_goals',
    'public.financial_profiles',
    'public.funding_program_categories',
    'public.funding_programs',
    'public.generated_reports',
    'public.holdings',
    'public.instagram_automation_events',
    'public.instagram_automation_posts',
    'public.investment_documents',
    'public.investment_items',
    'public.investment_ownership_sources',
    'public.investment_position_migration_checks',
    'public.investment_positions',
    'public.investment_property_details',
    'public.investment_transactions',
    'public.investment_valuations',
    'public.khums_entries',
    'public.khums_payments',
    'public.khums_reminders',
    'public.khums_years',
    'public.market_agent_history',
    'public.market_price_alerts',
    'public.market_provider_sessions',
    'public.market_provider_state',
    'public.market_signals',
    'public.market_symbols',
    'public.market_watchlist',
    'public.monthly_income_sources',
    'public.orders',
    'public.page_views',
    'public.payment_history',
    'public.payments',
    'public.profiles',
    'public.project_documents',
    'public.project_due_diligence_items',
    'public.project_expenses',
    'public.project_feasibility_studies',
    'public.project_financial_models',
    'public.project_funding_readiness',
    'public.project_funding_shortlist',
    'public.project_income',
    'public.project_investor_events',
    'public.project_investor_links',
    'public.project_investor_questions',
    'public.project_jurisdiction_assessments',
    'public.project_milestones',
    'public.project_pitch_decks',
    'public.project_risks',
    'public.project_strategic_documents',
    'public.project_tasks',
    'public.projects',
    'public.savings',
    'public.savings_items',
    'public.sharia_evidence_items',
    'public.sharia_financial_values',
    'public.sharia_methodologies',
    'public.sharia_research_jobs',
    'public.sharia_screening_results',
    'public.sharia_search_history',
    'public.sharia_security_identities',
    'public.sharia_source_documents',
    'public.signal_history',
    'public.signal_notifications',
    'public.site_events',
    'public.site_sessions',
    'public.subscription_notifications',
    'public.subscription_reminder_runs',
    'public.subscriptions',
    'public.trader_access',
    'public.trader_alerts',
    'public.trader_assets',
    'public.trader_cache',
    'public.trader_followed_trades',
    'public.trader_notification_log',
    'public.trader_provider_status',
    'public.trader_recommendation_history',
    'public.trader_scan_results',
    'public.trader_scan_runs',
    'public.user_signal_preferences',
    'public.user_subscriptions',
    'public.zakat_assets',
    'public.zakat_calculations'
  ] LOOP
    target_table := to_regclass(target_name);
    -- Hosted-only legacy tables can be absent from a clean database.
    IF target_table IS NULL THEN CONTINUE; END IF;
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

-- All twelve functions use built-in operations and NEW/OLD only. Pin resolution
-- to pg_catalog while preserving their body, owner, ACL and invoker security.
DO $functions$
DECLARE
  function_name text;
  target regprocedure;
  before_definition jsonb;
  after_definition jsonb;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'set_project_expenses_updated_at', 'set_debts_updated_at',
    'normalize_business_employee_row', 'set_business_operations_updated_at',
    'set_business_user_roles_updated_at', 'set_company_listing_updated_at',
    'set_subscription_updated_at', 'set_ai_usage_limits_updated_at',
    'set_updated_at', 'set_subscription_manager_updated_at',
    'set_admin_roles_updated_at', 'set_instagram_automation_updated_at'
  ] LOOP
    target := to_regprocedure(format('public.%I()', function_name));
    IF target IS NULL THEN CONTINUE; END IF;
    SELECT jsonb_build_array(prosrc, proowner, proacl, prosecdef) INTO before_definition
      FROM pg_proc WHERE oid = target;
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog', target);
    SELECT jsonb_build_array(prosrc, proowner, proacl, prosecdef) INTO after_definition
      FROM pg_proc WHERE oid = target;
    IF before_definition IS DISTINCT FROM after_definition THEN
      RAISE EXCEPTION 'Function body or access changed: %', function_name;
    END IF;
  END LOOP;
END;
$functions$;
