'use client';

import { Building2 } from 'lucide-react';
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
  const domain = PLATFORM_DOMAINS[name.trim().toLocaleLowerCase('en-US')];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=64`;
}

export const PlatformIdentity = memo(function PlatformIdentity({ name, logoUrl, title }: PlatformIdentityProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const source = useMemo(() => resolvePlatformLogoUrl(name, logoUrl), [logoUrl, name]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [source]);

  return (
    <span className="invest-platform-identity" title={title}>
      <span className="invest-platform-logo" aria-hidden="true">
        <Building2 size={15} />
        {source && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt="" width="24" height="24" loading="lazy" decoding="async" referrerPolicy="no-referrer" data-loaded={loaded || undefined} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        ) : null}
      </span>
      <span>{name}</span>
    </span>
  );
});
