alter table public.project_expenses
  add column if not exists currency text;

update public.project_expenses
set currency = 'KWD'
where currency is null or btrim(currency) = '';

alter table public.project_expenses
  alter column currency set default 'KWD',
  alter column currency set not null;
