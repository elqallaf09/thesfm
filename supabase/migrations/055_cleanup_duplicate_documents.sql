-- Keep the newest / most complete duplicate document rows and prevent future duplicates.

with ranked_project_documents as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        project_id,
        case
          when coalesce(btrim(source_url), '') <> '' then
            concat_ws('|', 'source', coalesce(category, ''), lower(btrim(source_url)), coalesce(nullif(btrim(document_type), ''), 'uploaded_file'))
          when coalesce(btrim(file_name), '') <> '' then
            concat_ws('|', 'file-name', lower(coalesce(btrim(title), '')), coalesce(category, ''), lower(btrim(file_name)))
          when coalesce(btrim(file_url), btrim(file_path), '') <> '' then
            concat_ws('|', 'file-path', lower(coalesce(btrim(file_url), btrim(file_path))))
          else
            concat_ws('|', 'fallback', lower(coalesce(btrim(title), '')), coalesce(category, ''), lower(coalesce(btrim(file_name), '')), coalesce(uploaded_at::date::text, created_at::date::text, ''))
        end
      order by
        (
          (case when coalesce(btrim(file_path), '') <> '' then 1 else 0 end) +
          (case when coalesce(btrim(file_url), '') <> '' then 1 else 0 end) +
          (case when file_size is not null then 1 else 0 end) +
          (case when coalesce(btrim(source_url), '') <> '' then 1 else 0 end) +
          (case when coalesce(btrim(notes), '') <> '' then 1 else 0 end)
        ) desc,
        coalesce(updated_at, uploaded_at, created_at) desc,
        created_at desc,
        id desc
    ) as row_number
  from public.project_documents
)
delete from public.project_documents target
using ranked_project_documents ranked
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

create unique index if not exists project_documents_unique_file_identity_idx
on public.project_documents (
  user_id,
  project_id,
  lower(coalesce(btrim(title), '')),
  coalesce(category, ''),
  lower(coalesce(btrim(file_name), ''))
)
where coalesce(btrim(source_url), '') = ''
  and coalesce(btrim(file_name), '') <> '';

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
