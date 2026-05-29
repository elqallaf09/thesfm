do $$
begin
  if to_regclass('public.monthly_income_sources') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'monthly_income_sources'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists monthly_income_sources_user_created_idx
      on public.monthly_income_sources(user_id, created_at desc);
  end if;

  if to_regclass('public.expense_items') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'expense_items'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists expense_items_user_created_idx
      on public.expense_items(user_id, created_at desc);
  end if;

  if to_regclass('public.financial_goals') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'financial_goals'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists financial_goals_user_created_idx
      on public.financial_goals(user_id, created_at desc);
  end if;

  if to_regclass('public.investment_items') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'investment_items'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists investment_items_user_created_idx
      on public.investment_items(user_id, created_at desc);
  end if;

  if to_regclass('public.notifications') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'notifications'
         and column_name in ('user_id', 'read')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists notifications_user_read_idx
      on public.notifications(user_id, read);
  end if;

  if to_regclass('public.projects') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'projects'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists projects_user_created_idx
      on public.projects(user_id, created_at desc);
  end if;

  if to_regclass('public.project_documents') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'project_documents'
         and column_name in ('user_id', 'updated_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists project_documents_user_updated_idx
      on public.project_documents(user_id, updated_at desc);
  end if;

  if to_regclass('public.project_tasks') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'project_tasks'
         and column_name in ('user_id', 'project_id', 'status', 'due_date')
       group by table_name
       having count(distinct column_name) = 4
     ) then
    create index if not exists project_tasks_user_project_status_due_idx
      on public.project_tasks(user_id, project_id, status, due_date);
  end if;

  if to_regclass('public.project_milestones') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'project_milestones'
         and column_name in ('user_id', 'project_id', 'status', 'target_date')
       group by table_name
       having count(distinct column_name) = 4
     ) then
    create index if not exists project_milestones_user_project_status_target_idx
      on public.project_milestones(user_id, project_id, status, target_date);
  end if;

  if to_regclass('public.project_income') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'project_income'
         and column_name in ('user_id', 'project_id', 'income_date')
       group by table_name
       having count(distinct column_name) = 3
     ) then
    create index if not exists project_income_user_project_date_idx
      on public.project_income(user_id, project_id, income_date desc);
  end if;

  if to_regclass('public.project_expenses') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'project_expenses'
         and column_name in ('user_id', 'project_id', 'expense_date')
       group by table_name
       having count(distinct column_name) = 3
     ) then
    create index if not exists project_expenses_user_project_date_idx
      on public.project_expenses(user_id, project_id, expense_date desc);
  end if;

  if to_regclass('public.user_decisions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'user_decisions'
         and column_name in ('user_id', 'updated_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists user_decisions_user_updated_idx
      on public.user_decisions(user_id, updated_at desc);
  end if;

  if to_regclass('public.business_sales') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'business_sales'
         and column_name in ('user_id', 'sale_date', 'created_at')
       group by table_name
       having count(distinct column_name) = 3
     ) then
    create index if not exists business_sales_user_sale_created_idx
      on public.business_sales(user_id, sale_date desc, created_at desc);
  end if;

  if to_regclass('public.business_employees') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'business_employees'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists business_employees_user_created_idx
      on public.business_employees(user_id, created_at desc);
  end if;

  if to_regclass('public.charity_projects') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'charity_projects'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists charity_projects_user_created_idx
      on public.charity_projects(user_id, created_at desc);
  end if;

  if to_regclass('public.charity_project_donations') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'charity_project_donations'
         and column_name in ('user_id', 'donation_date')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists charity_project_donations_user_date_idx
      on public.charity_project_donations(user_id, donation_date desc);
  end if;

  if to_regclass('public.charity_reminders') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'charity_reminders'
         and column_name in ('user_id', 'due_date')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists charity_reminders_user_due_idx
      on public.charity_reminders(user_id, due_date);
  end if;

  if to_regclass('public.zakat_calculations') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'zakat_calculations'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists zakat_calculations_user_created_idx
      on public.zakat_calculations(user_id, created_at desc);
  end if;

  if to_regclass('public.market_watchlist') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'market_watchlist'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists market_watchlist_user_created_idx
      on public.market_watchlist(user_id, created_at desc);
  end if;

  if to_regclass('public.market_price_alerts') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'market_price_alerts'
         and column_name in ('user_id', 'created_at')
       group by table_name
       having count(distinct column_name) = 2
     ) then
    create index if not exists market_price_alerts_user_created_idx
      on public.market_price_alerts(user_id, created_at desc);
  end if;
end $$;
