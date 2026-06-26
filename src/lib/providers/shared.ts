export type ProviderApiStatus =
  | 'success'
  | 'not_configured'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_request';

export type ProviderApiResponse<T> = {
  status: ProviderApiStatus;
  provider: 'finnhub' | 'fmp' | null;
  data: T;
  cached: boolean;
  stale: boolean;
  lastSuccessfulUpdate: string | null;
  messageCode: string | null;
};

export class ProviderError extends Error {
  status: ProviderApiStatus;
  messageCode: string;
  providerStatus?: number;
  providerMessage?: string;

  constructor(status: ProviderApiStatus, messageCode: string, providerStatus?: number, providerMessage?: string) {
    super(messageCode);
    this.name = 'ProviderError';
    this.status = status;
    this.messageCode = messageCode;
    this.providerStatus = providerStatus;
    this.providerMessage = providerMessage;
  }
}

export function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function shortText(value: unknown, maxLength = 320) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

export function safeExternalUrl(value: unknown) {
  const text = shortText(value, 1000);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function stableId(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
  return normalized || fallback;
}

export function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function mapHttpProviderStatus(status: number): ProviderApiStatus {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  if (status >= 400 && status < 500) return 'provider_error';
  return 'provider_error';
}

export function messageCodeForStatus(status: ProviderApiStatus) {
  if (status === 'not_configured') return 'provider_not_configured';
  if (status === 'unauthorized' || status === 'forbidden') return 'provider_access_denied';
  if (status === 'rate_limited') return 'provider_rate_limited';
  if (status === 'invalid_request') return 'provider_invalid_request';
  if (status === 'provider_error') return 'provider_temporarily_unavailable';
  return null;
}
