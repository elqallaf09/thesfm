import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withStoragePreference } from '../../../tests/smoke/storage-state-preference';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));

const origin = 'https://preview.example.test';
const key = 'sfm.globalMarkets.selection';
const cookie = { name: 'fixture-session', value: 'synthetic-only', domain: 'preview.example.test', path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' as const };

beforeEach(() => { vi.clearAllMocks(); });

describe('smoke preference seeding preserves inherited browser state', () => {
  it('preserves cookies and unrelated origins while adding a new origin', async () => {
    const state = { cookies: [cookie], origins: [{ origin: 'https://other.example.test', localStorage: [{ name: 'keep', value: 'yes' }] }] };
    const before = structuredClone(state);
    const seeded = await withStoragePreference(state, `${origin}/global-markets`, key, '["crypto"]');
    expect(seeded.cookies).toEqual([cookie]);
    expect(seeded.origins).toEqual([...state.origins, { origin, localStorage: [{ name: key, value: '["crypto"]' }] }]);
    expect(state).toEqual(before);
  });

  it('replaces only the selected key, retaining login storage and extended origin fields', async () => {
    const indexedDB = [{ name: 'fixture-db', version: 1, stores: [] }];
    const state = { cookies: [cookie], origins: [{ origin, indexedDB, localStorage: [
      { name: 'fixture-auth', value: 'synthetic-only' },
      { name: key, value: 'old' },
      { name: 'sfm_lang', value: 'fr' },
    ] }] };
    const before = structuredClone(state);
    const seeded = await withStoragePreference(state, origin, key, 'new');
    expect(seeded.cookies).toEqual(state.cookies);
    expect(seeded.origins[0]).toEqual({ origin, indexedDB, localStorage: [
      { name: 'fixture-auth', value: 'synthetic-only' }, { name: 'sfm_lang', value: 'fr' }, { name: key, value: 'new' },
    ] });
    expect(state).toEqual(before);
  });

  it('loads configured file-based state instead of replacing its cookies with an empty list', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ cookies: [cookie], origins: [] }));
    const seeded = await withStoragePreference('/tmp/fixture-storage.json', origin, key, 'new');
    expect(readFile).toHaveBeenCalledWith('/tmp/fixture-storage.json', 'utf8');
    expect(seeded.cookies).toEqual([cookie]);
    expect(seeded.origins).toEqual([{ origin, localStorage: [{ name: key, value: 'new' }] }]);
  });

  it('supports a local run with no inherited state', async () => {
    expect(await withStoragePreference(undefined, origin, key, 'new')).toEqual({
      cookies: [], origins: [{ origin, localStorage: [{ name: key, value: 'new' }] }],
    });
  });

  it('fails closed on unreadable or malformed files without exposing their contents', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('sensitive fixture detail'));
    await expect(withStoragePreference('/tmp/missing.json', origin, key, 'new')).rejects.toThrow('Unable to load inherited browser storage state');
    vi.mocked(readFile).mockResolvedValueOnce('{synthetic-secret-invalid-json');
    await expect(withStoragePreference('/tmp/invalid.json', origin, key, 'new')).rejects.toThrow('Unable to load inherited browser storage state');
  });

  it('does not silently discard a structurally invalid inherited state', async () => {
    for (const value of [null, {}, { origins: [] }, { cookies: [], origins: null }]) {
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(value));
      await expect(withStoragePreference('/tmp/invalid.json', origin, key, 'new')).rejects.toThrow('Invalid inherited browser storage state');
    }
  });
});
