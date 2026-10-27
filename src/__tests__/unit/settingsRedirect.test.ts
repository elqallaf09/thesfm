import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (href: string): never => {
    throw Object.assign(new Error('redirect'), { href });
  },
}));

import SettingsPage from '@/app/settings/page';

describe('settings compatibility redirect', () => {
  it('uses the canonical profile without adding an empty query', async () => {
    await expect(SettingsPage({ searchParams: Promise.resolve({}) }))
      .rejects.toMatchObject({ href: '/profile' });
  });

  it('preserves nested destinations and structured query values', async () => {
    await expect(SettingsPage({ searchParams: Promise.resolve({
      section: 'security',
      filters: '{"range":"1M"}',
      return: '/watchlist?sort=newest',
    }) })).rejects.toMatchObject({
      href: '/profile?section=security&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest',
    });
  });

  it('retains repeated and empty values while omitting absent parameters', async () => {
    await expect(SettingsPage({ searchParams: Promise.resolve({
      tag: ['one', 'two'],
      empty: '',
      absent: undefined,
    }) })).rejects.toMatchObject({ href: '/profile?tag=one&tag=two&empty=' });
  });

  it('keeps external-looking query values as data on the fixed internal destination', async () => {
    await expect(SettingsPage({ searchParams: Promise.resolve({
      return: 'https://outside.example/path?next=//another.example#details',
    }) })).rejects.toMatchObject({
      href: '/profile?return=https%3A%2F%2Foutside.example%2Fpath%3Fnext%3D%2F%2Fanother.example%23details',
    });
  });
});
