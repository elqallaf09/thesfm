'use client';
import { useEffect, useRef } from 'react';
import { nearestTvTarget } from '@/lib/markets-tv/navigation';
import { tvRemoteCommand, type TvPlaybackCommand, type TvRemoteCommand } from './tvRemoteKeys';

type TvInputDevice = { registerKey: (name: string) => void; unregisterKey?: (name: string) => void };

type ChannelCommand = Extract<TvRemoteCommand, { kind: 'channel' | 'channelNumber' }>;

function revealVertically(focused: HTMLElement, root: HTMLElement | null) {
  // A loaded quote can grow a strip after focus scrolled to it. Recheck its
  // vertical viewport without disturbing the continuous horizontal ticker.
  let panel = focused.parentElement;
  while (panel && panel !== root) {
    if (panel.scrollHeight > panel.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(panel).overflowY)) {
      const box = panel.getBoundingClientRect(), target = focused.getBoundingClientRect();
      const top = box.top + panel.clientTop, bottom = top + panel.clientHeight;
      if (target.height <= panel.clientHeight) {
        if (target.bottom > bottom + 1) panel.scrollTop += target.bottom - bottom;
        else if (target.top < top - 1) panel.scrollTop -= top - target.top;
      }
      break;
    }
    panel = panel.parentElement;
  }
}

export function useTvRemote(back: () => void, interact: () => void, modal: boolean, playback?: (command: TvPlaybackCommand) => void, channel?: (command: ChannelCommand) => void) {
  const actions = useRef({ back, interact, playback, channel });
  const hasPlayback = Boolean(playback);
  useEffect(() => { actions.current = { back, interact, playback, channel }; }, [back, interact, playback, channel]);
  useEffect(() => {
    if (!hasPlayback) return;
    // Samsung delivers navigation automatically; media keys need registration.
    // The packaged client already declares tv.inputdevice permission.
    const input = (window as Window & { tizen?: { tvinputdevice?: TvInputDevice } }).tizen?.tvinputdevice;
    if (!input) return;
    const registered: string[] = [];
    for (const name of ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'ChannelUp', 'ChannelDown', '1', '2', '3', '4', '5']) {
      try { input.registerKey(name); registered.push(name); } catch { /* On-screen playback remains available. */ }
    }
    return () => { for (const name of registered) { try { input.unregisterKey?.(name); } catch { /* Platform is shutting down. */ } } };
  }, [hasPlayback]);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const scope = () => document.querySelector<HTMLElement>('[data-tv-dialog]') || document.querySelector<HTMLElement>('[data-tv-root]');
    const items = () => Array.from(scope()?.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]') || [])
      .filter(e => e.getClientRects().length && !e.matches(':disabled') && e.getAttribute('aria-disabled') !== 'true'
        && !e.closest('[hidden],[aria-hidden="true"],[inert]') && e.getAttribute('tabindex') !== '-1');
    let lastFocused: HTMLElement | null = null;
    let lastRect: DOMRect | null = null;
    let lastKey: string | null = null;
    const rememberFocus = () => {
      const focused = document.activeElement as HTMLElement | null;
      if (!focused || !scope()?.contains(focused)) return;
      lastFocused = focused; lastRect = focused.getBoundingClientRect();
      lastKey = focused.dataset.tvFocusKey || focused.id || null;
    };
    const focusTimer = setTimeout(() => {
      const elements = items();
      if (!elements.includes(document.activeElement as HTMLElement)) (elements.find(e => e.hasAttribute('data-tv-initial-focus')) || elements[0])?.focus();
      rememberFocus();
    }, 0);
    // Price text updates leave the same DOM element focused. Restore only a
    // removed/hidden target, such as after an explicit scene or page change.
    const observer = new MutationObserver(() => {
      if (!lastFocused) return;
      if (lastFocused.isConnected && items().includes(lastFocused)) {
        if (document.activeElement === lastFocused) revealVertically(lastFocused, scope());
        return;
      }
      const focused = document.activeElement;
      if (focused && focused !== document.body && focused !== lastFocused && !scope()?.contains(focused)) return;
      const elements = items();
      if (elements.includes(focused as HTMLElement)) return;
      const replacement = lastKey ? elements.find(e => (e.dataset.tvFocusKey || e.id) === lastKey) : null;
      const nearest = lastRect && elements.reduce<HTMLElement | null>((best, item) => {
        const distance = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return Math.abs(rect.left - lastRect!.left) + Math.abs(rect.top - lastRect!.top);
        };
        return !best || distance(item) < distance(best) ? item : best;
      }, null);
      (replacement || nearest || elements[0])?.focus();
    });
    const root = scope();
    if (root) observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'inert', 'disabled'] });
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const focused = document.activeElement as HTMLElement | null;
      // Typing in a native field is activity too, even when we leave its keys alone.
      actions.current.interact();
      const command = tvRemoteCommand(event, { tagName: focused?.tagName,
        type: focused?.getAttribute('type') || undefined, isContentEditable: focused?.isContentEditable,
        expanded: focused?.getAttribute('aria-expanded') === 'true' });
      if (!command) return;
      if (command.kind === 'back') {
        event.preventDefault(); if (!event.repeat) actions.current.back(); return;
      }
      if (command.kind === 'playback') {
        if (actions.current.playback && !modal) {
          event.preventDefault(); if (!event.repeat) actions.current.playback(command.action);
        }
        return;
      }
      if (command.kind === 'channel' || command.kind === 'channelNumber') {
        if (actions.current.channel && !modal) { event.preventDefault(); if (!event.repeat) actions.current.channel(command); }
        return;
      }
      const elements = items();
      if (command.kind === 'tab') {
        if (modal) {
          event.preventDefault();
          const index = elements.indexOf(focused!);
          const next = index < 0 ? event.shiftKey ? elements.length - 1 : 0 : (index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length;
          elements[next]?.focus();
        }
        return;
      }
      if (command.kind === 'activate') {
        if (focused && elements.includes(focused)) { event.preventDefault(); if (!event.repeat) focused.click(); }
        return;
      }
      event.preventDefault();
      if (!focused || !elements.includes(focused)) { elements[0]?.focus(); return; }
      // Finish a scrollable panel before jumping to a geometrically closer
      // ticker/header outside it. At its edge, normal spatial navigation resumes.
      const vertical = command.direction === 'ArrowUp' || command.direction === 'ArrowDown';
      let panel = focused.parentElement;
      let candidates = elements;
      while (panel && panel !== scope()) {
        const style = getComputedStyle(panel);
        const scrollable = vertical ? panel.scrollHeight > panel.clientHeight + 1 && /auto|scroll/.test(style.overflowY)
          : panel.scrollWidth > panel.clientWidth + 1 && /auto|scroll/.test(style.overflowX);
        if (scrollable) {
          const local = elements.filter(element => panel!.contains(element));
          if (nearestTvTarget(focused.getBoundingClientRect(), local.map(element => element.getBoundingClientRect()), command.direction) >= 0) candidates = local;
          break;
        }
        panel = panel.parentElement;
      }
      const index = nearestTvTarget(focused.getBoundingClientRect(), candidates.map(e => e.getBoundingClientRect()), command.direction);
      if (index >= 0) {
        candidates[index].focus(); candidates[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', rememberFocus);
    return () => {
      clearTimeout(focusTimer); observer.disconnect(); document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', rememberFocus);
      if (modal && prior?.isConnected && prior.getClientRects().length && !prior.closest('[hidden],[inert]')) prior.focus();
    };
  }, [modal]);
}
