import { PRIORITY_MARKET_SCOPES } from './catalog';

const aliases: Record<string, string> = {
  XKSE: 'BOURSA_KUWAIT', KUWSE: 'BOURSA_KUWAIT', KSE: 'BOURSA_KUWAIT', 'BOURSA KUWAIT': 'BOURSA_KUWAIT',
  XSAU: 'TADAWUL', XADS: 'ADX', XDFM: 'DFM', DSMD: 'QSE', XBAH: 'BAHRAIN_BOURSE', XMUS: 'MUSCAT',
  XNAS: 'NASDAQ', XNYS: 'NYSE', XLON: 'LSE', XETR: 'XETRA', XPAR: 'EURONEXT_PARIS', XAMS: 'EURONEXT_AMSTERDAM',
};

export function marketDataScope(exchange?: string | null, country?: string | null) {
  const raw = exchange?.trim().toUpperCase().replace(/^TD_/, '') || null;
  const resolved = raw ? aliases[raw] ?? raw : null;
  const known = PRIORITY_MARKET_SCOPES.find(scope => scope.exchange === resolved);
  return { exchange: resolved, country: country?.trim().toUpperCase() || known?.country || null };
}

/** Uses explicit exchange identity only, never a plain ticker's guessed country. */
export function directoryRecordExchange(symbol: string) {
  const regional = /^TD:([^:]+):/.exec(symbol);
  if (regional) return regional[1];
  const suffix = /\.([A-Z]+)$/.exec(symbol)?.[1];
  const exchange: Record<string, string> = { KW: 'BOURSA_KUWAIT', SR: 'TADAWUL', DU: 'DFM', AD: 'ADX', QA: 'QSE', BH: 'BAHRAIN_BOURSE', OM: 'MUSCAT', L: 'LSE', DE: 'XETRA', PA: 'EURONEXT_PARIS', AS: 'EURONEXT_AMSTERDAM' };
  return suffix ? exchange[suffix] ?? null : null;
}
