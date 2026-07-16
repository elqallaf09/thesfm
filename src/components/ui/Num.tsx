import type { HTMLAttributes } from 'react';

/**
 * Numbers across THE SFM always render as Latin digits (1234567890) via
 * Intl.NumberFormat('en-US'), never Eastern Arabic numerals, and display LTR
 * inside their own element (the global `.num` utility) so RTL copy around
 * them keeps its direction.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatLatinNumber(value: number, options?: Intl.NumberFormatOptions) {
  const cacheKey = JSON.stringify(options ?? {});
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', options);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter.format(value);
}

type NumProps = {
  value: number;
  options?: Intl.NumberFormatOptions;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

export function Num({ value, options, className, ...rest }: NumProps) {
  return (
    <span {...rest} className={className ? `num ${className}` : 'num'}>
      {formatLatinNumber(value, options)}
    </span>
  );
}

export default Num;
