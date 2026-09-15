-- Publish only externally sourced opinions, distinct from our financial screen.
-- Apply AFTER the corresponding ETF-aware application deployment is READY.
create table if not exists public.shariah_published_opinions (
  source text not null check(source in ('DFM','KFH_BOARD')),
  exchange text not null check(exchange in ('XDFM','DIFX','XKUW')),
  symbol text not null check(symbol ~ '^[A-Z0-9][A-Z0-9._-]{0,31}$'),
  name text not null check(length(name) between 3 and 240),
  opinion text not null check(opinion='compliant'),
  original_wording text not null check(length(original_wording) between 5 and 500),
  as_of date not null,
  issued_at date,
  source_url text not null check(source_url like 'https://%'),
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  retrieved_at timestamptz not null,
  review_after date not null,
  scope text not null check(scope in ('exchange_quarterly_list','issuer_operations_annual')),
  publisher text not null,
  notes text not null,
  primary key(source,exchange,symbol,as_of),
  check(review_after>=as_of),
  check(issued_at is null or issued_at>=as_of)
);
alter table public.shariah_published_opinions enable row level security;
revoke all on public.shariah_published_opinions from public,anon,authenticated;
grant select,insert,update,delete on public.shariah_published_opinions to service_role;

create or replace function public.replace_shariah_publication_period(p_source text, p_items jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare period date; n integer;
begin
  if p_source not in ('DFM','KFH_BOARD') or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_PUBLICATION_SOURCE'; end if;
  if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>1000 then raise exception 'INVALID_PUBLICATION_SIZE'; end if;
  period=(p_items->0->>'as_of')::date;
  if period>current_date or exists(select 1 from jsonb_array_elements(p_items) x where
    x->>'source' is distinct from p_source or (x->>'as_of')::date is distinct from period or
    (x->>'retrieved_at')::timestamptz > clock_timestamp()+interval '1 minute' or
    (p_source='DFM' and ((x->>'exchange') not in ('XDFM','DIFX') or x->>'scope' is distinct from 'exchange_quarterly_list' or x->>'source_url' is distinct from 'https://www.dfm.ae/the-exchange/statistics-reports/sharia-classification-list')) or
    (p_source='KFH_BOARD' and (x->>'scope' is distinct from 'issuer_operations_annual' or x->>'symbol' is distinct from 'KFH' or x->>'exchange' is distinct from 'XKUW' or x->>'source_url' not like 'https://www.kfh.com/en/reports/%#page=18'))
  ) then raise exception 'INVALID_PUBLICATION_DATA'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('shariah_publications:'||p_source));
  -- A corrected official list must replace that same publication atomically;
  -- never leave removed entries looking as if they belong to the revised list.
  delete from public.shariah_published_opinions where source=p_source and as_of=period;
  insert into public.shariah_published_opinions(source,exchange,symbol,name,opinion,original_wording,as_of,issued_at,source_url,source_hash,retrieved_at,review_after,scope,publisher,notes)
  select x.source,x.exchange,x.symbol,x.name,x.opinion,x.original_wording,x.as_of,x.issued_at,x.source_url,x.source_hash,x.retrieved_at,x.review_after,x.scope,x.publisher,x.notes
  from jsonb_to_recordset(p_items) as x(source text,exchange text,symbol text,name text,opinion text,original_wording text,as_of date,issued_at date,source_url text,source_hash text,retrieved_at timestamptz,review_after date,scope text,publisher text,notes text);
  get diagnostics n=row_count;
  return n;
end;
$$;
revoke all on function public.replace_shariah_publication_period(text,jsonb) from public,anon,authenticated;
grant execute on function public.replace_shariah_publication_period(text,jsonb) to service_role;

create or replace function public.claim_shariah_refresh_batch(p_run_id uuid, p_limit integer default 3, p_force boolean default false, p_symbol_id uuid default null)
returns setof public.market_symbols
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.shariah_refresh_runs where id=p_run_id and status='running') then
    raise exception 'INVALID_REFRESH_RUN';
  end if;
  return query
  with candidates as (
    select m.id from public.market_symbols m
    where m.is_active and m.asset_type in ('stock','etf') and not m.shariah_manual_override
      and (p_symbol_id is null or m.id=p_symbol_id)
      and (m.shariah_refresh_run_id is distinct from p_run_id)
      and (m.shariah_lease_until is null or m.shariah_lease_until < clock_timestamp())
      and (p_force or m.shariah_next_refresh_at is null or m.shariah_next_refresh_at <= clock_timestamp())
      -- Fund metadata must be corrected, never screened with corporate equity rules.
      and (m.asset_type='etf' or coalesce(m.name,'') !~* '\mETF\M|exchange.traded fund')
    order by m.shariah_last_attempted_at asc nulls first, m.id
    limit greatest(1,least(coalesce(p_limit,3),10)) for update skip locked
  )
  update public.market_symbols m set shariah_refresh_run_id=p_run_id,
    shariah_last_attempted_at=clock_timestamp(), shariah_lease_until=clock_timestamp()+interval '90 seconds'
  from candidates c where m.id=c.id returning m.*;
end;
$$;


revoke all on function public.claim_shariah_refresh_batch(uuid,integer,boolean,uuid) from public,anon,authenticated;
grant execute on function public.claim_shariah_refresh_batch(uuid,integer,boolean,uuid) to service_role;
create index if not exists market_symbols_fund_review_due_idx on public.market_symbols(shariah_next_refresh_at,shariah_last_attempted_at)
where is_active and asset_type='etf' and not shariah_manual_override;

-- Existing source-verified Kuwait identities from the research store. These are
-- not pre-rated entries or a claim to represent the whole exchange universe.
insert into public.market_symbols(symbol,provider_symbol,name,asset_type,exchange,country,currency,source,is_active)
select s.ticker,s.provider_symbol,s.company_name,'stock','Boursa Kuwait','KW','KWD','verified_issuer_research',true
from public.sharia_security_identities s
where s.ticker in ('NBK','KFH','BOUBYAN','IFA') and s.provider_symbol=s.ticker||'.KW'
  and s.exchange ilike '%Kuwait%'
  and not exists(select 1 from public.market_symbols m where m.symbol=s.ticker and (m.country in ('KW','Kuwait') or m.exchange ilike '%Kuwait%'))
on conflict do nothing;

-- Re-run evidence after the extraction upgrade, without changing the stored
-- determination, its financial date, manual reviews, or an active worker lease.
update public.market_symbols set shariah_next_refresh_at=clock_timestamp()
where is_active and asset_type in ('stock','etf') and not shariah_manual_override
  and (shariah_lease_until is null or shariah_lease_until<clock_timestamp());
