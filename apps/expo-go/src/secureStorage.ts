import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SessionStorage } from './session';
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
// Browser QA uses memory only; account tokens are never written to browser storage.
const browserMemory = new Map<string, string>();
/** SecureStore has per-item size limits on some iOS versions. The manifest is committed last. */
export const sessionStorage: SessionStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') return browserMemory.get(key) ?? null;
    const manifest = await SecureStore.getItemAsync(key, options);
    if (!manifest?.startsWith('chunks:')) return manifest;
    const parts = manifest.split(':');
    const count = Number(parts[2]);
    if (!/^[a-z0-9]+$/.test(parts[1]) || !Number.isInteger(count) || count < 1 || count > 64) return null;
    const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.${parts[1]}.${index}`, options)));
    return chunks.some(chunk => chunk === null) ? null : chunks.join('');
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') { browserMemory.set(key, value); return; }
    const old = await SecureStore.getItemAsync(key, options);
    const revision = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const chunks = value.match(/[\s\S]{1,1500}/g) ?? [''];
    if (chunks.length > 64) throw new Error('SESSION_TOO_LARGE');
    for (let index = 0; index < chunks.length; index++) await SecureStore.setItemAsync(`${key}.${revision}.${index}`, chunks[index], options);
    await SecureStore.setItemAsync(key, `chunks:${revision}:${chunks.length}`, options);
    if (old?.startsWith('chunks:')) await deleteChunks(key, old);
  },
  async removeItem(key) {
    if (Platform.OS === 'web') { browserMemory.delete(key); return; }
    const manifest = await SecureStore.getItemAsync(key, options);
    await SecureStore.deleteItemAsync(key, options);
    if (manifest?.startsWith('chunks:')) await deleteChunks(key, manifest);
  },
};
async function deleteChunks(key: string, manifest: string) {
  const [, revision, rawCount] = manifest.split(':');
  const count = Math.min(64, Number(rawCount) || 0);
  if (!/^[a-z0-9]+$/.test(revision)) return;
  await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${revision}.${index}`, options)));
}
