import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), verify: vi.fn() }));
vi.mock('./qatar-public-client', async importOriginal => {
  const actual = await importOriginal<typeof import('./qatar-public-client')>();
  return { ...actual, readQatarPublicJson: mocks.read, verifyQatarDataset: mocks.verify };
});
import { getQatarPropertyLocations } from './qatar-open-data';
const row = (index: number) => ({ municipality_name: 'Synthetic Municipality', sm_lbldy: 'بلدية اختبار', district_name: `Synthetic District ${index}`, sm_lmntq: `حي اختبار ${index}` });
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ metadataUpdatedAt: null }); });

describe('Qatar official directory pagination', () => {
  it('does not mistake the API page-capped grouped total_count for the entire directory', async () => {
    mocks.read.mockResolvedValueOnce({ total_count: 100, results: Array.from({ length: 100 }, (_, index) => row(index)) })
      .mockResolvedValueOnce({ total_count: 1, results: [row(100)] });
    const locations = await getQatarPropertyLocations();
    expect(locations).toHaveLength(101);
    expect(locations[100].district).toBe('Synthetic District 100');
    expect(mocks.read).toHaveBeenCalledTimes(2);
    expect(mocks.read.mock.calls[1][1]).toMatchObject({ offset: '100', limit: '100', order_by: 'municipality_name,sm_lbldy,district_name,sm_lmntq' });
  });
  it('requires the end of grouped pagination and refuses a truncated final full page', async () => {
    mocks.read.mockImplementation(async (_resource, query: { offset: string }) => ({ total_count: 100, results: Array.from({ length: 100 }, (_, index) => row(Number(query.offset) + index)) }));
    await expect(getQatarPropertyLocations()).rejects.toThrow('SOURCE_DIRECTORY_TRUNCATED');
    expect(mocks.read).toHaveBeenCalledTimes(5);
  });
  it('deduplicates bilingual variants without using duplicate count as a stop signal', async () => {
    mocks.read.mockResolvedValueOnce({ total_count: 100, results: Array.from({ length: 100 }, (_, index) => ({ ...row(0), sm_lmntq: `Arabic variant ${index}` })) })
      .mockResolvedValueOnce({ total_count: 0, results: [] });
    expect(await getQatarPropertyLocations()).toHaveLength(1);
    expect(mocks.read).toHaveBeenCalledTimes(2);
  });
});
