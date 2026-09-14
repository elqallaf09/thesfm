import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enrichShariahScreeningData } from '@/lib/market/shariahFundamentals';
import { analyzeShariaEvidence } from '@/lib/sharia-research/shariaAnalyzer';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import { catalogPatchForResearch } from '@/lib/sharia-research/catalogSync';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';
import { validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { loadSecCompanyFacts, loadSecSubmissions } from '@/lib/sharia-research/secData';

// Explicit opt-in. Never executed against Supabase/production, never takes a key.
const enabled = process.env.SFM_LIVE_SEC_PROBE === '1';
const connection = 'postgresql://postgres:postgres@127.0.0.1:5432/shariah_verify';
function sql(query: string) { return execFileSync('psql', [connection, '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8' }).trim(); }
function literal(value: unknown) { return `'${String(value).replaceAll("'", "''")}'`; }
const symbols = [['AAPL','NASDAQ'],['JPM','NYSE'],['KO','NYSE'],['MSFT','NASDAQ'],['NVDA','NASDAQ']] as const;
describe.skipIf(!enabled)('live public SEC evidence → actual SQL persistence → public catalog', () => {
  it.each(symbols)('%s uses source-backed facts and round-trips its actual decision', async (symbol, exchange) => {
    const fresh = await enrichShariahScreeningData({ symbol, exchange, country: 'US', signal: AbortSignal.timeout(90_000) });
    mkdirSync('artifacts/shariah', { recursive: true });
    const result = analyzeShariaEvidence({ security: fresh.security, documents: fresh.documents, financialValues: fresh.financialValues, methodology: SFM_FTSE_POINT_IN_TIME });
    const patch = catalogPatchForResearch(result);
    const period = fresh.financialValues.find(value => value.normalizedField === 'total_assets')?.periodEnd;
    const raw = fresh.security.cik ? await loadSecCompanyFacts(fresh.security.cik) : null;
    const submissions = fresh.security.cik ? await loadSecSubmissions(fresh.security.cik) : null;
    const sourceDiagnostics = { sic: submissions?.payload.sic, sicDescription: submissions?.payload.sicDescription,
      tags: Object.entries(raw?.payload.facts?.['us-gaap'] ?? {}).filter(([tag]) => /Debt|Borrow|CommercialPaper|InterestIncome|InvestmentIncome|InterestAnd|RevenuesNetOf/i.test(tag)).map(([tag, concept]) => ({
        tag, description: concept.description, units: Object.fromEntries(Object.entries(concept.units ?? {}).map(([unit, rows]) => [unit, rows.filter(row => row.end === period).slice(-4)])),
      })).filter(item => Object.values(item.units).some(rows => rows.length)),
      businessText: fresh.documents.filter(document => document.sourceType === 'annual_report').map(document => ({ sourceUrl: document.sourceUrl,
        beginning: document.extractedText.slice(0, 14000),
        bankContexts: [...document.extractedText.matchAll(/.{0,160}(?:holding company|commercial banking|principal business).{0,240}/gi)].slice(0, 8).map(match => match[0]) })),
    };
    writeFileSync(`artifacts/shariah/${symbol}.json`, JSON.stringify({ symbol, exchange, fetchedAt: new Date().toISOString(),
      errors: fresh.errors, financialValues: fresh.financialValues, patch, sourceDiagnostics,
      sourceCount: fresh.documents.length, missingFields: result.missingFinancialFields }, null, 2));
    // No test rating is predetermined. A real provider failure is a failed live proof.
    expect(fresh.documents.length, JSON.stringify(fresh.errors)).toBeGreaterThan(0);
    expect(fresh.financialValues.length).toBeGreaterThan(0);
    expect(fresh.financialValues.every(value => validFinancialValue(value))).toBe(true);
    const id = randomUUID(); const run = randomUUID();
    sql(`insert into public.market_symbols(id,symbol,provider_symbol,name,exchange) values (${literal(id)},${literal(symbol)},${literal(symbol)},${literal(fresh.security.name)},${literal(exchange)});
      insert into public.shariah_refresh_runs(id) values (${literal(run)});`);
    const claimed = JSON.parse(sql(`select row_to_json(m) from public.claim_shariah_refresh_batch(${literal(run)},1,true,${literal(id)}) m;`));
    expect(Number(sql(`select public.finish_shariah_refresh(${literal(run)},${literal(id)},${literal(claimed.updated_at)}::timestamptz,${literal(JSON.stringify(patch))}::jsonb,null);`))).toBe(1);
    const saved = JSON.parse(sql(`select row_to_json(m) from public.market_symbols m where id=${literal(id)};`));
    expect(saved.shariah_screening_data).toEqual(patch.shariah_screening_data);
    expect(saved.shariah_status).toBe(patch.shariah_status);
    expect(publicCatalogItem(saved).shariahStatus).toBe(patch.shariah_status);
    sql(`update public.shariah_refresh_runs set status='completed',finished_at=clock_timestamp(),result='{"updated":1}' where id=${literal(run)};`);
  }, 110_000);
});
