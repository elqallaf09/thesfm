import 'server-only';
import { normalizeInvestment, type DbInvestmentRow } from '@/lib/investments/investmentUtils';
import { portfolioCurrency } from '@/lib/investments/recordedPortfolio';
import { tvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';
import { tvDb } from './devices';

export async function ownedTvPortfolio(userId: string, requestedCurrency?: string | null) {
  const db = tvDb();
  // A service role bypasses RLS: resolve this owner from the active TV device,
  // then repeat its owner constraint on every page. Never accept a client owner.
  const { data: profile, error: profileError } = await db.from('profiles').select('preferred_currency,default_currency,currency').eq('id', userId).maybeSingle();
  if (profileError) throw new Error('PORTFOLIO_UNAVAILABLE');
  const currency = portfolioCurrency(requestedCurrency) || portfolioCurrency(profile?.preferred_currency) || portfolioCurrency(profile?.default_currency) || portfolioCurrency(profile?.currency) || 'KWD';
  const rows: DbInvestmentRow[] = [];
  const batch = 500;
  // Stable ordering and an extra empty-page check avoid a silent 1,000-row cap.
  for (let offset = 0; ; offset += batch) {
    const { data, error } = await db.from('investment_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + batch - 1);
    if (error) throw new Error('PORTFOLIO_UNAVAILABLE');
    rows.push(...(data || []) as DbInvestmentRow[]);
    if (!data || data.length < batch) break;
    if (rows.length >= 10000) throw new Error('PORTFOLIO_TOO_LARGE');
  }
  return tvPortfolioSnapshot(rows.map(row => normalizeInvestment(row)), currency);
}
