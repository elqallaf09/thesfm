'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export function useTvControls(root: RefObject<HTMLDivElement | null>, enabled: boolean, modal: boolean) {
  const [hidden, setHidden] = useState(false);
  const lastActivity = useRef(Date.now());
  const wake = useCallback(() => { lastActivity.current = Date.now(); setHidden(false); }, []);
  useEffect(() => {
    wake();
    if (!enabled || modal) return;
    const timer = setInterval(() => {
      // Never remove a keyboard/remote target while it has focus.
      if (Date.now() - lastActivity.current >= 12000 && !root.current?.querySelector('.tv-header-actions')?.contains(document.activeElement)) setHidden(true);
    }, 1000);
    document.addEventListener('keydown', wake, true);
    document.addEventListener('pointermove', wake, { passive: true });
    document.addEventListener('pointerdown', wake, { passive: true });
    document.addEventListener('focusin', wake);
    return () => {
      clearInterval(timer); document.removeEventListener('keydown', wake, true);
      document.removeEventListener('pointermove', wake); document.removeEventListener('pointerdown', wake); document.removeEventListener('focusin', wake);
    };
  }, [enabled, modal, root, wake]);
  return { hidden: enabled && !modal && hidden, wake };
}
