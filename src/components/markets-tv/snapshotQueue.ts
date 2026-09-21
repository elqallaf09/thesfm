// Bound visible-row fanout; cancelling an offscreen row also removes its queued work.
let active = 0;
const waiting: Array<() => void> = [];
export async function queuedTvSnapshot<T>(signal: AbortSignal, load: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve, reject) => {
    const abort = () => { const index = waiting.indexOf(start); if (index >= 0) waiting.splice(index, 1); reject(new DOMException('Aborted', 'AbortError')); };
    const start = () => { signal.removeEventListener('abort', abort); if (signal.aborted) { abort(); return; } active++; resolve(); };
    if (signal.aborted) { abort(); return; }
    if (active < 4) start(); else { waiting.push(start); signal.addEventListener('abort', abort, { once: true }); }
  });
  try { if (signal.aborted) throw new DOMException('Aborted', 'AbortError'); return await load(); }
  finally { active--; waiting.shift()?.(); }
}
