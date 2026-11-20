// Map positions use the same Greenwich-centred Robinson projection as world-atlas.webp.
export const TV_ATLAS_CITIES = [
  { group: 'gulf', city: 'kuwaitCity', zone: 'Asia/Kuwait', x: 62.528, y: 37.116 },
  { group: 'europe', city: 'london', zone: 'Europe/London', x: 49.970, y: 23.665 },
  { group: 'us', city: 'newYork', zone: 'America/New_York', x: 31.552, y: 30.161 },
  { group: 'asia', city: 'tokyo', zone: 'Asia/Tokyo', x: 85.650, y: 33.236 },
] as const;

export type TvAtlasRegion = typeof TV_ATLAS_CITIES[number]['group'];

export function isTvEquityAggregate(group: string, scope: string | null) {
  return group === 'world' || (scope === 'region' && TV_ATLAS_CITIES.some(city => city.group === group));
}
