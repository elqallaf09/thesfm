import type { RealEstateAssetInput } from './intelligence/real-estate';

export const REAL_ESTATE_ANALYST_PATH = '/invest/real-estate';
export const REAL_ESTATE_CENTER_PATH = '/investments/real-estate';

export function validInvestmentId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isRealEstateInvestment(input: { assetType?: unknown; type?: unknown }): boolean {
  const type = String(input.assetType ?? input.type ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return ['realestate', 'property', 'land'].includes(type);
}

/** Pass only an identifier. Never put addresses, purchase values or evidence in a URL. */
export function realEstateInvestmentHref(input: { id?: unknown; assetType?: unknown; type?: unknown }): string | null {
  if (!isRealEstateInvestment(input)) return null;
  if (!validInvestmentId(input.id)) return REAL_ESTATE_ANALYST_PATH;
  return `${REAL_ESTATE_ANALYST_PATH}?investmentId=${encodeURIComponent(input.id)}`;
}

export interface SavedRealEstateContext {
  investmentId: string | null;
  positionId: string | null;
  name: string;
  asset: RealEstateAssetInput;
  migrationState: string | null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numeric(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function code(value: unknown, length: 2 | 3): string | undefined {
  const normalized = text(value)?.toUpperCase();
  return normalized && new RegExp(`^[A-Z]{${length}}$`).test(normalized) ? normalized : undefined;
}

function areaUnit(value: unknown): 'M2' | 'FT2' | undefined {
  const unit = text(value)?.toUpperCase();
  return unit === 'M2' || unit === 'FT2' ? unit : undefined;
}

function propertyType(value: unknown): string {
  const normalized = text(value)?.toUpperCase();
  const aliases: Record<string, string> = { LAND: 'LAND', 'أرض': 'LAND', APARTMENT: 'APARTMENT', HOUSE: 'HOUSE', VILLA: 'HOUSE', COMMERCIAL: 'COMMERCIAL', BUILDING: 'BUILDING' };
  return normalized ? aliases[normalized] ?? '' : '';
}

/** Canonical database facts, not an estimated valuation. Missing fields stay missing. */
export function savedRealEstateContext(
  position: Record<string, unknown>,
  details: Record<string, unknown> = {},
): SavedRealEstateContext {
  return {
    investmentId: validInvestmentId(position.legacy_investment_item_id) ? position.legacy_investment_item_id : null,
    positionId: validInvestmentId(position.id) ? position.id : null,
    name: text(position.display_name) ?? '',
    migrationState: text(position.migration_state) ?? null,
    asset: {
      countryCode: code(details.country_code ?? position.country_code, 2) ?? '',
      propertyType: propertyType(details.property_type),
      city: text(details.city),
      municipality: text(details.municipality),
      address: text(details.address),
      purchaseDate: text(position.purchase_date),
      purchasePrice: numeric(position.total_cost),
      purchaseCurrency: code(position.purchase_currency, 3),
      landArea: numeric(details.land_area),
      landAreaUnit: areaUnit(details.land_area_unit),
      builtArea: numeric(details.built_area),
      builtAreaUnit: areaUnit(details.built_area_unit),
    },
  };
}

/** Compatibility read: a legacy row is never silently treated as a canonical position. */
export function legacyRealEstateContext(row: Record<string, unknown>): SavedRealEstateContext {
  return {
    investmentId: validInvestmentId(row.id) ? row.id : null,
    positionId: null,
    name: text(row.name) ?? '',
    migrationState: 'LEGACY_ONLY',
    asset: {
      countryCode: '',
      propertyType: propertyType(row.property_type),
      address: text(row.location),
      purchaseDate: text(row.purchase_date),
      purchasePrice: numeric(row.purchase_total),
      purchaseCurrency: code(row.currency, 3),
    },
  };
}
