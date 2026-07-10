import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { researchIdempotencyKey } from '@/lib/sharia-research/jobService';

const input = {
  userId: 'user-1',
  normalizedQuery: 'emirates nbd',
  canonicalId: 'DFM:ENBD',
  methodologyId: 'msci-islamic-index-series-assets',
  methodologyVersion: '2025-07',
};

describe('Sharia research job idempotency', () => {
  it('coalesces duplicate forced requests within one second but permits a fresh retry afterward', () => {
    const first = researchIdempotencyKey({ ...input, forceRefresh: true, now: new Date('2026-07-10T12:00:01.100Z') });
    const duplicate = researchIdempotencyKey({ ...input, forceRefresh: true, now: new Date('2026-07-10T12:00:01.900Z') });
    const retry = researchIdempotencyKey({ ...input, forceRefresh: true, now: new Date('2026-07-10T12:00:02.100Z') });

    expect(duplicate).toBe(first);
    expect(retry).not.toBe(first);
  });

  it('continues to coalesce ordinary searches during the existing hourly cache window', () => {
    const first = researchIdempotencyKey({ ...input, now: new Date('2026-07-10T12:00:01.000Z') });
    const duplicate = researchIdempotencyKey({ ...input, now: new Date('2026-07-10T12:59:59.000Z') });
    expect(duplicate).toBe(first);
  });
});
