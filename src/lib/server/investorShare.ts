/**
 * Server-only crypto for investor share links (phase 2.9).
 *
 * - Tokens are 32 random bytes, URL-safe; only the SHA-256 hash is stored,
 *   so a database read can never reproduce a usable link.
 * - Optional passwords are hashed with scrypt and a per-link salt; plain
 *   passwords are never stored or logged.
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export const INVESTOR_TOKEN_BYTES = 32;

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
