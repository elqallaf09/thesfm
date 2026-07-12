import { describe, expect, it } from 'vitest';
import { detectReceiptMime, exceedsReceiptAggregateLimit, mapWithConcurrency } from '@/lib/server/uploadSafety';

describe('receipt upload safety', () => {
  it('detects signatures rather than trusting filenames', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'not-really.txt');
    expect(await detectReceiptMime(png)).toBe('image/png');
  });

  it('rejects aggregate payloads above 20 MiB', () => {
    const files = [new File([new Uint8Array(11 * 1024 * 1024)], 'a.pdf'), new File([new Uint8Array(10 * 1024 * 1024)], 'b.pdf')];
    expect(exceedsReceiptAggregateLimit(files)).toBe(true);
  });

  it('preserves result order under bounded concurrency', async () => {
    expect(await mapWithConcurrency([3, 1, 2], 2, async value => value * 2)).toEqual([6, 2, 4]);
  });
});
