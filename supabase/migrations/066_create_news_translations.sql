create table if not exists public.news_translations (
  id uuid primary key default gen_random_uuid(),
  news_url text not null,
  source text,
  original_title text not null,
  original_summary text,
  language text not null check (language in ('ar', 'en', 'fr')),
  translated_title text not null,
  translated_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_translations_news_url_language_key unique (news_url, language)
);

create index if not exists news_translations_language_updated_idx
  on public.news_translations (language, updated_at desc);

alter table public.news_translations enable row level security;

drop policy if exists "Service role can manage news translations" on public.news_translations;
create policy "Service role can manage news translations"
  on public.news_translations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
