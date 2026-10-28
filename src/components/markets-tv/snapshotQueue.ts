/** Bound both active fetches and queued work on low-memory TV browsers. */
export function createTvSnapshotQueue(concurrency = 4, maxPending = 24) {
  let active = 0;
  const waiting: Array<() => void> = [];
  const drain = () => {
    while (active < concurrency && waiting.length) waiting.shift()?.();
  };
  return function queued<T>(signal: AbortSignal, load: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        const index = waiting.indexOf(start);
        if (index >= 0) waiting.splice(index, 1);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const start = () => {
        signal.removeEventListener('abort', abort);
        if (signal.aborted) { abort(); return; }
        active++;
        void Promise.resolve().then(() => {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          return load();
        }).then(resolve, reject).finally(() => { active--; drain(); });
      };
      if (signal.aborted) { abort(); return; }
      if (active < concurrency) start();
      else if (waiting.length >= maxPending) reject(new Error('TV_QUEUE_BUSY'));
      else { waiting.push(start); signal.addEventListener('abort', abort, { once: true }); }
    });
  };
}

export const queuedTvSnapshot = createTvSnapshotQueue();
