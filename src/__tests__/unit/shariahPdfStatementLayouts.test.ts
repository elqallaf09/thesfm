import { describe,expect,it } from 'vitest';
import { financialStatementSections,kwdStatementScale,pdfStatementLayout,statementAmount } from '@/lib/sharia-research/pdfStatementLayout';
const now=new Date('2026-09-16T12:00:00Z');
const position='CONSOLIDATED STATEMENT OF FINANCIAL POSITION\nAs at 30 June 2026\nNotes 30 June\n2026\n(Audited)\n31 December\n2025\n30 June\n2025\nKD’000’s KD’000’s KD’000’s\nAssets\nTotal assets 1,000 900 800';
const income='INTERIM CONDENSED CONSOLIDATED STATEMENT OF PROFIT OR LOSS (UNAUDITED)\nFor the period from 1 January 2026 to 30 June 2026\n2\nThree months ended\n30 June\nSix months ended\n30 June\n2026 2025 2026 2025\nNotes KD’000’s KD’000’s KD’000’s KD’000’s\nInterest income 10 9 20 18';
describe('source-bound PDF period/column layouts',()=>{
 it('uses June, not the first January date in a duration heading',()=>expect(pdfStatementLayout(income,'income',now)).toEqual({period:'2026-06-30',start:'2026-01-01',columns:4,index:2}));
 it('recognizes each full-date balance column and current position',()=>expect(pdfStatementLayout(position,'position',now)).toEqual({period:'2026-06-30',start:null,columns:3,index:0}));
 it('retains the grouped NBK-style labels',()=>expect(pdfStatementLayout(position.replace('Notes 30 June\n2026\n(Audited)\n31 December\n2025\n30 June\n2025','30 June 31 December 30 June\n2026 2025 2025'),'position',now)?.columns).toBe(3));
 it.each(["KD’000’s","KD'000's","KD 000's",'KWD thousands'])('recognizes %s explicitly',unit=>expect(kwdStatementScale(unit)).toBe(1000));
 it.each(['KD millions','USD thousands','KWD','000 shares'])('rejects unverified units: %s',unit=>expect(kwdStatementScale(unit)).toBeNull());
 it('does not infer a full year from a December quarterly statement',()=>expect(pdfStatementLayout('CONSOLIDATED STATEMENT OF INCOME\n31 December 2025\n2025 2024\nKD 000s','income',now)).toBeNull());
 it('rejects invalid and future dates',()=>{expect(pdfStatementLayout(position.replaceAll('30 June','31 June'),'position',now)).toBeNull();expect(pdfStatementLayout(position,'position',new Date('2026-05-01'))).toBeNull();});
 it('rejects a contradictory duration start',()=>expect(pdfStatementLayout(income.replace('1 January','1 April'),'income',now)).toBeNull());
 it('isolates each statement in a landscape annual spread',()=>{const sections=financialStatementSections('Issuer\n'+income+'\nIssuer\nCONSOLIDATED STATEMENT OF COMPREHENSIVE INCOME\nother items\nIssuer\n'+position);expect(sections.map(s=>s.kind)).toEqual(['income','position']);expect(sections[0].text).not.toContain('other items');});
 it('reads the year-to-date third column without its note identifier',()=>expect(statementAmount('7 10 9 20 18',pdfStatementLayout(income,'income',now)!)).toBe('20'));
 it('never shifts columns around missing or negative current values',()=>{const layout=pdfStatementLayout(income,'income',now)!;expect(statementAmount('10 9 - 18',layout)).toBeNull();expect(statementAmount('10 9 (20) 18',layout)).toBeNull();expect(statementAmount('10 9 20 18 extra',layout)).toBeNull();expect(statementAmount('10 9 0 18',layout)).toBe('0');});
 it('rejects issuer discussion prose instead of treating it as a statement title',()=>expect(financialStatementSections('We discuss the consolidated statement of financial position and investments.')).toEqual([]));
});
