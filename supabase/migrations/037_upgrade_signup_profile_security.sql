alter table public.profiles
  add column if not exists email text,
  add column if not exists country text,
  add column if not exists default_currency text default 'KWD',
  add column if not exists security_question text,
  add column if not exists security_answer_hash text;
