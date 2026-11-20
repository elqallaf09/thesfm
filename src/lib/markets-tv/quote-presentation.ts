import { tvQuotePrice } from './i18n';
import type { TvQuote } from './types';

type TvQuoteMovement = {
  trend: 'up' | 'down' | 'flat' | 'unknown';
  value: string;
  label: 'rising' | 'falling' | 'unchanged' | 'changeUnavailable';
};

const percentFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Keep the visible percentage consistent with its direction, including signed zero. */
export function tvQuoteMovement(change: number | null | undefined): TvQuoteMovement {
  if (change == null || !Number.isFinite(change)) {
    return { trend: 'unknown', value: '—', label: 'changeUnavailable' };
  }
  if (change === 0) {
    return { trend: 'flat', value: '0.00%', label: 'unchanged' };
  }

  const rising = change > 0;
  const magnitude = Math.abs(change);
  // A genuine small movement must not become a red/green zero after rounding.
  const number = magnitude < 0.01 ? '<0.01' : percentFormat.format(magnitude);
  return {
    trend: rising ? 'up' : 'down',
    value: `${rising ? '+' : '−'}${number}%`,
    label: rising ? 'rising' : 'falling',
  };
}

/** Remove padding from ordinary subunit stock prices without changing quote precision. */
export function tvTableQuotePrice(quote: Pick<TvQuote, 'price' | 'currency' | 'exchange' | 'symbol'>) {
  const formatted = tvQuotePrice(quote);
  const specialized = ['FOREX', 'CRYPTO', 'COMMODITIES'].includes(quote.exchange || '')
    || /[=/:^]/.test(quote.symbol) || /-(?:USD|USDT)$/.test(quote.symbol);
  if (quote.price == null || quote.price < 0.001 || quote.price >= 1 || specialized
    || ['KWD', 'BHD', 'OMR'].includes(quote.currency || '')) return formatted;
  const [whole, fraction] = formatted.split('.');
  return fraction ? `${whole}.${fraction.replace(/0+$/, '').padEnd(2, '0')}` : formatted;
}
