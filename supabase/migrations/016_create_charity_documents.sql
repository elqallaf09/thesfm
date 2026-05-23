create table if not exists public.charity_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.charity_projects(id) on delete set null,
  donation_id uuid references public.charity_project_donations(id) on delete set null,
  zakat_asset_id uuid references public.zakat_assets(id) on delete set null,
  commitment_id uuid references public.charity_commitments(id) on delete set null,
  title text not null,
  category text default 'other',
  file_url text not null,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  notes text,
  uploaded_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists charity_documents_user_id_idx on public.charity_documents(user_id);
create index if not exists charity_documents_project_id_idx on public.charity_documents(project_id);
create index if not exists charity_documents_donation_id_idx on public.charity_documents(donation_id);
create index if not exists charity_documents_category_idx on public.charity_documents(category);

alter table public.charity_documents enable row level security;

drop policy if exists "Users can select own charity documents" on public.charity_documents;
create policy "Users can select own charity documents"
on public.charity_documents for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own charity documents" on public.charity_documents;
create policy "Users can insert own charity documents"
on public.charity_documents for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own charity documents" on public.charity_documents;
create policy "Users can update own charity documents"
on public.charity_documents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own charity documents" on public.charity_documents;
create policy "Users can delete own charity documents"
on public.charity_documents for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('charity-documents', 'charity-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own charity documents" on storage.objects;
create policy "Users can upload own charity documents"
on storage.objects for insert
with check (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own charity documents" on storage.objects;
create policy "Users can read own charity documents"
on storage.objects for select
using (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own charity documents" on storage.objects;
create policy "Users can update own charity documents"
on storage.objects for update
using (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own charity documents" on storage.objects;
create policy "Users can delete own charity documents"
on storage.objects for delete
using (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
