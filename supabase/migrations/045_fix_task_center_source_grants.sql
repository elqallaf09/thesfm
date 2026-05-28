grant usage on schema public to authenticated;

do $$
declare
  table_name text;
  read_write_tables text[] := array[
    'profiles',
    'monthly_income_sources',
    'expense_items',
    'financial_goals',
    'savings_items',
    'investment_items',
    'market_watchlist',
    'market_price_alerts',
    'projects',
    'project_feasibility_studies',
    'project_financial_models',
    'project_tasks',
    'project_milestones',
    'project_documents',
    'project_pitch_decks',
    'project_funding_readiness',
    'project_jurisdiction_assessments',
    'zakat_calculations',
    'zakat_assets',
    'charity_projects',
    'charity_reminders',
    'charity_beneficiaries',
    'charity_project_contributors',
    'charity_commitments',
    'charity_documents',
    'notifications',
    'user_decisions'
  ];
begin
  foreach table_name in array read_write_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;
