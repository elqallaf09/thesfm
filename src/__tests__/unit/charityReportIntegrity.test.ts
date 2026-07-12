import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'src/app/charity-projects/report/page.tsx'),
  'utf8',
);

describe('printable charity report integrity', () => {
  it('keeps the report charity-only and uses annual interval overlap', () => {
    expect(source).toContain('data-charity-experience="report"');
    expect(source).toContain('const charityProjects = loadedProjects.filter(project => isVoluntaryCharity(project.category))');
    expect(source).toContain('return !isZakat(value) && !isKhums(value)');
    expect(source).toContain('const annualProjects = charityProjects.filter(project => overlapsYear(');
    expect(source).not.toContain('zakatableAmount');
    expect(source).not.toContain('totalWithZakat');
    expect(source).not.toContain('* 0.025');
  });

  it('classifies legacy donations by their encoded YYYY-MM value', () => {
    expect(source).toContain("String(value ?? '').split(':')[1]");
    expect(source).toContain("donation.encoded_month?.startsWith(`${selectedYear}-`)");
    expect(source).toContain("date_scope: 'encoded-month'");
    expect(source).toContain('Month encoded in donation record');
  });

  it('aggregates only explicit KWD and preserves row currencies', () => {
    expect(source).toContain('normalizedCurrency(value) === KWD');
    expect(source).toContain('.filter(item => isExplicitKwd(item.currency))');
    expect(source).toContain('money(safeNumber(donation.amount), donation.currency)');
    expect(source).toContain('money(safeNumber(commitment.amount), commitment.currency)');
    expect(source).toContain('Financial totals include only records explicitly stored in Kuwaiti dinar (KWD).');
    expect(source).toContain('تُجمع الأرقام المالية فقط عندما تكون العملة مسجلة صراحةً بالدينار الكويتي');
    expect(source).toContain('Les totaux financiers incluent uniquement les enregistrements explicitement libellés');
  });

  it('scopes beneficiary and impact evidence to charity project IDs', () => {
    expect(source).toContain('!beneficiary.project_id || charityProjectIds.has(beneficiary.project_id)');
    expect(source).toContain('charityProjectIds.has(metric.project_id)');
    expect(source).toContain('hasUsableInterval(beneficiary.sponsorship_start_date, beneficiary.sponsorship_end_date)');
    expect(source).toContain("scope: 'project'");
    expect(source).toContain('Project-scoped — no usable record date');
  });

  it('includes undated commitments only in the current-year report', () => {
    expect(source).toContain("selectedYear === new Date().getFullYear()");
    expect(source).not.toContain("!parseDate(commitment.next_due_date) || isInYear");
  });

  it('stacks semantic table rows on portrait tablets and mobile without horizontal page scrolling', () => {
    expect(source).toContain('overflow-x: clip');
    expect(source).toContain('@media (max-width: 900px)');
    expect(source).toContain('.data-table td::before { content: attr(data-label)');
    expect(source).toContain('<th scope="col">');
    expect(source).toContain('button:focus-visible');
  });
});
