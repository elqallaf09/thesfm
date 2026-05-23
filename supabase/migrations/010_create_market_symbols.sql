CREATE TABLE IF NOT EXISTS public.market_symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  provider_symbol text NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'stock',
  exchange text,
  country text,
  currency text,
  source text DEFAULT 'manual',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (symbol, asset_type, provider_symbol)
);

CREATE INDEX IF NOT EXISTS market_symbols_symbol_idx
  ON public.market_symbols (symbol);

CREATE INDEX IF NOT EXISTS market_symbols_name_idx
  ON public.market_symbols (name);

CREATE INDEX IF NOT EXISTS market_symbols_asset_type_idx
  ON public.market_symbols (asset_type);

CREATE INDEX IF NOT EXISTS market_symbols_exchange_idx
  ON public.market_symbols (exchange);

CREATE INDEX IF NOT EXISTS market_symbols_provider_symbol_idx
  ON public.market_symbols (provider_symbol);

ALTER TABLE public.market_symbols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active market symbols" ON public.market_symbols;
CREATE POLICY "Anyone can read active market symbols"
  ON public.market_symbols FOR SELECT
  USING (is_active = true);

INSERT INTO public.market_symbols
  (symbol, provider_symbol, name, asset_type, exchange, country, currency, source)
VALUES
  ('AAPL', 'AAPL', 'Apple Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('MSFT', 'MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('NVDA', 'NVDA', 'NVIDIA Corporation', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('TSLA', 'TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('GOOGL', 'GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('AMZN', 'AMZN', 'Amazon.com Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('META', 'META', 'Meta Platforms Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('NFLX', 'NFLX', 'Netflix Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('AMD', 'AMD', 'Advanced Micro Devices Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('INTC', 'INTC', 'Intel Corporation', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('JPM', 'JPM', 'JPMorgan Chase & Co.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('BAC', 'BAC', 'Bank of America Corporation', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('V', 'V', 'Visa Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('MA', 'MA', 'Mastercard Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('DIS', 'DIS', 'The Walt Disney Company', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('KO', 'KO', 'Coca-Cola Company', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('PEP', 'PEP', 'PepsiCo Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('MCD', 'MCD', 'McDonald''s Corporation', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('WMT', 'WMT', 'Walmart Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('COST', 'COST', 'Costco Wholesale Corporation', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('NKE', 'NKE', 'Nike Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('ORCL', 'ORCL', 'Oracle Corporation', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('CRM', 'CRM', 'Salesforce Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('PYPL', 'PYPL', 'PayPal Holdings Inc.', 'stock', 'NASDAQ', 'US', 'USD', 'seed'),
  ('UBER', 'UBER', 'Uber Technologies Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('SHOP', 'SHOP', 'Shopify Inc.', 'stock', 'NYSE', 'US', 'USD', 'seed'),
  ('SPY', 'SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE Arca', 'US', 'USD', 'seed'),
  ('QQQ', 'QQQ', 'Invesco QQQ Trust', 'etf', 'NASDAQ', 'US', 'USD', 'seed'),
  ('VOO', 'VOO', 'Vanguard S&P 500 ETF', 'etf', 'NYSE Arca', 'US', 'USD', 'seed'),
  ('VTI', 'VTI', 'Vanguard Total Stock Market ETF', 'etf', 'NYSE Arca', 'US', 'USD', 'seed'),
  ('IWM', 'IWM', 'iShares Russell 2000 ETF', 'etf', 'NYSE Arca', 'US', 'USD', 'seed'),
  ('GLD', 'GLD', 'SPDR Gold Shares', 'etf', 'NYSE Arca', 'US', 'USD', 'seed'),
  ('SLV', 'SLV', 'iShares Silver Trust', 'etf', 'NYSE Arca', 'US', 'USD', 'seed'),
  ('BTC', 'BTC-USD', 'Bitcoin', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('ETH', 'ETH-USD', 'Ethereum', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('SOL', 'SOL-USD', 'Solana', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('BNB', 'BNB-USD', 'Binance Coin', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('XRP', 'XRP-USD', 'XRP', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('ADA', 'ADA-USD', 'Cardano', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('DOGE', 'DOGE-USD', 'Dogecoin', 'crypto', 'Crypto', 'Global', 'USD', 'seed'),
  ('XAU', 'GC=F', 'Gold', 'gold', 'COMEX', 'Global', 'USD', 'seed'),
  ('GOLD', 'GC=F', 'Gold Futures', 'gold', 'COMEX', 'US', 'USD', 'seed'),
  ('SILVER', 'SI=F', 'Silver Futures', 'commodity', 'COMEX', 'US', 'USD', 'seed'),
  ('OIL', 'CL=F', 'Crude Oil Futures', 'commodity', 'NYMEX', 'US', 'USD', 'seed'),
  ('EURUSD', 'EURUSD=X', 'Euro / US Dollar', 'forex', 'FX', 'Global', 'USD', 'seed'),
  ('GBPUSD', 'GBPUSD=X', 'British Pound / US Dollar', 'forex', 'FX', 'Global', 'USD', 'seed'),
  ('USDJPY', 'USDJPY=X', 'US Dollar / Japanese Yen', 'forex', 'FX', 'Global', 'JPY', 'seed'),
  ('USDCHF', 'USDCHF=X', 'US Dollar / Swiss Franc', 'forex', 'FX', 'Global', 'CHF', 'seed'),
  ('AUDUSD', 'AUDUSD=X', 'Australian Dollar / US Dollar', 'forex', 'FX', 'Global', 'USD', 'seed'),
  ('USDCAD', 'USDCAD=X', 'US Dollar / Canadian Dollar', 'forex', 'FX', 'Global', 'CAD', 'seed')
ON CONFLICT (symbol, asset_type, provider_symbol) DO NOTHING;
