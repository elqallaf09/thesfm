-- Persistent storage for external market provider sessions
-- Solves the serverless cold-start problem where in-memory session cache is lost
create table if not exists market_provider_sessions (
  id          text primary key,                       -- provider name e.g. 'myfxbook'
  session_token text not null,
  cache_key   text not null,                          -- hash of credentials, to detect changes
  expires_at  timestamptz not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Only service role can access this table (no user RLS needed)
alter table market_provider_sessions enable row level security;

-- No public access
create policy "no_public_access" on market_provider_sessions
  for all using (false);

comment on table market_provider_sessions is
  'Persists external market provider session tokens across serverless cold starts';
