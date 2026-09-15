\set ON_ERROR_STOP on
-- Runs after verify-refresh.sql, in the same disposable local CI database.
-- No production credentials, URLs, user accounts or roles are modified.
alter table public.market_symbols add column currency text, add column source text;
create table public.sharia_security_identities(ticker text,provider_symbol text,company_name text,exchange text);
\ir ../../supabase/migrations/20260915090000_shariah_publications_fund_review.sql
begin;
do $$
declare run_a uuid; item public.market_symbols; n integer; patch jsonb; a jsonb; b jsonb; period date;
begin
  insert into public.market_symbols(symbol,name,asset_type) values ('TEST_FUND','Synthetic fund','etf');
  insert into public.market_symbols(symbol,name,asset_type,shariah_manual_override) values ('TEST_MANUAL_FUND','Synthetic manual fund','etf',true);
  insert into public.market_symbols(symbol,name) values ('TEST_WRONG_TYPE','Synthetic ETF');
  insert into public.shariah_refresh_runs default values returning id into run_a;
  select count(*) into n from public.claim_shariah_refresh_batch(run_a,10);
  assert n=1, 'ETF-aware claim must select the fund, not manual or mistyped instruments';
  select * into item from public.market_symbols where symbol='TEST_FUND';
  patch=jsonb_build_object('shariah_status','needs_review','shariah_reason','Synthetic fund proof; not a company ratio',
    'shariah_source','Synthetic fund source','shariah_last_reviewed_at',clock_timestamp(),
    'shariah_screening_data',jsonb_build_object('evidenceVersion','sfm-evidence-v2','methodologyId','SFM_FUND_EVIDENCE_REVIEW','methodologyVersion','1'));
  assert public.finish_shariah_refresh(run_a,item.id,item.updated_at,patch,null)=1;
  assert public.finish_shariah_refresh(run_a,item.id,item.updated_at,patch,null)=0, 'No duplicate fund write';
  assert exists(select 1 from public.market_symbols where id=item.id and shariah_refresh_run_id=run_a and shariah_status='needs_review');
  period=(date_trunc('quarter',current_date)-interval '1 day')::date;
  a=jsonb_build_object('source','DFM','exchange','XDFM','symbol','TEST_A','name','Synthetic publication A',
    'opinion','compliant','original_wording','Synthetic test opinion only','as_of',period,'issued_at',null,
    'source_url','https://www.dfm.ae/the-exchange/statistics-reports/sharia-classification-list',
    'source_hash',repeat('a',64),'retrieved_at',clock_timestamp(),'review_after',period+100,
    'scope','exchange_quarterly_list','publisher','Synthetic test publisher','notes','Fixture, not real securities data');
  assert public.replace_shariah_publication_period('DFM',jsonb_build_array(a))=1;
  b=a||jsonb_build_object('symbol','TEST_B','name','Synthetic publication B');
  assert public.replace_shariah_publication_period('DFM',jsonb_build_array(b))=1;
  assert not exists(select 1 from public.shariah_published_opinions where symbol='TEST_A'), 'Removed list entries must not survive a replacement';
  begin
    perform public.replace_shariah_publication_period('DFM',jsonb_build_array(a,a));
    raise exception 'DUPLICATE_ACCEPTED';
  exception when unique_violation then null;
  end;
  assert exists(select 1 from public.shariah_published_opinions where symbol='TEST_B'), 'Rejected duplicate import must roll back the delete';
  begin
    perform public.replace_shariah_publication_period('DFM',jsonb_build_array(a||jsonb_build_object('source_url','https://example.invalid/forged')));
    raise exception 'UNTRUSTED_SOURCE_ACCEPTED';
  exception when raise_exception then assert SQLERRM='INVALID_PUBLICATION_DATA';
  end;
  assert exists(select 1 from public.shariah_published_opinions where symbol='TEST_B');
  assert not has_table_privilege('anon','public.shariah_published_opinions','select');
  assert not has_table_privilege('authenticated','public.shariah_published_opinions','insert');
  assert not has_function_privilege('authenticated','public.replace_shariah_publication_period(text,jsonb)','execute');
  assert has_function_privilege('service_role','public.replace_shariah_publication_period(text,jsonb)','execute');
  raise notice 'PASS: ETF claim/write/replay, publication atomic replacement/rollback, source checks and privileges';
end $$;
rollback;
