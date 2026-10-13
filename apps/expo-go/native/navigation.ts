type Listener = (path: string) => void;
const listeners = new Set<Listener>();
const updates = new Set<() => void>();
const authListeners = new Set<() => void>();
export function authChanged() { for (const listener of authListeners) listener(); }
export function onAuthChanged(listener: () => void) { authListeners.add(listener); return () => { authListeners.delete(listener); }; }
let detailBack: (() => boolean) | undefined;
export function onDetailBack(listener: () => boolean) { detailBack = listener; return () => { if (detailBack === listener) detailBack = undefined; }; }
export function consumeDetailBack() { return detailBack?.() ?? false; }
export function openScreen(path: string) { for (const listener of listeners) listener(path); }
export function onNavigate(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function dataChanged() { for (const listener of updates) listener(); }
export function onDataChanged(listener: () => void) { updates.add(listener); return () => { updates.delete(listener); }; }
