import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import type { PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { MobileRequestError, type MobileSessionClient } from './session';
WebBrowser.maybeCompleteAuthSession();
const flights = new Map<string, Promise<void>>();
async function randomHex() { return Array.from(await Crypto.getRandomBytesAsync(32), value => value.toString(16).padStart(2, '0')).join(''); }
export async function startGoogleSignIn(product: PhoneProduct, supabaseUrl: string, client: MobileSessionClient) {
  if (!supabaseUrl) throw new MobileRequestError('AUTH_NOT_CONFIGURED');
  const verifier = await randomHex();
  const state = await randomHex();
  const challenge = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const callback = `the-sfm-${product}://auth/callback?state=${state}`;
  const key = `sfm-${product}-oauth`;
  await SecureStore.setItemAsync(key, JSON.stringify({ verifier, state, createdAt: Date.now() }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google'); url.searchParams.set('redirect_to', callback);
  url.searchParams.set('code_challenge', challenge); url.searchParams.set('code_challenge_method', 's256');
  const result = await WebBrowser.openAuthSessionAsync(url.toString(), `the-sfm-${product}://auth/callback`);
  if (result.type === 'success') await completeGoogleSignIn(result.url, product, client);
  else await SecureStore.deleteItemAsync(key);
}
export async function completeGoogleSignIn(input: string, product: PhoneProduct, client: MobileSessionClient) {
  if (flights.has(product)) return flights.get(product)!;
  const task = (async () => {
    const url = new URL(input);
    if (url.protocol !== `the-sfm-${product}:` || url.hostname !== 'auth' || url.pathname !== '/callback') throw new MobileRequestError('OAUTH_FAILED');
    const key = `sfm-${product}-oauth`;
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) throw new MobileRequestError('OAUTH_FAILED');
    const pending = JSON.parse(raw) as { verifier: string; state: string; createdAt: number };
    const code = url.searchParams.get('code');
    if (!code || url.searchParams.get('state') !== pending.state || Date.now() - pending.createdAt > 600_000) throw new MobileRequestError('OAUTH_FAILED');
    try { await client.exchangeCode(code, pending.verifier); }
    finally { await SecureStore.deleteItemAsync(key); }
  })();
  flights.set(product, task);
  try { await task; } finally { flights.delete(product); }
}
