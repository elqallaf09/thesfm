/** A ticker identifies a listing only together with its exchange. */
export function tvListingKey(asset: { symbol: string; region?: string; exchange?: string | null }): string {
  return `${asset.region || asset.exchange || 'global'}:${asset.symbol}`;
}

export function validTvListingKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_]{1,32}:[A-Za-z0-9.&^=/:_-]{1,64}$/.test(value);
}
