'use client';
import { createContext, useCallback, useEffect, useState } from 'react';

// Only an explicit Play action opts TV playback into motion. The system setting
// remains the default, including when it changes while this screen is open.
export const TvMotionOverride = createContext(false);

export function useTvPlayback(channel: 'ticker' | 'news' | 'stocks') {
  const storageKey = `sfm-tv-${channel}-playback-v1`;
  const [reduced, setReduced] = useState(false);
  const [intent, setIntent] = useState<'auto' | 'play' | 'pause'>('auto');
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addListener(update);
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(storageKey); } catch { /* Playback still works without storage. */ }
    setIntent(saved === 'play' || saved === 'pause' ? saved : 'auto');
    return () => media.removeListener(update);
  }, [storageKey]);
  const paused = intent === 'pause' || intent === 'auto' && reduced;
  const setPlaying = useCallback((playing: boolean) => {
    const next = playing ? 'play' : 'pause';
    setIntent(next);
    try { sessionStorage.setItem(storageKey, next); } catch { /* Keep this explicit choice in memory. */ }
  }, [storageKey]);
  const toggle = useCallback(() => setPlaying(paused), [paused, setPlaying]);
  return { paused, explicitPlay: intent === 'play', reduced, toggle, setPlaying };
}
