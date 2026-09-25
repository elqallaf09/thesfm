import 'server-only';
import { unstable_cache } from 'next/cache';
import { loadSecCompanyDirectory, loadSecCompanyFacts } from '@/lib/sharia-research/secData';
import { emptyGrowthFundamentals, parseGrowthCompanyFacts, type GrowthFundamentals } from './growthFundamentalsCore';

const pending = new Map<string, Promise<GrowthFundamentals>>();
const failures = new Map<string, { expires: number; value: GrowthFundamentals }>();
let directory: ReturnType<typeof loadSecCompanyDirectory> | null = null;
let directoryExpires = 0;
function companyDirectory() {
  if (!directory || Date.now() > directoryExpires) {
    directoryExpires = Date.now() + 86_400_000;
    directory = loadSecCompanyDirectory(AbortSignal.timeout(10_000)).catch(error => { directory = null; throw error; });
  }
  return directory;
}
const loadReported = unstable_cache(async (symbol: string) => {
  const companies = await companyDirectory();
  const matches = companies.filter(company => company.ticker === symbol);
  if (matches.length !== 1) return emptyGrowthFundamentals(symbol, 'issuer_not_found');
  const company = matches[0];
  const facts = await loadSecCompanyFacts(company.cik, AbortSignal.timeout(12_000));
  const result = parseGrowthCompanyFacts(facts.payload, symbol, company.cik);
  return { ...result, retrievedAt: facts.retrievedAt };
}, ['growth-reported-annual-v2'], { revalidate: 43_200 });

export function loadGrowthFundamentals(symbol: string): Promise<GrowthFundamentals> {
  const failed = failures.get(symbol);
  if (failed && failed.expires > Date.now()) return Promise.resolve(failed.value);
  const active = pending.get(symbol);
  if (active) return active;
  const task = loadReported(symbol).catch(() => {
    const value = emptyGrowthFundamentals(symbol, 'source_unavailable');
    if (failures.size >= 250) failures.delete(failures.keys().next().value!);
    failures.set(symbol, { expires: Date.now() + 60_000, value });
    return value;
  }).finally(() => pending.delete(symbol));
  pending.set(symbol, task);
  return task;
}
export async function loadGrowthFundamentalsBatch(symbols: string[]) {
  const items: GrowthFundamentals[] = [];
  // Bound parallel source work even when a caller requests a full batch.
  for (let index = 0; index < symbols.length; index += 3) {
    items.push(...await Promise.all(symbols.slice(index, index + 3).map(loadGrowthFundamentals)));
  }
  return items;
}
