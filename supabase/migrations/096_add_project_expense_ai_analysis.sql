alter table public.project_expenses
  add column if not exists ai_analysis jsonb null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own project expense receipts" on storage.objects;
create policy "Users can upload own project expense receipts"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'project-expenses'
);

drop policy if exists "Users can read own project expense receipts" on storage.objects;
create policy "Users can read own project expense receipts"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'project-expenses'
);

drop policy if exists "Users can update own project expense receipts" on storage.objects;
create policy "Users can update own project expense receipts"
on storage.objects for update
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'project-expenses'
)
with check (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'project-expenses'
);

drop policy if exists "Users can delete own project expense receipts" on storage.objects;
create policy "Users can delete own project expense receipts"
on storage.objects for delete
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'project-expenses'
);
