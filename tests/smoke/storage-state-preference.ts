import { readFile } from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

/** Seed one preference without dropping inherited auth/protection state.
 * Runs before context creation, once per test, never on page reload.
 */
export async function withStoragePreference(
  inherited: StorageState | string | undefined,
  baseURL: string,
  name: string,
  value: string,
): Promise<StorageState> {
  let state: StorageState;
  if (typeof inherited === 'string') {
    try {
      state = JSON.parse(await readFile(inherited, 'utf8')) as StorageState;
    } catch {
      // Never log state-file contents, which can contain session credentials.
      throw new Error('Unable to load inherited browser storage state');
    }
  } else {
    state = inherited ?? { cookies: [], origins: [] };
  }
  if (!state || !Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
    throw new Error('Invalid inherited browser storage state');
  }
  const origin = new URL(baseURL).origin;
  const existing = state.origins.find(entry => entry.origin === origin);
  const localStorage = (existing?.localStorage ?? []).filter(entry => entry.name !== name);
  const seeded = { ...existing, origin, localStorage: [...localStorage, { name, value }] };
  return {
    ...state,
    cookies: state.cookies.map(cookie => ({ ...cookie })),
    origins: existing
      ? state.origins.map(entry => entry.origin === origin ? seeded : entry)
      : [...state.origins, seeded],
  };
}
