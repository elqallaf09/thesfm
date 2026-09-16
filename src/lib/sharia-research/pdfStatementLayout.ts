// Recognized statement layouts only. A nearby publication date, page number,
// comparative year or quarterly column must not become the reporting period.
export type PdfStatementKind = 'position' | 'income' | 'cashflow';
export type PdfStatementLayout = { period: string; start: string | null; columns: number; index: number };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DATE = `(\\d{1,2})\\s+(${MONTHS.join('|')})\\s+(20\\d{2})`;
const TITLE = /^[ \t]*(?:(?:INTERIM|CONDENSED)\s+)*CONSOLIDATED\s+(?:STATEMENT\s+OF\s+(FINANCIAL\s+POSITION|PROFIT\s+OR\s+LOSS|OTHER\s+COMPREHENSIVE\s+INCOME|COMPREHENSIVE\s+INCOME|INCOME|CASH\s+FLOWS|CHANGES\s+IN\s+EQUITY)|BALANCE\s+SHEET)[^\n]*/gim;

export function financialStatementSections(page: string): Array<{ kind: PdfStatementKind; text: string }> {
  const titles = [...page.matchAll(TITLE)];
  return titles.flatMap((title, i) => {
    const label = title[0].replace(/\s+/g, ' ');
    const kind = /FINANCIAL POSITION|BALANCE SHEET/i.test(label) ? 'position'
      : /STATEMENT OF (?:INCOME|PROFIT OR LOSS)/i.test(label) ? 'income'
        : /STATEMENT OF CASH FLOWS/i.test(label) ? 'cashflow' : null;
    if (!kind) return [];
    const section = page.slice(title.index, titles[i+1]?.index ?? page.length);
    const notes = /(?:^|\n)\s*NOTES TO (?:THE )?(?:INTERIM CONDENSED )?CONSOLIDATED/i.exec(section);
    return [{ kind, text: section.slice(0, notes?.index ?? section.length) }];
  });
}

function isoDate(day: number, month: number, year: number, now: Date) {
  const value = new Date(Date.UTC(year, month, day));
  if (!Number.isFinite(now.getTime()) || value.getUTCFullYear() !== year || value.getUTCMonth() !== month
    || value.getUTCDate() !== day || value > now) return null;
  return value.toISOString().slice(0,10);
}

export function pdfStatementLayout(text: string, kind: PdfStatementKind, now = new Date()): PdfStatementLayout | null {
  const raw = text.slice(0,1200);
  const header = raw.replace(/\s+/g,' ');
  const range = new RegExp(`for the period from ${DATE} to ${DATE}`, 'i').exec(header);
  const explicit = new RegExp(`(?:as at|as of|(?:for (?:the )?)?year ended)\\s+${DATE}`, 'i').exec(header);
  const bare = new RegExp(`(?:^|\\n)\\s*${DATE}(?:\\s*\\((?:un)?audited\\))?\\s*(?:\\n|$)`, 'i').exec(raw);
  const parts = range ? range.slice(4,7) : (explicit ?? bare)?.slice(1,4);
  if (!parts) return null;
  const day = Number(parts[0]), month = MONTHS.findIndex(m=>m.toLowerCase()===parts[1].toLowerCase()), year=Number(parts[2]);
  const period = isoDate(day,month,year,now);
  if (!period) return null;
  const rangeStart = range ? isoDate(Number(range[1]),MONTHS.findIndex(m=>m.toLowerCase()===range[2].toLowerCase()),Number(range[3]),now) : null;
  if (range && (!rangeStart || rangeStart >= period)) return null;
  // Remove only audited markers and currency units, not dates or column labels.
  const clean = header.replace(/\((?:un)?audited\)/gi,' ').replace(/\b(?:KD|KWD)\s*['’]?\s*(?:000\s*['’]?s?|thousands)\b/gi,' ').replace(/\s+/g,' ');
  const pair = new RegExp(`\\b${year} ${year-1}\\b`);
  if (kind === 'position') {
    if (month===11 && day===31 && (pair.test(clean) || new RegExp(`31 December ${year} 31 December ${year-1}`,'i').test(clean))) {
      return {period,start:null,columns:2,index:0};
    }
    const label = `${day} ${MONTHS[month]}`;
    const grouped = new RegExp(`${label} 31 December ${label} ${year} ${year-1} ${year-1}`, 'i');
    const interleaved = new RegExp(`${label} ${year} 31 December ${year-1} ${label} ${year-1}`, 'i');
    return grouped.test(clean) || interleaved.test(clean) ? {period,start:null,columns:3,index:0} : null;
  }
  if (/year ended/i.test(header) && month===11 && day===31 && pair.test(clean)) {
    return {period,start:`${year}-01-01`,columns:2,index:0};
  }
  const months = /Nine months ended/i.test(header) ? 9 : /Six months ended/i.test(header) ? 6 : /Three months ended/i.test(header) ? 3 : null;
  if (!months || day!==new Date(Date.UTC(year,month+1,0)).getUTCDate() || month+1<months) return null;
  const start = `${year}-${String(month+2-months).padStart(2,'0')}-01`;
  if (range && rangeStart!==start) return null;
  if (months>3 && /Three months ended/i.test(header) && new RegExp(`\\b${year} ${year-1} ${year} ${year-1}\\b`).test(clean)) {
    return {period,start,columns:4,index:2};
  }
  return pair.test(clean) && !new RegExp(`\\b${year} ${year-1} ${year} ${year-1}\\b`).test(clean)
    ? {period,start,columns:2,index:0} : null;
}

export function kwdStatementScale(text: string) {
  return /\b(?:KD|KWD)\s*['’]?\s*(?:000\s*['’]?s?|thousands)\b/i.test(text.slice(0,700)) ? 1000 : null;
}

/** Consume the complete numeric tail. A dash stays missing and never shifts the
 * current-period column left. A leading integer may be a statement note number. */
export function statementAmount(tail: string, layout: PdfStatementLayout): string | null {
  const tokens = tail.trim().split(/\s+/);
  if (tokens.length === layout.columns+1 && /^\d{1,3}$/.test(tokens[0])) tokens.shift();
  if (tokens.length !== layout.columns || tokens.some(token=>! /^(?:\(?-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\)?|[-–—])$/.test(token))) return null;
  const value=tokens[layout.index];
  return /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(value) ? value : null;
}
