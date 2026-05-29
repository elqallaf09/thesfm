alter table public.project_documents
  add column if not exists source_url text,
  add column if not exists document_type text default 'uploaded_file',
  add column if not exists status text default 'uploaded';

update public.project_documents
set document_type = coalesce(nullif(btrim(document_type), ''), 'uploaded_file'),
    status = coalesce(nullif(btrim(status), ''), 'uploaded')
where document_type is null
   or btrim(document_type) = ''
   or status is null
   or btrim(status) = '';

with ranked as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        project_id,
        coalesce(category, ''),
        lower(btrim(source_url)),
        coalesce(nullif(btrim(document_type), ''), 'uploaded_file')
      order by coalesce(updated_at, uploaded_at, created_at) desc, created_at desc, id desc
    ) as row_number
  from public.project_documents
  where coalesce(btrim(source_url), '') <> ''
)
delete from public.project_documents target
using ranked
where target.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists project_documents_unique_source_identity_idx
on public.project_documents (
  user_id,
  project_id,
  coalesce(category, ''),
  lower(btrim(source_url)),
  coalesce(nullif(btrim(document_type), ''), 'uploaded_file')
)
where coalesce(btrim(source_url), '') <> '';
