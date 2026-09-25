'use client';

import { useSyncExternalStore } from 'react';
import { parseSidebarPreference, SIDEBAR_PREFERENCE_ATTRIBUTE, SIDEBAR_PREFERENCE_KEY } from '@/lib/navigation/sidebarPreference';

const listeners = new Set<() => void>();
let value: boolean | undefined;

function apply(next: boolean) {
  value = next;
  document.documentElement.setAttribute(SIDEBAR_PREFERENCE_ATTRIBUTE, String(next));
  listeners.forEach(listener => listener());
}

function snapshot() {
  if (value === undefined) {
    try { value = parseSidebarPreference(window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY)); }
    catch { value = document.documentElement.getAttribute(SIDEBAR_PREFERENCE_ATTRIBUTE) === 'true'; }
  }
  return value;
}

function onStorage(event: StorageEvent) {
  if (event.key === SIDEBAR_PREFERENCE_KEY || event.key === null) apply(parseSidebarPreference(event.newValue));
}

function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
  };
}

function setCollapsed(next: boolean | ((current: boolean) => boolean)) {
  const resolved = typeof next === 'function' ? next(snapshot()) : next;
  try { window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, resolved ? '1' : '0'); }
  catch { /* The current-tab preference still works if storage is blocked. */ }
  apply(resolved);
}

export function useSidebarPreference() {
  return [useSyncExternalStore(subscribe, snapshot, () => false), setCollapsed] as const;
}
