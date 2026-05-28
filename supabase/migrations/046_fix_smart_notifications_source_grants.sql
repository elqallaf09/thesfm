grant usage on schema public to authenticated;

do $$
declare
  table_name text;
  read_tables text[] := array[
    'monthly_income_sources',
    'expense_items',
    'financial_goals',
    'market_price_alerts',
    'projects',
    'project_feasibility_studies',
    'project_financial_models',
    'project_tasks',
    'project_milestones',
    'project_documents',
    'zakat_assets',
    'charity_projects',
    'charity_reminders',
    'charity_beneficiaries',
    'charity_project_contributors',
    'user_notifications',
    'notification_preferences',
    'project_notifications',
    'report_notifications',
    'market_alerts',
    'task_notifications',
    'zakat_reminders',
    'charity_notifications'
  ];
  write_tables text[] := array[
    'notifications'
  ];
begin
  foreach table_name in array read_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('grant select on table public.%I to authenticated', table_name);
    end if;
  end loop;

  foreach table_name in array write_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;
