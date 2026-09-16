export type StatementKind = 'balance' | 'income' | 'cashflow';
export type StatementLayout = { period: string; start: string | null; columns: number; index: number; kind: StatementKind };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DATE = '(\\d{1,2})\\s+(' + MONTHS.join('|') + ')\\s+(20\\d{2})';

/** Match complete title lines, never an auditor's narrative reference. A PDF
 * spread may contain several statements; stop each at the next statement title. */
export function statementSections(text: string) {
  const title = /(?:^|\n)[ \t]*(?:(?:INTERIM|CONDENSED)[ \t]+)*CONSOLIDATED[ \t]+(?:STATEMENT[ \t]+OF[ \t\n]+[A-Z \t]+|BALANCE[ \t]+SHEET)(?:[ \t]*\([^\n)]*\))?[ \t]*(?=\r?$)/gim;
  const matches = [...text.matchAll(title)];
  return matches.flatMap((match, index) => {
    const name = match[0].replace(/\s+/g, ' ').trim();
    const kind: StatementKind | null = /STATEMENT OF (?:INCOME|PROFIT OR LOSS)(?:\s*\(|$)/i.test(name) ? 'income'
      : /STATEMENT OF FINANCIAL POSITION|BALANCE SHEET/i.test(name) ? 'balance'
        : /STATEMENT OF CASH FLOWS/i.test(name) ? 'cashflow' : null;
    return kind ? [{ kind, text: text.slice(match.index!, matches[index + 1]?.index ?? text.length) }] : [];
  });
}

function parsedDate(match: RegExpExecArray | null, now: Date) {
  if (!match) return null;
  const day = Number(match[1]), month = MONTHS.findIndex(value => value.toLowerCase() === match[2].toLowerCase()), year = Number(match[3]);
  const time = Date.UTC(year, month, day), date = new Date(time);
  if (month < 0 || date.getUTCDate() !== day || !Number.isFinite(now.getTime()) || time > now.getTime()) return null;
  return { day, month, year, period: date.toISOString().slice(0, 10) };
}

/** Only supported, explicitly dated statement columns. No guessing from page
 * numbers, note numbers, nearest amounts or a report's first (starting) date. */
export function statementLayout(text: string, kind: StatementKind, now: Date): StatementLayout | null {
  const header = text.slice(0, 900).replace(/\s+/g, ' ');
  const range = new RegExp('For the period from ' + DATE + '\\s+to\\s+' + DATE, 'i').exec(header);
  const ended = new RegExp('(?:As at|As of|year ended)\\s+' + DATE, 'i').exec(header);
  const selected = range ? [range[0], ...range.slice(4, 7)] as unknown as RegExpExecArray : ended ?? new RegExp(DATE, 'i').exec(header);
  const date = parsedDate(selected, now);
  if (!date) return null;
  const { day, month, year, period } = date;
  const start = kind === 'balance' ? null : `${year}-01-01`;
  if (range) {
    const beginning = parsedDate([range[0], ...range.slice(1, 4)] as unknown as RegExpExecArray, now);
    if (!beginning || beginning.period !== `${year}-01-01`) return null;
  }
  const yearPair = new RegExp(`\\b${year} ${year - 1}\\b`);
  if (month === 11 && day === 31 && yearPair.test(header)) return { kind, period, start, columns: 2, index: 0 };
  const label = `${day} ${MONTHS[month]}`;
  const sharedYears = new RegExp(`${label} 31 December ${label} ${year} ${year - 1} ${year - 1}`, 'i');
  const fullDates = new RegExp(`${label} ${year} (?:\\(?Audited\\)? )?31 December ${year - 1} ${label} ${year - 1}`, 'i');
  if (kind === 'balance' && (sharedYears.test(header) || fullDates.test(header))) return { kind, period, start: null, columns: 3, index: 0 };
  if (kind === 'income' && /Three months ended/i.test(header) && /(?:Six|Nine) months ended/i.test(header)
    && new RegExp(`\\b${year} ${year - 1} ${year} ${year - 1}\\b`).test(header) && [5, 8].includes(month)) {
    return { kind, period, start, columns: 4, index: 2 };
  }
  // A cash-flow closing balance is an instant, but its table still needs a
  // recognized annual/YTD two-column layout before it can supply cash evidence.
  if (kind === 'cashflow' && /(?:Six|Nine) months ended/i.test(header) && yearPair.test(header) && [5, 8].includes(month)) {
    return { kind, period, start, columns: 2, index: 0 };
  }
  return null;
}

export function statementCurrencyScale(text: string) {
  return /\b(?:KD|KWD)[\s'’]*(?:000[\s'’]*s|thousands)\b/i.test(text.slice(0, 900))
    ? { currency: 'KWD', scale: 1000 } : null;
}
