import { currentMacroObservation, type MacroObservation } from '@/domain/intelligence/macroObservations';

const cached = new Map<string, { expires: number; observations: MacroObservation[] }>();
const pending = new Map<string, Promise<MacroObservation[]>>();

/** Bounded, shared per-source cache; failed refreshes cannot change evidence dates. */
export async function cachedMacroObservations(key: string, seconds: number, loader: () => Promise<MacroObservation[]>) {
  const entry = cached.get(key);
  if (entry && entry.expires > Date.now()) return entry.observations.filter(sample => currentMacroObservation(sample));
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    const fresh = await loader().catch(() => []);
    const observations = [...fresh];
    for (const previous of entry?.observations ?? []) {
      if (!fresh.some(sample => sample.series === previous.series && sample.country === previous.country)
        && currentMacroObservation(previous)) observations.push(previous);
    }
    if (cached.size >= 64 && !cached.has(key)) cached.delete(cached.keys().next().value!);
    cached.set(key, { expires: Date.now() + (fresh.length ? seconds : 60) * 1000, observations });
    return observations;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export async function macroSourceText(url: string, revalidate: number) {
  const response = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(5500), headers: { accept: 'application/json,text/csv' } });
  if (!response.ok) throw new Error('MACRO_SOURCE_UNAVAILABLE');
  const text = await response.text();
  if (text.length > 1_000_000) throw new Error('MACRO_SOURCE_TOO_LARGE');
  return text;
}
