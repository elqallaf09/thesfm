import type { RealEstateAssetInput } from './real-estate';

const TYPES = ['LAND', 'APARTMENT', 'HOUSE', 'COMMERCIAL', 'BUILDING'];
const STRINGS = ['region', 'city', 'municipality', 'district', 'parcelIdentifier', 'address', 'purchaseDate', 'purchaseCurrency'] as const;

/** Project allowlisted primitive facts, never forward an arbitrary browser object to providers. */
export function parseRealEstateAsset(value: unknown): RealEstateAssetInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.countryCode !== 'string' || !/^[A-Z]{2}$/.test(item.countryCode)
    || typeof item.propertyType !== 'string' || !TYPES.includes(item.propertyType)) return null;
  const asset: RealEstateAssetInput = { countryCode: item.countryCode, propertyType: item.propertyType };
  for (const key of STRINGS) {
    const field = item[key];
    if (field === undefined || field === null || field === '') continue;
    if (typeof field !== 'string' || field.length > (key === 'address' ? 500 : 160) || /[\u0000-\u001f\u007f]/u.test(field)) return null;
    asset[key] = field.trim();
  }
  if (asset.purchaseCurrency && !/^[A-Z]{3}$/.test(asset.purchaseCurrency)) return null;
  if (asset.purchaseDate && (!/^\d{4}-\d{2}-\d{2}$/.test(asset.purchaseDate)
    || !Number.isFinite(Date.parse(asset.purchaseDate)) || new Date(asset.purchaseDate).toISOString().slice(0, 10) !== asset.purchaseDate)) return null;
  for (const key of ['landArea', 'builtArea', 'purchasePrice'] as const) {
    if (item[key] === undefined || item[key] === null) continue;
    if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0 || item[key] > Number.MAX_SAFE_INTEGER) return null;
    asset[key] = item[key];
  }
  for (const key of ['landAreaUnit', 'builtAreaUnit'] as const) {
    if (item[key] === undefined || item[key] === null) continue;
    if (item[key] !== 'M2' && item[key] !== 'FT2') return null;
    asset[key] = item[key];
  }
  return asset;
}

export async function readPropertyJson(request: Request): Promise<unknown> {
  const maximum = 16_384;
  if (Number(request.headers.get('content-length')) > maximum) throw new Error('PAYLOAD_TOO_LARGE');
  if (!request.body) throw new Error('INVALID_JSON');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > maximum) throw new Error('PAYLOAD_TOO_LARGE');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
