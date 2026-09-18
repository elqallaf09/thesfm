export type PreciousMetal = 'gold' | 'silver' | 'platinum' | 'palladium';

export const PRECIOUS_METAL_VISUALS: Record<PreciousMetal, { image: string; symbol: string }> = {
  gold: { image: '/images/metals/gold-bar.webp', symbol: 'Au' },
  silver: { image: '/images/metals/silver-bar.webp', symbol: 'Ag' },
  platinum: { image: '/images/metals/platinum-bar.webp', symbol: 'Pt' },
  palladium: { image: '/images/metals/palladium-bar.webp', symbol: 'Pd' },
};

export function isPreciousMetal(value: string): value is PreciousMetal {
  return Object.hasOwn(PRECIOUS_METAL_VISUALS, value);
}

const METAL_SYMBOLS: Array<[RegExp, PreciousMetal]> = [
  [/^(?:GC=F|GOLD|XAU(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'gold'],
  [/^(?:SI=F|SILVER|XAG(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'silver'],
  [/^(?:PL=F|PLATINUM|XPT(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'platinum'],
  [/^(?:PA=F|PALLADIUM|XPD(?:USD|EUR|GBP|AUD|CHF|CAD|JPY|KWD|SAR|AED)?(?:=X)?)$/, 'palladium'],
];

/** Exact metal identities only: an equity named Gold must keep its company logo. */
export function preciousMetalFromSymbol(symbol: string, assetType: string): PreciousMetal | null {
  if (/stock|equity|share|etf|fund|crypto/.test(assetType)) return null;
  const compact = symbol.toUpperCase().replace(/^(?:COMEX|NYMEX|FX|FOREX):/, '').replace(/[\s/\-]/g, '');
  for (const [pattern, metal] of METAL_SYMBOLS) {
    if (pattern.test(compact)) return metal;
  }
  return null;
}
