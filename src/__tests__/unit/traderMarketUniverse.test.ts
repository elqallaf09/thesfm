import { describe, expect, it } from 'vitest';
import { getSymbolsForMarketOrSector } from '@/lib/trader/marketCatalog';

describe('trader market and sector symbol universe', () => {
  it('expands the semiconductor universe with required real symbols and metadata', async () => {
    const universe = await getSymbolsForMarketOrSector({ market: 'semiconductors' });

    expect(universe.symbols).toEqual(expect.arrayContaining([
      'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
      'MRVL', 'MCHP', 'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC',
      'COHR', 'UMC', 'GFS', 'WOLF',
    ]));
    expect(universe.symbols.length).toBeGreaterThanOrEqual(28);
    expect(universe.entries.find(entry => entry.symbol === 'NVDA')).toMatchObject({
      selectedSector: 'semiconductors',
      assetType: 'stock',
      providerSymbol: 'NVDA',
      currency: 'USD',
    });
  });

  it('applies the selected market before a sector filter', async () => {
    const bahrainSemis = await getSymbolsForMarketOrSector({
      market: 'bahrain',
      sector: 'Semiconductor Equipment',
    });

    expect(bahrainSemis.symbols).not.toContain('NVDA');
    expect(bahrainSemis.entries.every(entry => entry.selectedMarket === 'bahrain')).toBe(true);
  });

  it('does not let category filtering override the selected market', async () => {
    const qatarStocks = await getSymbolsForMarketOrSector({ market: 'qatar', category: 'stock' });

    expect(qatarStocks.symbols.length).toBeGreaterThan(5);
    expect(qatarStocks.entries.every(entry => entry.selectedMarket === 'qatar')).toBe(true);
    expect(qatarStocks.entries.every(entry => entry.country === 'QA' || entry.symbol.endsWith('.QA'))).toBe(true);
  });
});
