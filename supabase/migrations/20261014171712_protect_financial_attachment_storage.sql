-- Deploy authenticated attachment URLs first. Reconcile the production migration
-- ledger before applying; public attachment URLs must stop working after this.
begin;
update storage.buckets set public = false where id in ('receipts', 'income-attachments');

-- Finance uses owner/file; project receipts use owner/project-expenses/file.
-- Both require the same owner boundary, including renames and upserts.
create policy "Financial receipt owner access" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Future permissive policies cannot accidentally grant other users access to
-- either financial bucket. Public marketing/avatar buckets are unaffected.
create policy "Financial attachment owner boundary" on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id not in ('receipts', 'income-attachments') or (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id not in ('receipts', 'income-attachments') or (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
