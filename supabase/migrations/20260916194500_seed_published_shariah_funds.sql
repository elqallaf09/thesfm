-- Add the Shariah-designated ETFs already shown by the public Shariah universe
-- to the persisted market catalog so they receive the same evidence refresh,
-- provenance, retry and audit trail as other funds. This migration does not
-- assign a compliance verdict; the refresh worker verifies each official source.

insert into public.market_symbols (
  symbol,
  provider_symbol,
  name,
  asset_type,
  exchange,
  country,
  currency,
  source,
  is_active,
  market,
  display_symbol,
  company_name_en,
  sector,
  shariah_status,
  shariah_screening_data,
  shariah_next_refresh_at
)
values
  ('SPUS', 'SPUS', 'SP Funds S&P 500 Sharia Industry Exclusions ETF', 'etf', 'NYSE Arca', 'US', 'USD', 'shariah_published_fund_seed', true, 'Funds & ETFs', 'SPUS', 'SP Funds S&P 500 Sharia Industry Exclusions ETF', 'sharia_etf', 'unclassified', '{}'::jsonb, now()),
  ('HLAL', 'HLAL', 'Wahed FTSE USA Shariah ETF', 'etf', 'NASDAQ', 'US', 'USD', 'shariah_published_fund_seed', true, 'Funds & ETFs', 'HLAL', 'Wahed FTSE USA Shariah ETF', 'sharia_etf', 'unclassified', '{}'::jsonb, now()),
  ('UMMA', 'UMMA', 'Wahed Dow Jones Islamic World ETF', 'etf', 'NASDAQ', 'US', 'USD', 'shariah_published_fund_seed', true, 'Funds & ETFs', 'UMMA', 'Wahed Dow Jones Islamic World ETF', 'sharia_etf', 'unclassified', '{}'::jsonb, now()),
  ('SPRE', 'SPRE', 'SP Funds S&P Global REIT Sharia ETF', 'etf', 'NYSE Arca', 'US', 'USD', 'shariah_published_fund_seed', true, 'Funds & ETFs', 'SPRE', 'SP Funds S&P Global REIT Sharia ETF', 'sharia_etf', 'unclassified', '{}'::jsonb, now()),
  ('SPSK', 'SPSK', 'SP Funds Dow Jones Global Sukuk ETF', 'etf', 'NYSE Arca', 'US', 'USD', 'shariah_published_fund_seed', true, 'Funds & ETFs', 'SPSK', 'SP Funds Dow Jones Global Sukuk ETF', 'sharia_etf', 'unclassified', '{}'::jsonb, now())
on conflict do nothing;
