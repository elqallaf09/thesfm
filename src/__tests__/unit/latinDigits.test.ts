import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber, formatPercent, formatTime, normalizeDigits } from '@/lib/locale';
import { normalizeNumberInput } from '@/lib/money';

const nonLatinDigits = /[\u0660-\u0669\u06F0-\u06F9]/;

function expectLatinDigitsOnly(value: string) {
  expect(value).not.toMatch(nonLatinDigits);
}

describe('Latin digit formatting', () => {
  it('normalizes Arabic-Indic and Persian digits to Latin digits', () => {
    expect(normalizeDigits('\u0661\u0662\u0663 \u06F4\u06F5\u06F6 \u0664\u0665\u066B\u0666\u0667\u066A')).toBe('123 456 45.67%');
    expect(normalizeDigits('\u0662\u0664/\u0660\u0666/\u0662\u0660\u0662\u0666')).toBe('24/06/2026');
  });

  it('formats Arabic and English numbers with Latin digits', () => {
    expectLatinDigitsOnly(formatNumber(12345.67, 'ar'));
    expectLatinDigitsOnly(formatNumber(12345.67, 'en'));
  });

  it('formats currencies and percentages with Latin digits in Arabic mode', () => {
    expectLatinDigitsOnly(formatCurrency(1250.5, 'KWD', 'ar'));
    expectLatinDigitsOnly(formatCurrency(250.75, 'USD', 'ar'));
    expectLatinDigitsOnly(formatPercent(0.4567, 'ar', { maximumFractionDigits: 2 }));
  });

  it('formats dates and times with Latin digits in Arabic mode', () => {
    const date = new Date('2026-06-26T07:45:00.000Z');

    expectLatinDigitsOnly(formatDate(date, 'ar', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }));
    expectLatinDigitsOnly(formatTime(date, 'ar', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kuwait',
    }));
  });

  it('normalizes Arabic digit input before numeric use', () => {
    expect(normalizeNumberInput('\u0661\u066C\u0662\u0663\u0664\u066B\u0665\u0666')).toBe('1,234.56');
    expect(Number(normalizeNumberInput('\u06F1\u06F2\u06F3\u06F4'))).toBe(1234);
  });
});
