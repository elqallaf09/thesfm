/**
 * Server-only crypto for investor share links (phase 2.9).
 *
 * - Tokens are 32 random bytes, URL-safe; only the SHA-256 hash is stored,
 *   so a database read can never reproduce a usable link.
 * - Optional passwords are hashed with scrypt and a per-link salt; plain
 *   passwords are never stored or logged.
 */

import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'crypto';

export const INVESTOR_TOKEN_BYTES = 32;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
} as const;
const MAX_PASSWORD_BYTES = 1_024;

export function generateInvestorToken(): string {
  return randomBytes(INVESTOR_TOKEN_BYTES).toString('base64url');
}

export function hashInvestorToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function hashInvestorPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 32).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyInvestorPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = String(stored ?? '').split(':');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  try {
    const derived = scryptSync(password, salt, 32);
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (derived.length !== expectedBuffer.length) return false;
    return timingSafeEqual(derived, expectedBuffer);
  } catch {
    return false;
  }
}

export async function verifyInvestorPasswordAsync(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, expected] = String(stored ?? '').split(':');
  if (
    scheme !== 'scrypt'
    || !/^[0-9a-f]{32}$/i.test(salt ?? '')
    || !/^[0-9a-f]{64}$/i.test(expected ?? '')
    || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
  ) {
    return false;
  }

  return new Promise(resolve => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, derived) => {
      if (error) {
        resolve(false);
        return;
      }
      const expectedBuffer = Buffer.from(expected, 'hex');
      resolve(derived.length === expectedBuffer.length && timingSafeEqual(derived, expectedBuffer));
    });
  });
}
