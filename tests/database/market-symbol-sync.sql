-- Disposable databases only; every fixture is rolled back.
begin;
do $$ begin
  if current_setting('sfm.disposable_ci', true) is distinct from '1' then raise exception 'disposable database required'; end if;
end $$;
do $$
declare report jsonb; baseline bigint; saved_id uuid;
begin
  select count(*) into baseline from public.market_symbols;
  report := public.sync_market_symbols_checked('[
    {"symbol":"QA-SYNC","exchange":"LSE","provider_symbol":"QA-SYNC","name":"Fixture UK","primary_exchange":"NYSE","requested_exchange":"LSE"},
    {"symbol":"QA-SYNC","exchange":"NYSE","provider_symbol":"QA-SYNC","name":"Fixture US"}
  ]'::jsonb);
  if (report->>'after_count')::bigint <> baseline + 2 or (report->>'matched_after')::int <> 2 then raise exception 'insert counts'; end if;
  select id into saved_id from public.market_symbols where exchange='LSE' and symbol='QA-SYNC';
  update public.market_symbols set shariah_manual_override=true, company_name_ar='اختبار' where id=saved_id;
  report := public.sync_market_symbols_checked('[{"symbol":"QA-SYNC","exchange":"LSE","name":"Updated","primary_exchange":null}]'::jsonb);
  if (report->>'inserted_count')::int <> 0 or (report->>'after_count')::bigint <> baseline+2 then raise exception 'replay counts'; end if;
  if not exists(select 1 from public.market_symbols where id=saved_id and primary_exchange='NYSE' and requested_exchange='LSE' and shariah_manual_override and company_name_ar='اختبار') then raise exception 'metadata lost'; end if;
  begin
    perform public.sync_market_symbols_checked('[{"symbol":"QA-DUP","exchange":"LSE","name":"A"},{"symbol":"QA-DUP","exchange":"LSE","name":"B"}]');
    raise exception 'duplicate accepted';
  exception when others then if sqlerrm <> 'symbol_sync_duplicate_listing' then raise; end if; end;
  begin
    perform public.sync_market_symbols_checked('[{"symbol":"QA-MISSING","name":"A"}]');
    raise exception 'missing identity accepted';
  exception when others then if sqlerrm <> 'symbol_sync_invalid_identity' then raise; end if; end;
  begin
    perform public.sync_market_symbols_checked('[{"symbol":"QA-ROLLBACK","exchange":"LSE","name":"A"},{"symbol":"QA-ZFAIL","exchange":"LSE","name":"B","provider_symbol":null}]');
    raise exception 'invalid batch accepted';
  exception when not_null_violation then null; end;
  if exists(select 1 from public.market_symbols where symbol='QA-ROLLBACK') then raise exception 'partial batch persisted'; end if;
  if has_function_privilege('anon','public.sync_market_symbols_checked(jsonb)','EXECUTE') or has_function_privilege('authenticated','public.sync_market_symbols_checked(jsonb)','EXECUTE') then raise exception 'public access granted'; end if;
  if not has_function_privilege('service_role','public.sync_market_symbols_checked(jsonb)','EXECUTE') then raise exception 'service role blocked'; end if;
end $$;
rollback;
