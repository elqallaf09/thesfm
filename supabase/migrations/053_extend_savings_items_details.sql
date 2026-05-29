alter table public.savings_items
  add column if not exists currency text default 'KWD',
  add column if not exists saving_type text,
  add column if not exists saving_method text,
  add column if not exists saved_at date,
  add column if not exists note text,
  add column if not exists goal_id uuid references public.financial_goals(id) on delete set null;

create index if not exists savings_items_user_saved_at_idx
on public.savings_items(user_id, saved_at desc);

create index if not exists savings_items_user_goal_idx
on public.savings_items(user_id, goal_id);
