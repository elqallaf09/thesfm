'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { supabase } from '@/integrations/supabase/client';
import { intelligenceAssetTypeFromMarket } from '@/lib/intelligence/assetTypes';
import type { WorldStockAssetType } from '@/lib/world-stocks/types';

type WorldStocksWatchlistButtonProps = {
  symbol: string;
  assetType: WorldStockAssetType;
  displayName: string;
  labels: {
    add: string;
    added: string;
    error: string;
    signIn: string;
  };
  className?: string;
};

/**
 * The real, persistent watchlist is the Supabase market_watchlist table
 * (RLS-scoped by user_id), inserted into directly from the client -- the
 * same pattern AiAnalystPersonalSurfaces.tsx already uses. There is no
 * dedicated POST /api/watchlist route: that path is already taken by an
 * unrelated live-quote endpoint used by the trader app.
 */
export function WorldStocksWatchlistButton({ symbol, assetType, displayName, labels, className }: WorldStocksWatchlistButtonProps) {
  const { user, isGuest, loading } = useAuth();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  if (loading) return null;

  if (!user || isGuest) {
    return (
      <Link href={loginHrefForCurrentLocation()} className={className}>
        <LogIn size={15} aria-hidden="true" />
        {labels.signIn}
      </Link>
    );
  }

  const add = async () => {
    setState('saving');
    const { error } = await supabase
      .from('market_watchlist')
      .insert({ user_id: user.id, symbol, asset_type: intelligenceAssetTypeFromMarket(assetType), name: displayName });
    setState(error ? 'error' : 'saved');
  };

  if (state === 'saved') {
    return (
      <span className={className} aria-live="polite">
        <BookmarkCheck size={15} aria-hidden="true" />
        {labels.added}
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={() => void add()} disabled={state === 'saving'}>
      <Bookmark size={15} aria-hidden="true" />
      {state === 'error' ? labels.error : labels.add}
    </button>
  );
}

export default WorldStocksWatchlistButton;
