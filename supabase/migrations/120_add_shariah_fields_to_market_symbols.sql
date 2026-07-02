-- Add conservative Shariah classification metadata to market symbols.
-- Status values:
-- compliant, non_compliant, needs_review, unclassified

alter table public.market_symbols
  add column if not exists shariah_status text not null default 'unclassified';

alter table public.market_symbols
  add column if not exists shariah_reason text;

alter table public.market_symbols
  add column if not exists shariah_source text;

alter table public.market_symbols
  add column if not exists shariah_last_reviewed_at timestamptz;

alter table public.market_symbols
  add column if not exists shariah_manual_override boolean not null default false;

alter table public.market_symbols
  add column if not exists shariah_reviewed_by text;

alter table public.market_symbols
  add column if not exists shariah_screening_data jsonb not null default '{}'::jsonb;

update public.market_symbols
set
  shariah_status = coalesce(nullif(shariah_status, ''), 'unclassified'),
  shariah_manual_override = coalesce(shariah_manual_override, false),
  shariah_screening_data = coalesce(shariah_screening_data, '{}'::jsonb)
where shariah_status is null
   or shariah_status = ''
   or shariah_manual_override is null
   or shariah_screening_data is null;

do $$
begin
  alter table public.market_symbols
    add constraint market_symbols_shariah_status_check
    check (shariah_status in ('compliant', 'non_compliant', 'needs_review', 'unclassified'));
exception
  when duplicate_object then null;
end $$;

create index if not exists market_symbols_shariah_status_idx
  on public.market_symbols (shariah_status);

create index if not exists market_symbols_asset_type_idx
  on public.market_symbols (asset_type);

create index if not exists market_symbols_exchange_idx
  on public.market_symbols (exchange);

create index if not exists market_symbols_country_idx
  on public.market_symbols (country);
