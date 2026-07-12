import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { CHARITY_TEXT } from '@/app/charity/_text';

const projectRoot = process.cwd();
const centerPage = readFileSync(join(projectRoot, 'src/app/charity/page.tsx'), 'utf8');
const donationsPage = readFileSync(join(projectRoot, 'src/app/charity/donations/page.tsx'), 'utf8');
const charityStyles = readFileSync(join(projectRoot, 'src/app/charity/charity.module.css'), 'utf8');

describe('Charity Center experience', () => {
  it('is a summary hub with every required independent entry point', () => {
    expect(centerPage).toContain('data-charity-experience="center"');
    expect(centerPage).toContain("{ href: '/zakat'");
    expect(centerPage).toContain("{ href: '/khums'");
    expect(centerPage).toContain("{ href: '/charity/donations'");
    expect(centerPage).toContain("'/charity-projects?tab=projects'");
    expect(centerPage).toContain("'/charity-projects?tab=beneficiaries'");
    expect(centerPage).toContain("'/charity-projects?tab=reports'");
    expect(centerPage).toContain("'/charity-projects?tab=impact'");
    expect(centerPage).toContain("'/charity-projects?tab=reminders'");
  });

  it('keeps Zakat and Khums sources, formulas, payments, and remaining balances separate', () => {
    expect(centerPage).toContain('const zakatPaid =');
    expect(centerPage).toContain('const khumsPaid =');
    expect(centerPage).toContain('zakatRemaining: Math.max(zakatDue - zakatPaid, 0)');
    expect(centerPage).toContain('khumsRemaining: Math.max(khumsDue - khumsPaid, 0)');
    expect(centerPage).toContain('{tr.zakatFormula}');
    expect(centerPage).toContain('{tr.khumsFormula}');
    expect(centerPage).not.toMatch(/zakatDue\s*\+\s*khumsDue/);
    expect(centerPage).not.toMatch(/zakatRemaining\s*\+\s*khumsRemaining/);
  });

  it('keeps the landing route read-only and does not silently combine currencies', () => {
    expect(centerPage).not.toContain('.insert(');
    expect(centerPage).not.toContain('.update(');
    expect(centerPage).not.toContain('.delete(');
    expect(centerPage).toContain('donation.currency === zakatCurrency');
    expect(centerPage).toContain('payment.currency === khumsCurrency');
    expect(centerPage).toContain("donation.currency === 'KWD'");
  });

  it('selects the Khums year by its date range and scopes reminders to that year', () => {
    expect(centerPage).toContain(".order('end_date', { ascending: false })");
    expect(centerPage).toContain('const khumsYearsByEndDate = data.khumsYears');
    expect(centerPage).toContain('timestamp(year.start_date) <= startToday.getTime()');
    expect(centerPage).toContain('timestamp(year.end_date) >= startToday.getTime()');
    expect(centerPage).toContain(')) ?? khumsYearsByEndDate[0] ?? null;');
    expect(centerPage).toContain('khums_year_id: string | null;');
    expect(centerPage).toContain('.filter(reminder => reminder.khums_year_id === currentKhumsYear?.id)');
  });

  it('keeps Zakat projects and donations out of supported-charity and impact project cards', () => {
    expect(centerPage).toContain('const zakatProjectIds = new Set(');
    expect(centerPage).toContain('const isZakatProjectDonation = (donation: ProjectDonation)');
    expect(centerPage).toContain('!zakatProjectIds.has(project.id)');
    expect(centerPage).toContain('&& !isZakatProjectDonation(donation)');
    expect(centerPage).toContain('const displayedProjects = supportedProjects.slice(0, 3);');
    expect(centerPage).toContain('supportedProjectCount: supportedIds.size');
    expect(centerPage).toContain('const charityProjectIds = new Set(');
    expect(centerPage).toContain('!beneficiary.project_id || charityProjectIds.has(beneficiary.project_id)');
    expect(centerPage).toContain('!metric.project_id || charityProjectIds.has(metric.project_id)');
    expect(centerPage).toContain('totalBeneficiaries: charityBeneficiaries.length');
    expect(centerPage).toContain('impactMetrics: charityImpactMetrics');
  });

  it('classifies legacy giving by its encoded month while sorting recent activity separately', () => {
    expect(centerPage).toContain('date: parsed.created_at ?? `${parsed.month}-01`');
    expect(centerPage).toContain('accountingDate: `${parsed.month}-01`');
    expect(centerPage).toContain('isInCalendarYear(donation.accountingDate, currentYear)');
    expect(centerPage).toContain('timestamp(b.date) - timestamp(a.date)');
  });

  it('preserves the existing expense_items donation contract on the dedicated workflow', () => {
    expect(donationsPage).toContain('data-charity-experience="donations"');
    expect(donationsPage).toContain(".from('expense_items')");
    expect(donationsPage).toContain(".like('name', `${LEGACY_CHARITY_PREFIX}:%`)");
    expect(donationsPage).toContain('const rowName = `${LEGACY_CHARITY_PREFIX}:${month}:${name.trim()}`;');
    expect(donationsPage).toContain("supabase.from('expense_items').delete().eq('id', id)");
    expect(donationsPage).not.toContain(".from('zakat_calculations').insert");
    expect(donationsPage).not.toContain(".from('khums_payments').insert");
    expect(donationsPage).toContain('records.forEach(record =>');
    expect(donationsPage).toContain("b.localeCompare(a)");
  });

  it('ships complete local Arabic, English, and French copy', () => {
    const languages = ['ar', 'en', 'fr'] as const;
    const englishKeys = Object.keys(CHARITY_TEXT.en);
    expect(englishKeys.length).toBeGreaterThan(100);
    for (const language of languages) {
      expect(Object.keys(CHARITY_TEXT[language]).sort()).toEqual([...englishKeys].sort());
      expect(Object.values(CHARITY_TEXT[language]).every(value => value.trim().length > 0)).toBe(true);
    }
    expect(CHARITY_TEXT.ar.centerTitle).toMatch(/[\u0600-\u06ff]/);
    expect(CHARITY_TEXT.fr.centerSubtitle).toContain('Zakat');
  });

  it('includes focused, dark-mode, reduced-motion, and 320px reflow safeguards', () => {
    expect(charityStyles).toContain(':global(.dark) .page');
    expect(charityStyles).toContain(':focus-visible');
    expect(charityStyles).toContain('@media (max-width: 360px)');
    expect(charityStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(centerPage).toContain('role="progressbar"');
    expect(donationsPage).toContain('aria-live="polite"');
  });

  it('sets route direction before the shared shell calculates its desktop sidebar offset', () => {
    expect(centerPage.match(/<div dir=\{dir\} lang=\{lang\}>/g)?.length).toBeGreaterThanOrEqual(2);
    expect(donationsPage.match(/<div dir=\{dir\} lang=\{lang\}>/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
