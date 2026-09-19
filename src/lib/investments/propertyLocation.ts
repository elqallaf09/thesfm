import type { RealEstateAssetInput } from './intelligence/real-estate';

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

/** Parse a point only. A Google map's @ camera center is not a property pin. No remote URL fetching. */
export function parsePropertyCoordinates(input: string): { latitude: number; longitude: number } | null {
  let value = input.trim();
  if (value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (url.username || url.password) return null;
      if (['www.google.com', 'google.com', 'maps.google.com'].includes(url.hostname) && (url.pathname.startsWith('/maps') || url.hostname === 'maps.google.com')) {
        const pin = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
        value = pin ? `${pin[1]},${pin[2]}` : url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
      } else if (['www.openstreetmap.org', 'openstreetmap.org'].includes(url.hostname)) {
        const lat = url.searchParams.get('mlat'); const lon = url.searchParams.get('mlon');
        value = lat !== null && lon !== null ? `${lat},${lon}` : '';
      } else return null;
    } catch { return null; }
  }
  const match = value.match(/^(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]); const longitude = Number(match[2]);
  return validCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export function propertyMapLinks(asset: RealEstateAssetInput, countryName: string) {
  const point = validCoordinates(asset.latitude, asset.longitude);
  const parts = [asset.address, asset.district, asset.city || asset.municipality, asset.region, countryName].map(value => value?.trim()).filter(Boolean);
  const query = point ? `${asset.latitude},${asset.longitude}` : [...new Set(parts)].join(', ');
  if (!query) return null;
  const google = new URL('https://www.google.com/maps/search/');
  google.searchParams.set('api', '1'); google.searchParams.set('query', query);
  const osm = new URL(point ? 'https://www.openstreetmap.org/' : 'https://www.openstreetmap.org/search');
  let embed: string | null = null;
  if (point) {
    const lat = asset.latitude!; const lon = asset.longitude!;
    osm.searchParams.set('mlat', String(lat)); osm.searchParams.set('mlon', String(lon));
    osm.hash = `map=17/${lat}/${lon}`;
    const frame = new URL('https://www.openstreetmap.org/export/embed.html');
    frame.searchParams.set('bbox', `${Math.max(-180, lon - .008)},${Math.max(-90, lat - .005)},${Math.min(180, lon + .008)},${Math.min(90, lat + .005)}`);
    frame.searchParams.set('layer', 'mapnik'); frame.searchParams.set('marker', `${lat},${lon}`);
    embed = frame.href;
  } else osm.searchParams.set('query', query);
  return { google: google.href, osm: osm.href, embed, query };
}

/** Known jurisdiction aliases only; free-text addresses and unknown places are preserved. */
export function normalizePropertyLocation(asset: RealEstateAssetInput): RealEstateAssetInput {
  const aliases: Record<string, string> = asset.countryCode === 'US'
    ? { 'نيويورك': 'New York City', 'نيو يورك': 'New York City', nyc: 'New York City', 'شيكاغو': 'Chicago', 'إلينوي': 'Illinois', 'الينوي': 'Illinois', 'مانهاتن': 'Manhattan', 'بروكلين': 'Brooklyn', 'كوينز': 'Queens', 'برونكس': 'Bronx', 'ستاتن آيلاند': 'Staten Island' }
    : asset.countryCode === 'GB' ? { 'لندن': 'London', londres: 'London' } : {};
  const normalized = { ...asset };
  for (const field of ['city', 'municipality', 'region', 'district'] as const) {
    const value = asset[field]?.trim();
    if (value) {
      const mapped = aliases[value.toLowerCase()] ?? value;
      normalized[field] = field === 'region' && mapped === 'New York City' ? 'New York' : mapped;
    }
  }
  return normalized;
}
