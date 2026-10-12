/** FMP disclosure dates are filing calendar dates, never instants to convert to UTC. */
export function disclosureCalendarDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$)/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === match[1] ? match[1] : null;
}

export type DisclosureRow = Record<string, unknown>;
export type DisclosurePage = { page: number; rows: DisclosureRow[] };
const DATE_FIELDS = ['disclosureDate', 'transactionDate'] as const;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function identity(row: DisclosureRow) {
  // A filing URL alone is not a trade ID: one filing can contain multiple trades.
  // Preserve every non-date field so owners, amounts and transaction types differ.
  return canonical(Object.fromEntries(Object.entries(row).filter(([key]) => !DATE_FIELDS.some(field => field === key))));
}

function signature(row: DisclosureRow) {
  return canonical({ ...row, ...Object.fromEntries(DATE_FIELDS.map(key => [key, disclosureCalendarDate(row[key])])) });
}

function counts(keys: string[]) {
  const result = new Map<string, number>();
  for (const key of keys) result.set(key, (result.get(key) ?? 0) + 1);
  return result;
}

/**
 * Compare two pages to a wider request bracketed before/after the read. There is
 * no provider total/cursor: this verifies this window, not the entire archive.
 * A changing reference cannot establish missing records and is inconclusive.
 * Only counts leave the audit; no filings, personal names, URLs or API keys.
 */
export function auditDisclosurePages(input: {
  pageSize: number;
  pages: DisclosurePage[];
  before: DisclosureRow[];
  after: DisclosureRow[];
}) {
  if (!Number.isInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 50) throw new Error('invalid_page_size');
  const rows = input.pages.flatMap(page => page.rows);
  const expected = input.before.map(signature);
  const actual = rows.map(signature);
  const stable = canonical(expected) === canonical(input.after.map(signature));
  const pageSequenceValid = input.pages.length === 2 && input.pages.every((page, index) => page.page === index && page.rows.length <= input.pageSize);
  const referenceWithinLimit = input.before.length <= input.pageSize * 2 && input.after.length <= input.pageSize * 2;
  const invalidDateCount = [...rows, ...input.before, ...input.after].reduce((count, row) => count + DATE_FIELDS.filter(key => !disclosureCalendarDate(row[key])).length, 0);
  const actualCounts = counts(actual), expectedCounts = counts(expected);
  const duplicateRecordCount = [...actualCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const comparable = stable && referenceWithinLimit && pageSequenceValid && expected.length > 0 && invalidDateCount === 0;
  // Multisets retain duplicate multiplicity: a Set would hide a skipped row
  // replaced by a duplicate from the previous page.
  const missingRecordCount = comparable ? [...expectedCounts].reduce((sum, [key, count]) => sum + Math.max(0, count - (actualCounts.get(key) ?? 0)), 0) : null;
  const unexpectedRecordCount = comparable ? [...actualCounts].reduce((sum, [key, count]) => sum + Math.max(0, count - (expectedCounts.get(key) ?? 0)), 0) : null;
  const orderMatches = comparable ? canonical(expected) === canonical(actual) : null;
  const pageBoundariesMatch = comparable ? input.pages.every(page =>
    canonical(page.rows.map(signature)) === canonical(expected.slice(page.page * input.pageSize, (page.page + 1) * input.pageSize))) : null;
  const referenceByIdentity = new Map<string, DisclosureRow[]>();
  for (const row of input.before) {
    const key = identity(row);
    referenceByIdentity.set(key, [...(referenceByIdentity.get(key) ?? []), row]);
  }
  let dateMismatchCount = 0;
  if (comparable) for (const row of rows) {
    const candidates = referenceByIdentity.get(identity(row));
    // Ambiguous identities cannot prove a date shift. Never guess a match.
    if (candidates?.length === 1) for (const key of DATE_FIELDS) {
      if (disclosureCalendarDate(row[key]) !== disclosureCalendarDate(candidates[0][key])) dateMismatchCount++;
    }
  }
  const invalid = !pageSequenceValid || !referenceWithinLimit || invalidDateCount > 0;
  const failed = invalid || (comparable && (duplicateRecordCount > 0 || missingRecordCount !== 0 || unexpectedRecordCount !== 0 || !orderMatches || !pageBoundariesMatch || dateMismatchCount > 0));
  return {
    status: failed ? 'failed' as const : comparable ? 'passed' as const : 'inconclusive' as const,
    scope: 'two_page_window' as const,
    referenceStable: stable,
    pageSequenceValid,
    checkedPages: input.pages.length,
    checkedRows: rows.length,
    referenceRows: expected.length,
    duplicateRecordCount,
    missingRecordCount,
    unexpectedRecordCount,
    orderMatches,
    pageBoundariesMatch,
    invalidDateCount,
    dateMismatchCount: comparable ? dateMismatchCount : null,
    officialFilingDatesVerified: false as const,
  };
}
