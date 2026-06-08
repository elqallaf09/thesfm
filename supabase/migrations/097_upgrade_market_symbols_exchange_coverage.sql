alter table public.market_symbols
  add column if not exists market text,
  add column if not exists display_symbol text,
  add column if not exists company_name_ar text,
  add column if not exists company_name_en text,
  add column if not exists sector text,
  add column if not exists price_unit text,
  add column if not exists last_synced_at timestamptz;

update public.market_symbols
set
  display_symbol = coalesce(display_symbol, symbol),
  company_name_en = coalesce(company_name_en, name),
  market = coalesce(market, exchange),
  last_synced_at = coalesce(last_synced_at, updated_at)
where display_symbol is null
   or company_name_en is null
   or market is null
   or last_synced_at is null;

alter table public.market_symbols
  alter column display_symbol set default '',
  alter column asset_type set default 'stock',
  alter column is_active set default true;

create unique index if not exists market_symbols_exchange_symbol_key
  on public.market_symbols (exchange, symbol);

create index if not exists market_symbols_exchange_active_idx
  on public.market_symbols (exchange, is_active);

create index if not exists market_symbols_display_symbol_idx
  on public.market_symbols (display_symbol);

create index if not exists market_symbols_company_name_ar_idx
  on public.market_symbols (company_name_ar);

create index if not exists market_symbols_company_name_en_idx
  on public.market_symbols (company_name_en);

create index if not exists market_symbols_currency_idx
  on public.market_symbols (currency);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'market_symbols'
      and policyname = 'Authenticated users can read active market symbols'
  ) then
    create policy "Authenticated users can read active market symbols"
      on public.market_symbols
      for select
      to authenticated
      using (is_active = true);
  end if;
end $$;
