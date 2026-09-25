'use client';
import { useEffect, useRef } from 'react';
import { nearestTvTarget } from '@/lib/markets-tv/navigation';
export function useTvRemote(back: () => void, interact: () => void, modal: boolean) {
  const actions = useRef({ back, interact });
  useEffect(() => { actions.current = { back, interact }; }, [back, interact]);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const scope = () => document.querySelector<HTMLElement>('[data-tv-dialog]') || document.querySelector<HTMLElement>('[data-tv-root]');
    const items = () => Array.from(scope()?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]') || []).filter(e => e.getClientRects().length && !e.closest('[hidden],[aria-hidden="true"]') && e.getAttribute('tabindex') !== '-1');
    const focusTimer = setTimeout(() => { const elements = items(); if (modal || !elements.includes(document.activeElement as HTMLElement)) elements[0]?.focus(); }, 0);
    function onKey(event: KeyboardEvent) {
      const key = ({ 10009: 'Escape', 461: 'Escape', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 13: 'Enter' } as Record<number, string>)[event.keyCode] || event.key;
      actions.current.interact();
      if (key === 'Escape' || key === 'BrowserBack') { event.preventDefault(); actions.current.back(); return; }
      const elements = items(); const focused = document.activeElement as HTMLElement;
      if (key === 'Tab' && modal) {
        event.preventDefault(); const index = elements.indexOf(focused); elements[(index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length]?.focus(); return;
      }
      if (focused?.tagName === 'SELECT' && ['ArrowUp','ArrowDown','Enter',' '].includes(key)) return;
      if ((focused?.tagName === 'INPUT' || focused?.tagName === 'SELECT') && !['ArrowUp', 'ArrowDown'].includes(key)) return;
      if (key === 'Enter' && elements.includes(focused) && focused.tagName !== 'INPUT') { event.preventDefault(); focused.click(); return; }
      if (!key.startsWith('Arrow')) return;
      event.preventDefault();
      if (!elements.includes(focused)) { elements[0]?.focus(); return; }
      const index = nearestTvTarget(focused.getBoundingClientRect(), elements.map(e => e.getBoundingClientRect()), key);
      if (index >= 0) { elements[index].focus(); elements[index].scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(focusTimer); document.removeEventListener('keydown', onKey); if (modal && prior?.isConnected) prior.focus(); };
  }, [modal]);
}
