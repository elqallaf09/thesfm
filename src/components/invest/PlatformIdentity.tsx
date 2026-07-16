'use client';

import { memo, useEffect, useMemo, useState } from 'react';

type PlatformIdentityProps = {
  name: string;
  logoUrl?: string | null;
  title?: string;
};

const PLATFORM_DOMAINS: Record<string, string> = {
  xtb: 'xtb.com',
  'interactive brokers': 'interactivebrokers.com',
  etoro: 'etoro.com',
  'trading 212': 'trading212.com',
  saxo: 'home.saxo',
  swissquote: 'swissquote.com',
  'charles schwab': 'schwab.com',
  fidelity: 'fidelity.com',
  degiro: 'degiro.com',
  robinhood: 'robinhood.com',
  binance: 'binance.com',
  coinbase: 'coinbase.com',
  kraken: 'kraken.com',
  'kuwait finance house': 'kfh.com',
  kfh: 'kfh.com',
  zad: 'joinzad.com',
};

/**
 * Users type the same platform many ways ("ZAD", "zad", "زاد", "Zad Fintech").
 * Collapse the known variants onto one canonical key before lookups.
 */
const PLATFORM_NAME_ALIASES: Record<string, string> = {
  'زاد': 'zad',
  'zad fintech': 'zad',
  'zad investment': 'zad',
  'zad investments': 'zad',
  'join zad': 'zad',
  joinzad: 'zad',
};

export function normalizePlatformIdentifier(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
  return PLATFORM_NAME_ALIASES[normalized] || normalized;
}

const VERIFIED_PLATFORM_LOGOS: Record<string, string> = {
  binance: 'https://cdn.simpleicons.org/binance',
  coinbase: 'https://cdn.simpleicons.org/coinbase',
  robinhood: 'https://cdn.simpleicons.org/robinhood',
};

function safeLogoUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function resolvePlatformLogoUrl(name: string, explicitLogoUrl?: string | null) {
  const explicit = safeLogoUrl(explicitLogoUrl);
  if (explicit) return explicit;
  const normalizedName = normalizePlatformIdentifier(name);
  const verified = VERIFIED_PLATFORM_LOGOS[normalizedName];
  if (verified) return verified;
  const domain = PLATFORM_DOMAINS[normalizedName];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=64`;
}

export const PlatformIdentity = memo(function PlatformIdentity({ name, logoUrl, title }: PlatformIdentityProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const source = useMemo(() => resolvePlatformLogoUrl(name, logoUrl), [logoUrl, name]);
  const monogram = useMemo(() => name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toLocaleUpperCase('en-US')
    .slice(0, 2) || '—', [name]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [source]);

  return (
    <span className="invest-platform-identity" title={title}>
      <span className="invest-platform-logo" data-fallback={!source || failed || !loaded ? 'true' : 'false'} aria-hidden="true">
        <span className="invest-platform-monogram">{monogram}</span>
        {source && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt="" width="24" height="24" loading="lazy" decoding="async" referrerPolicy="no-referrer" data-loaded={loaded || undefined} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        ) : null}
      </span>
      <span>{name}</span>
    </span>
  );
});
