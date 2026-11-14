/** Shared by official-directory, CSV and FMP imports. Never deletes listings. */
export function prepareSymbolSync(input) {
  if (!Array.isArray(input) || input.length === 0) throw new Error('symbol_sync_empty');
  const seen = new Set();
  return input.map(raw => {
    const symbol = String(raw.symbol ?? '').trim().toUpperCase();
    const rawExchange = String(raw.exchange ?? '').trim().toUpperCase();
    const exchange = ({ BOURSA_KUWAIT: 'Boursa Kuwait', KUWAIT: 'Boursa Kuwait', 'BOURSA KUWAIT': 'Boursa Kuwait', 'NYSE ARCA': 'NYSE Arca', CRYPTO: 'Crypto' })[rawExchange] || rawExchange;
    if (!symbol || !exchange || !String(raw.name ?? '').trim()) throw new Error('symbol_sync_missing_identity');
    const key = JSON.stringify([exchange, symbol]);
    if (seen.has(key)) throw new Error('symbol_sync_duplicate_listing');
    seen.add(key);
    return { ...raw, symbol, exchange };
  }).sort((a, b) => a.exchange.localeCompare(b.exchange, 'en') || a.symbol.localeCompare(b.symbol, 'en'));
}

export async function syncMarketSymbols(records, { url, serviceRoleKey, fetchImpl = fetch }) {
  const rows = prepareSymbolSync(records);
  if (!url || !serviceRoleKey) throw new Error('symbol_sync_missing_credentials');
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/rpc/sync_market_symbols_checked`, {
    method: 'POST',
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_rows: rows }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`symbol_sync_http_${response.status}`);
  const report = await response.json();
  if (report.input_count !== rows.length || report.matched_after !== rows.length
      || report.after_count !== report.before_count + report.inserted_count) throw new Error('symbol_sync_count_mismatch');
  return report;
}
