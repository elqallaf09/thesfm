update storage.buckets
set public = false
where id = 'charity-documents';

insert into storage.buckets (id, name, public)
values ('charity-documents', 'charity-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload own charity documents" on storage.objects;
create policy "Users can upload own charity documents"
on storage.objects for insert
with check (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'charity-documents'
);

drop policy if exists "Users can read own charity documents" on storage.objects;
create policy "Users can read own charity documents"
on storage.objects for select
using (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'charity-documents'
);

drop policy if exists "Users can update own charity documents" on storage.objects;
create policy "Users can update own charity documents"
on storage.objects for update
using (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'charity-documents'
)
with check (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'charity-documents'
);

drop policy if exists "Users can delete own charity documents" on storage.objects;
create policy "Users can delete own charity documents"
on storage.objects for delete
using (
  bucket_id = 'charity-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (storage.foldername(name))[2] = 'charity-documents'
);
