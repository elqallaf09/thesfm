create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  category text default 'other',
  file_url text,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  notes text,
  uploaded_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_documents_user_project_idx
on public.project_documents(user_id, project_id);

create index if not exists project_documents_category_idx
on public.project_documents(category);

create index if not exists project_documents_uploaded_at_idx
on public.project_documents(uploaded_at);

alter table public.project_documents enable row level security;

drop policy if exists "Users can select own project documents" on public.project_documents;
create policy "Users can select own project documents"
on public.project_documents for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project documents" on public.project_documents;
create policy "Users can insert own project documents"
on public.project_documents for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project documents" on public.project_documents;
create policy "Users can update own project documents"
on public.project_documents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project documents" on public.project_documents;
create policy "Users can delete own project documents"
on public.project_documents for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload own project documents" on storage.objects;
create policy "Users can upload own project documents"
on storage.objects for insert
with check (
  bucket_id = 'project-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'projects'
);

drop policy if exists "Users can read own project documents" on storage.objects;
create policy "Users can read own project documents"
on storage.objects for select
using (
  bucket_id = 'project-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'projects'
);

drop policy if exists "Users can update own project documents" on storage.objects;
create policy "Users can update own project documents"
on storage.objects for update
using (
  bucket_id = 'project-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'projects'
)
with check (
  bucket_id = 'project-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'projects'
);

drop policy if exists "Users can delete own project documents" on storage.objects;
create policy "Users can delete own project documents"
on storage.objects for delete
using (
  bucket_id = 'project-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'projects'
);
