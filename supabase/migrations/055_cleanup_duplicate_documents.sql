-- Keep the newest / most complete duplicate document rows and prevent future duplicates.
-- Do not reference source_url: public.project_documents does not have that column.

drop index if exists public.project_documents_unique_source_identity_idx;
drop index if exists public.project_documents_unique_file_identity_idx;

with ranked_project_documents as (
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
using ranked_project_documents ranked
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

create index if not exists project_documents_title_category_project_idx
on public.project_documents (
  user_id,
  project_id,
  lower(btrim(title)),
  lower(coalesce(btrim(category), ''))
);

with ranked_pitch_decks as (
  select
    id,
    row_number() over (
      partition by user_id, project_id, coalesce(nullif(btrim(language), ''), 'ar')
      order by
        (
          (case when deck_data is not null and deck_data <> '{}'::jsonb then 1 else 0 end) +
          (case when readiness_score is not null and readiness_score > 0 then 1 else 0 end)
        ) desc,
        coalesce(updated_at, created_at) desc,
        created_at desc,
        id desc
    ) as row_number
  from public.project_pitch_decks
)
delete from public.project_pitch_decks target
using ranked_pitch_decks ranked
where target.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists project_pitch_decks_unique_user_project_language_idx
on public.project_pitch_decks (
  user_id,
  project_id,
  coalesce(nullif(btrim(language), ''), 'ar')
);
