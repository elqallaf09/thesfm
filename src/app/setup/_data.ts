export type SetupRow = Record<string, unknown>;

type SetupDbError = { message?: string } | null;
type SetupDbResult = { data: unknown; error: SetupDbError };
type SetupQuery = PromiseLike<SetupDbResult> & {
  eq: (column: string, value: unknown) => SetupQuery;
  insert: (payload: unknown) => SetupQuery;
  limit: (count: number) => SetupQuery;
  maybeSingle: () => Promise<SetupDbResult>;
  order: (column: string, options: { ascending: boolean }) => SetupQuery;
  select: (columns?: string) => SetupQuery;
  update: (payload: unknown) => SetupQuery;
  upsert: (payload: unknown, options?: { onConflict?: string }) => SetupQuery;
};

export type SetupDatabase = { from: (table: string) => SetupQuery };

export type ExistingSetupData = {
  profile: SetupRow | null;
  income: SetupRow[];
  expenses: SetupRow[];
  goals: SetupRow[];
  savings: SetupRow[];
  investments: SetupRow[];
  projects: SetupRow[];
};

export const EMPTY_EXISTING_DATA: ExistingSetupData = {
  profile: null,
  income: [],
  expenses: [],
  goals: [],
  savings: [],
  investments: [],
  projects: [],
};

export function setupRow(value: unknown): SetupRow | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SetupRow : null;
}

export function setupRows(value: unknown): SetupRow[] {
  return Array.isArray(value) ? value.map(setupRow).filter((row): row is SetupRow => Boolean(row)) : [];
}

export function asSetupDatabase(value: unknown) {
  return value as SetupDatabase;
}
