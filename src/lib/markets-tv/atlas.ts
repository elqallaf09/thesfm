// Positions are percentages of the Greenwich-centred Robinson projection in world-atlas.webp.
export const TV_ATLAS_CITIES = [
  { code: 'kw', group: 'gulf', city: 'kuwaitCity', country: 'atlasCountryKW', landmark: 'atlasLandmarkKW', zone: 'Asia/Kuwait', x: 62.528, y: 37.116 },
  { code: 'gb', group: 'europe', city: 'london', country: 'atlasCountryGB', landmark: 'atlasLandmarkGB', zone: 'Europe/London', x: 49.970, y: 23.665 },
  { code: 'us', group: 'us', city: 'newYork', country: 'atlasCountryUS', landmark: 'atlasLandmarkUS', zone: 'America/New_York', x: 31.552, y: 30.161 },
  { code: 'jp', group: 'asia', city: 'tokyo', country: 'atlasCountryJP', landmark: 'atlasLandmarkJP', zone: 'Asia/Tokyo', x: 85.650, y: 33.236 },
  { code: 'bh', group: 'gulf', city: 'atlasManama', country: 'atlasCountryBH', landmark: 'atlasLandmarkBH', zone: 'Asia/Bahrain', x: 63.319, y: 39.051 },
  { code: 'fr', group: 'europe', city: 'atlasParis', country: 'atlasCountryFR', landmark: 'atlasLandmarkFR', zone: 'Europe/Paris', x: 50.558, y: 25.244 },
  { code: 'it', group: 'europe', city: 'atlasMilan', country: 'atlasCountryIT', landmark: 'atlasLandmarkIT', zone: 'Europe/Rome', x: 52.229, y: 27.279 },
  { code: 'sa', group: 'gulf', city: 'atlasRiyadh', country: 'atlasCountrySA', landmark: 'atlasLandmarkSA', zone: 'Asia/Riyadh', x: 62.336, y: 39.982 },
  { code: 'ae', group: 'gulf', city: 'atlasDubai', country: 'atlasCountryAE', landmark: 'atlasLandmarkAE', zone: 'Asia/Dubai', x: 64.592, y: 39.680 },
  { code: 'qa', group: 'gulf', city: 'atlasDoha', country: 'atlasCountryQA', landmark: 'atlasLandmarkQA', zone: 'Asia/Qatar', x: 63.603, y: 39.630 },
  { code: 'om', group: 'gulf', city: 'atlasMuscat', country: 'atlasCountryOM', landmark: 'atlasLandmarkOM', zone: 'Asia/Muscat', x: 65.469, y: 40.673 },
  { code: 'in', group: 'asia', city: 'atlasMumbai', country: 'atlasCountryIN', landmark: 'atlasLandmarkIN', zone: 'Asia/Kolkata', x: 69.462, y: 43.447 },
] as const;

export type TvAtlasCity = typeof TV_ATLAS_CITIES[number];
export type TvAtlasRegion = TvAtlasCity['group'];

export const TV_ATLAS_REGIONS = ['gulf', 'europe', 'us', 'asia'] as const;

/** Keep four readable clocks and labels while the selected market represents its own region. */
export function atlasRepresentatives<T extends TvAtlasCity>(cities: readonly T[], active: T): T[] {
  return TV_ATLAS_REGIONS.map(region => active.group === region ? active : cities.find(city => city.group === region)!);
}

export function atlasStep(index: number, step: 1 | -1) {
  return (index + step + TV_ATLAS_CITIES.length) % TV_ATLAS_CITIES.length;
}

const zoneAliases: Readonly<Record<string, string>> = { 'Asia/Calcutta': 'in', 'US/Eastern': 'us', 'US/Pacific': 'us',
    'America/Chicago': 'us', 'America/Denver': 'us', 'America/Los_Angeles': 'us', 'America/Phoenix': 'us',
    'America/Anchorage': 'us', 'Pacific/Honolulu': 'us', 'Europe/Belfast': 'gb', 'Japan': 'jp' };

// Prefer an explicitly browsed region. Otherwise use the device clock, without asking for location.
export function initialAtlasIndex(region: string | undefined, zone: string) {
  const local = TV_ATLAS_CITIES.findIndex(city => city.zone === zone || city.code === zoneAliases[zone]);
  if (local >= 0 && (!TV_ATLAS_REGIONS.some(value => value === region) || TV_ATLAS_CITIES[local].group === region)) return local;
  return Math.max(0, TV_ATLAS_CITIES.findIndex(city => city.group === region));
}

export const ATLAS_INTERVAL = 10000;

export function isTvEquityAggregate(group: string, scope: string | null) {
  return group === 'world' || (scope === 'region' && TV_ATLAS_CITIES.some(city => city.group === group));
}
