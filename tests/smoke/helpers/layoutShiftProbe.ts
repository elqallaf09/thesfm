import type { Page } from '@playwright/test';

type ShiftSample = {
  value: number;
  timestamp: number;
  selectors: string[];
  route: string;
  viewport: { width: number; height: number };
  locale: string;
  theme: string;
  loading: string[];
};
type Probe = { supported: boolean; entries: ShiftSample[] };
declare global {
  interface Window { __sfmLayoutProbe?: Probe }
}

/** Install before navigation. Unsupported engines still run bounding-box tests. */
export async function installLayoutShiftProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: Probe = { supported: PerformanceObserver.supportedEntryTypes.includes('layout-shift'), entries: [] };
    window.__sfmLayoutProbe = probe;
    if (!probe.supported) return;
    const selector = (node: Node | null | undefined) => {
      if (!(node instanceof Element)) return 'detached';
      // Record structural selectors only: no text, input values, or account IDs.
      return node.tagName.toLowerCase() + Array.from(node.classList)
        .filter(name => !name.startsWith('jsx-')).slice(0, 4).map(name => '.' + name).join('');
    };
    new PerformanceObserver(list => {
      for (const raw of list.getEntries()) {
        const entry = raw as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: { node?: Node | null }[];
        };
        if (entry.hadRecentInput) continue;
        probe.entries.push({
          value: entry.value,
          timestamp: entry.startTime,
          selectors: (entry.sources ?? []).map(source => selector(source.node)),
          route: location.pathname,
          viewport: { width: innerWidth, height: innerHeight },
          locale: document.documentElement.lang,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          loading: Array.from(document.querySelectorAll('.gm-shell [aria-busy="true"]')).map(selector),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

export async function readLayoutShiftProbe(page: Page) {
  return page.evaluate(() => {
    const probe = window.__sfmLayoutProbe;
    if (!probe?.supported) return { supported: false, cls: null, total: null, largest: null, entries: [] };
    let cls = 0;
    let session = 0;
    let first = 0;
    let previous = 0;
    for (const entry of probe.entries) {
      if (!session || entry.timestamp - previous >= 1000 || entry.timestamp - first >= 5000) {
        first = entry.timestamp;
        session = entry.value;
      } else session += entry.value;
      previous = entry.timestamp;
      cls = Math.max(cls, session);
    }
    return {
      supported: true,
      cls,
      total: probe.entries.reduce((sum, entry) => sum + entry.value, 0),
      largest: Math.max(0, ...probe.entries.map(entry => entry.value)),
      entries: probe.entries,
    };
  });
}
