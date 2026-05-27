export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function normalizeSecurityAnswer(answer: string) {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function hashSecurityAnswer(answer: string, salt: string) {
  const normalized = normalizeSecurityAnswer(answer);
  if (!normalized) return '';
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Secure hashing is not available in this browser.');
  const source = `${salt.trim().toLowerCase()}::${normalized}`;
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
