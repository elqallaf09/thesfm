-- Deduplicate project document rows using only the real project_documents schema.
-- Real URL/path columns on this table are file_url and file_path.

with ranked as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        project_id,
        case
          when coalesce(btrim(file_url), '') <> '' then
            concat_ws('|', 'file_url', lower(btrim(file_url)))
          when coalesce(btrim(file_path), '') <> '' then
            concat_ws('|', 'file_path', lower(btrim(file_path)))
          when coalesce(btrim(title), '') <> '' and coalesce(btrim(category), '') <> '' then
            concat_ws('|', 'title_category_project', lower(btrim(title)), lower(btrim(category)))
          else
            concat_ws('|', 'title_project_date', lower(coalesce(btrim(title), '')), coalesce(uploaded_at::date::text, created_at::date::text, ''))
        end
      order by
        (
          (case when coalesce(btrim(file_url), '') <> '' then 1 else 0 end) +
          (case when coalesce(btrim(file_path), '') <> '' then 1 else 0 end) +
          (case when file_size is not null then 1 else 0 end) +
          (case when coalesce(btrim(notes), '') <> '' then 1 else 0 end)
        ) desc,
        coalesce(updated_at, uploaded_at, created_at) desc,
        created_at desc,
        id desc
    ) as row_number
  from public.project_documents
  where coalesce(btrim(file_url), '') <> ''
     or coalesce(btrim(file_path), '') <> ''
     or coalesce(btrim(title), '') <> ''
)
delete from public.project_documents target
using ranked
where target.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists project_documents_unique_file_url_idx
on public.project_documents (
  user_id,
  project_id,
  lower(btrim(file_url))
)
where coalesce(btrim(file_url), '') <> '';

create unique index if not exists project_documents_unique_file_path_idx
on public.project_documents (
  user_id,
  project_id,
  lower(btrim(file_path))
)
where coalesce(btrim(file_path), '') <> '';
