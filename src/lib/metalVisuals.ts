export type Metal = 'gold' | 'silver' | 'platinum' | 'palladium' | 'copper';

export const METAL_VISUALS: Record<Metal, { image: string; symbol: string }> = {
  gold: { image: '/images/metals/gold-bar.webp', symbol: 'Au' },
  silver: { image: '/images/metals/silver-bar.webp', symbol: 'Ag' },
  platinum: { image: '/images/metals/platinum-bar.webp', symbol: 'Pt' },
  palladium: { image: '/images/metals/palladium-bar.webp', symbol: 'Pd' },
  copper: { image: '/images/metals/copper-bar.webp', symbol: 'Cu' },
};

export function isMetal(value: string): value is Metal {
  return Object.hasOwn(METAL_VISUALS, value);
}

const METAL_SYMBOLS: Array<[RegExp, Metal]> = [
  [/^(?:HG=F|COPPER(?:\.COMM)?)$/, 'copper'],
  [/^(?:GC=F|GOLD|XAU(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'gold'],
  [/^(?:SI=F|SILVER|XAG(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'silver'],
  [/^(?:PL=F|PLATINUM|XPT(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'platinum'],
  [/^(?:PA=F|PALLADIUM|XPD(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'palladium'],
];

/** Exact metal identities only: an equity named Gold must keep its company logo. */
export function metalFromSymbol(symbol: string, assetType: string): Metal | null {
  if (/stock|equity|share|etf|fund|crypto/.test(assetType)) return null;
  const compact = symbol.toUpperCase().replace(/^(?:COMEX|NYMEX|FX|FOREX):/, '').replace(/[\s/\-]/g, '');
  for (const [pattern, metal] of METAL_SYMBOLS) {
    if (pattern.test(compact)) return metal;
  }
  return null;
}
