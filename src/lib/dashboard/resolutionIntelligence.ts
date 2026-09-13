export type ResolutionEventRow = {
  id?: string | null;
  event_key?: string | null;
  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  resolution_code?: string | null;
};

export type ResolutionHistorySummary = {
  activeCount: number;
  resolvedCount: number;
  recurringFamilies: Array<{ family: string; occurrences: number; resolved: number; priorityScore: number }>;
  latestResolved: ResolutionEventRow[];
};

function familyForEventKey(value: unknown) {
  const key = String(value ?? '').trim();
  if (!key) return '';
  const parts = key.split(':');
  if (parts[0] === 'risk' && parts.length >= 3) return parts.slice(0, 2).join(':');
  if (parts[0] === 'decision' && parts.length >= 2) return parts.slice(0, 2).join(':');
  if (parts[0] === 'opportunity' && parts.length >= 2) return parts.slice(0, 2).join(':');
  return key;
}

function timeValue(value: unknown) {
  const time = value ? new Date(String(value)).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function familySeverity(family: string) {
  if (family === 'risk:monthly-deficit') return 4;
  if (family === 'risk:low-liquidity') return 3;
  if (family === 'risk:high-debt') return 3;
  if (family.startsWith('decision:')) return 2;
  if (family.startsWith('opportunity:')) return 0;
  return 1;
}

export function summarizeResolutionHistory(rows: ResolutionEventRow[] = []): ResolutionHistorySummary {
  const activeCount = rows.filter(row => !row.resolved_at).length;
  const resolved = rows.filter(row => Boolean(row.resolved_at));
  const families = new Map<string, { occurrences: number; resolved: number }>();

  for (const row of rows) {
    const family = familyForEventKey(row.event_key);
    if (!family) continue;
    const current = families.get(family) ?? { occurrences: 0, resolved: 0 };
    current.occurrences += 1;
    if (row.resolved_at) current.resolved += 1;
    families.set(family, current);
  }

  const recurringFamilies = [...families.entries()]
    .filter(([, stats]) => stats.occurrences > 1)
    .map(([family, stats]) => ({
      family,
      ...stats,
      priorityScore: stats.occurrences * 10 + familySeverity(family),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.family.localeCompare(b.family));

  const latestResolved = [...resolved]
    .sort((a, b) => timeValue(b.resolved_at) - timeValue(a.resolved_at))
    .slice(0, 3);

  return {
    activeCount,
    resolvedCount: resolved.length,
    recurringFamilies,
    latestResolved,
  };
}

export function eventFamilyLabel(family: string) {
  if (family === 'risk:monthly-deficit') return 'monthly_deficit';
  if (family === 'risk:low-liquidity') return 'low_liquidity';
  if (family === 'risk:high-debt') return 'high_debt';
  if (family.startsWith('decision:')) return 'decision';
  if (family.startsWith('opportunity:')) return 'opportunity';
  return 'other';
}
