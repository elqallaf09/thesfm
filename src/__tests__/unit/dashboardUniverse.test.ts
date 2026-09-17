import { describe, expect, it } from 'vitest';
import { prioritizeDashboardUniverse } from '@/lib/trader/dashboardUniverse';

describe('dashboard research sample', () => {
  it('prioritizes liquid stock identities without removing the directory', () => {
    const rows = [{ symbol: 'AACW', name: 'Acquisition Warrants' }, { symbol: 'A', name: 'Agilent' },
      { symbol: 'MSFT', name: 'Microsoft' }, { symbol: 'AAPL', name: 'Apple' }];
    expect(prioritizeDashboardUniverse(rows, 'us-stocks').map(row => row.symbol)).toEqual(['AAPL', 'MSFT', 'A', 'AACW']);
    expect(rows[0].symbol).toBe('AACW');
  });
  it('keeps regional samples within the supplied market universe', () => {
    const rows = [{ symbol: 'NBK.KW' }, { symbol: 'KFH.KW' }];
    expect(prioritizeDashboardUniverse(rows, 'kuwait', ['KFH.KW', 'AAPL'])).toEqual([rows[1], rows[0]]);
  });
});
