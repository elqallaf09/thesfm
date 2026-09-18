import { expect, it } from 'vitest';
import { escapeCsv, nextPayrollDate } from '@/lib/businessReports';

it('neutralizes spreadsheet formulas in untrusted text while preserving numbers and CSV quoting', () => {
  for (const input of ['=1+1', '+cmd', '@SUM(A1)', '-1+2', '\t=1', '  =1']) expect(escapeCsv(input)).toMatch(/^'/);
  expect(escapeCsv(-42.5)).toBe('-42.5');
  expect(escapeCsv('عميل, "أول"')).toBe('"عميل, ""أول"""');
  expect(escapeCsv('عميل ١٢٣')).toBe('عميل 123');
});

it('clamps a monthly payroll day to month end instead of skipping February', () => {
  expect(nextPayrollDate(31, new Date(2026, 1, 10))).toEqual(new Date(2026, 1, 28));
  expect(nextPayrollDate(31, new Date(2028, 1, 10))).toEqual(new Date(2028, 1, 29));
  expect(nextPayrollDate(30, new Date(2026, 0, 31))).toEqual(new Date(2026, 1, 28));
  expect(nextPayrollDate(25, new Date(2026, 11, 26))).toEqual(new Date(2027, 0, 25));
});
