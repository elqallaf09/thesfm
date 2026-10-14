import * as SecureStore from 'expo-secure-store';
import { authChanged } from './navigation';

export type Session = { accessToken: string; refreshToken: string; expiresAt: number };
const versions = new Map<string, number>();
const writes = new Map<string, Promise<unknown>>();
const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export function sessionVersion(key: string) { return versions.get(key) ?? 0; }
export function assertSessionVersion(key: string, version: number) {
  if (sessionVersion(key) !== version) throw new Error('SESSION_CHANGED');
}
export function beginSessionChange(key: string) {
  const version = sessionVersion(key) + 1;
  versions.set(key, version);
  return version;
}
function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const job = (writes.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
  writes.set(key, job);
  void job.finally(() => { if (writes.get(key) === job) writes.delete(key); }).catch(() => undefined);
  return job;
}
export function parseSession(value: unknown): Session {
  const session = value as Partial<Session> | null;
  if (!session || typeof session.accessToken !== 'string' || !session.accessToken ||
    typeof session.refreshToken !== 'string' || !session.refreshToken ||
    typeof session.expiresAt !== 'number' || !Number.isFinite(session.expiresAt)) throw new Error('SESSION_EXPIRED');
  return session as Session;
}
export async function storedSession(key: string, version = sessionVersion(key)) {
  const value = await serialize(key, () => SecureStore.getItemAsync(key));
  assertSessionVersion(key, version);
  if (!value) throw new Error('SESSION_EXPIRED');
  try { return parseSession(JSON.parse(value)); } catch { throw new Error('SESSION_EXPIRED'); }
}
export function persistSession(key: string, session: Session, version: number) {
  return serialize(key, async () => {
    assertSessionVersion(key, version);
    await SecureStore.setItemAsync(key, JSON.stringify(parseSession(session)), secureOptions);
    assertSessionVersion(key, version);
  });
}
export async function clearSession(key: string, expectedVersion = sessionVersion(key)) {
  assertSessionVersion(key, expectedVersion);
  beginSessionChange(key);
  // Queue deletion before notifying screens. A refresh already writing to the
  // key finishes before this deletion; a late refresh cannot enqueue a save.
  const deletion = serialize(key, () => SecureStore.deleteItemAsync(key));
  authChanged();
  await deletion;
}
