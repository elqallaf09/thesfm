create table if not exists public.project_pitch_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  language text default 'ar',
  deck_data jsonb default '{}'::jsonb,
  readiness_score numeric default 0,
  source text default 'rules',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id, language)
);

create index if not exists project_pitch_decks_user_project_idx
on public.project_pitch_decks(user_id, project_id);

create index if not exists project_pitch_decks_language_idx
on public.project_pitch_decks(language);

alter table public.project_pitch_decks enable row level security;

drop policy if exists "Users can select own project pitch decks" on public.project_pitch_decks;
create policy "Users can select own project pitch decks"
on public.project_pitch_decks for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project pitch decks" on public.project_pitch_decks;
create policy "Users can insert own project pitch decks"
on public.project_pitch_decks for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project pitch decks" on public.project_pitch_decks;
create policy "Users can update own project pitch decks"
on public.project_pitch_decks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project pitch decks" on public.project_pitch_decks;
create policy "Users can delete own project pitch decks"
on public.project_pitch_decks for delete
using (auth.uid() = user_id);
