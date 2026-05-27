'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { MarketAssetType } from '@/lib/market/marketService';

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

type TradingViewChartProps = {
  symbol: string;
  assetType: MarketAssetType;
  exchange?: string;
  theme?: 'light' | 'dark';
};

function tradingViewSymbol(symbol: string, assetType: MarketAssetType, exchange?: string) {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (assetType === 'crypto') return `COINBASE:${clean.replace(/USD$/, '')}USD`;
  if (assetType === 'forex') return `FX:${clean}`;
  if (assetType === 'gold' || clean === 'XAU' || clean === 'XAUUSD') return 'TVC:GOLD';
  if (assetType === 'commodity') return clean === 'OIL' ? 'TVC:USOIL' : `TVC:${clean}`;
  const normalizedExchange = (exchange || 'NASDAQ').toUpperCase().replace(/\s+/g, '');
  const safeExchange = normalizedExchange.includes('NYSE') ? 'NYSE' : normalizedExchange.includes('NASDAQ') ? 'NASDAQ' : normalizedExchange;
  return `${safeExchange}:${clean}`;
}

export function TradingViewChart({ symbol, assetType, exchange, theme = 'light' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = useMemo(() => `tradingview-${symbol}-${assetType}`.replace(/[^a-zA-Z0-9_-]/g, '-'), [assetType, symbol]);
  const tvSymbol = useMemo(() => tradingViewSymbol(symbol, assetType, exchange), [assetType, exchange, symbol]);

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.TradingView) return;
      containerRef.current.innerHTML = '';
      const target = document.createElement('div');
      target.id = containerId;
      target.style.height = '100%';
      target.style.width = '100%';
      containerRef.current.appendChild(target);

      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme,
        style: '1',
        locale: 'en',
        toolbar_bg: theme === 'dark' ? '#061B33' : '#FFFFFF',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        save_image: false,
        calendar: false,
        support_host: 'https://www.tradingview.com',
        container_id: containerId,
      });
    }

    if (window.TradingView) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-sfm-tradingview="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget, { once: true });
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', renderWidget);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.dataset.sfmTradingview = 'true';
    script.addEventListener('load', renderWidget, { once: true });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', renderWidget);
    };
  }, [containerId, theme, tvSymbol]);

  return (
    <div className="tradingview-shell" aria-label={`TradingView chart for ${symbol}`}>
      <div ref={containerRef} className="tradingview-container" />
      <style jsx>{`
        .tradingview-shell{position:relative;width:100%;height:420px;min-height:320px;border-radius:18px;overflow:hidden;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14)}
        .tradingview-container{position:absolute;inset:0;width:100%;height:100%}
        @media(max-width:720px){.tradingview-shell{height:360px;border-radius:16px}}
      `}</style>
    </div>
  );
}
