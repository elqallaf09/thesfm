create table if not exists public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  file_name text,
  file_url text,
  source_url text,
  category text,
  metadata jsonb default '{}'::jsonb,
  report_type text,
  file_path text,
  file_type text,
  file_size numeric,
  format text,
  notes text,
  generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_strategic_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  file_name text,
  file_url text,
  source_url text,
  category text,
  metadata jsonb default '{}'::jsonb,
  project_id uuid references public.projects(id) on delete cascade,
  document_type text,
  type text,
  file_path text,
  file_type text,
  file_size numeric,
  readiness_status text,
  source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.generated_reports
  add column if not exists source_url text,
  add column if not exists category text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists report_type text,
  add column if not exists file_path text,
  add column if not exists file_type text,
  add column if not exists file_size numeric,
  add column if not exists format text,
  add column if not exists notes text,
  add column if not exists generated_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table public.project_strategic_documents
  add column if not exists source_url text,
  add column if not exists category text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists document_type text,
  add column if not exists type text,
  add column if not exists file_path text,
  add column if not exists file_type text,
  add column if not exists file_size numeric,
  add column if not exists readiness_status text,
  add column if not exists source text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now();

create index if not exists generated_reports_user_created_idx
on public.generated_reports(user_id, created_at desc);

create index if not exists generated_reports_category_idx
on public.generated_reports(category);

create index if not exists project_strategic_documents_user_created_idx
on public.project_strategic_documents(user_id, created_at desc);

create index if not exists project_strategic_documents_project_idx
on public.project_strategic_documents(project_id);

create index if not exists project_strategic_documents_category_idx
on public.project_strategic_documents(category);

alter table public.generated_reports enable row level security;
alter table public.project_strategic_documents enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.generated_reports to authenticated;
grant select, insert, update, delete on table public.project_strategic_documents to authenticated;

drop policy if exists "Users can view own generated reports" on public.generated_reports;
drop policy if exists "Users can insert own generated reports" on public.generated_reports;
drop policy if exists "Users can update own generated reports" on public.generated_reports;
drop policy if exists "Users can delete own generated reports" on public.generated_reports;

create policy "Users can view own generated reports"
on public.generated_reports
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own generated reports"
on public.generated_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own generated reports"
on public.generated_reports
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own generated reports"
on public.generated_reports
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own strategic documents" on public.project_strategic_documents;
drop policy if exists "Users can insert own strategic documents" on public.project_strategic_documents;
drop policy if exists "Users can update own strategic documents" on public.project_strategic_documents;
drop policy if exists "Users can delete own strategic documents" on public.project_strategic_documents;

create policy "Users can view own strategic documents"
on public.project_strategic_documents
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own strategic documents"
on public.project_strategic_documents
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own strategic documents"
on public.project_strategic_documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own strategic documents"
on public.project_strategic_documents
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
