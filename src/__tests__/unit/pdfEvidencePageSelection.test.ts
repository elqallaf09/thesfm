import { describe, expect, it } from 'vitest';
import { evidencePageSelection, hintedEvidencePages, locatedEvidencePages } from '@/lib/sharia-research/pdfFinancialEvidence';

const page = (num: number, text: string) => ({ num, text });
const governance = 'Corporate Governance Report\nBoard composition and committee attendance during the year.';
const statement = (heading: string) => `Kuwait Finance House\n${heading}\nAs at 31 December 2025\nKD 000s\n2025 2024\nTOTAL ASSETS 40,000,000 30,000,000`;

describe('reviewed evidence page hints', () => {
  it('keeps the reviewed window alongside the front matter that proves identity', () => {
    expect(hintedEvidencePages(200, [162, 163])).toEqual([...Array.from({ length: 20 }, (_, index) => index + 1), 162, 163]);
  });
  it('drops hints the document cannot have and needs no hints at all', () => {
    expect(hintedEvidencePages(5, [0, 9, 7.5, -3, Number.NaN])).toEqual([1, 2, 3, 4, 5]);
    expect(hintedEvidencePages(3)).toEqual([1, 2, 3]);
  });
});

describe('locating statement pages when a reviewed window has drifted', () => {
  it('keeps only pages carrying a statement header or its signature', () => {
    expect(locatedEvidencePages([
      page(84, governance),
      page(162, statement('CONSOLIDATED STATEMENT OF FINANCIAL POSITION')),
      page(164, statement('CONSOLIDATED STATEMENT OF INCOME')),
      page(161, 'INDEPENDENT AUDITORS REPORT\nKuwait Finance House\n12 February 2026\nKuwait'),
      page(190, 'Notes to the consolidated financial statements continued'),
    ])).toEqual([162, 164, 161]);
  });
  it('reports nothing for a document with no statement pages at all', () => {
    expect(locatedEvidencePages([page(1, governance), page(2, 'Chairman statement')])).toEqual([]);
  });
  it('bounds how many located pages one document can contribute', () => {
    const many = Array.from({ length: 30 }, (_, index) => page(100 + index, statement('CONSOLIDATED BALANCE SHEET')));
    expect(locatedEvidencePages(many)).toHaveLength(12);
  });
});

describe('evidence page selection', () => {
  it('never drops a located statement page to fit front matter under the cap', () => {
    const hints = Array.from({ length: 30 }, (_, index) => 40 + index);
    const selection = evidencePageSelection(200, hints, [162, 164]);
    expect(selection).toHaveLength(32);
    expect(selection).toContain(162);
    expect(selection).toContain(164);
    expect(selection).toEqual([...selection].sort((left, right) => left - right));
  });
  it('recovers the KFH case: a governance window yields the real statement pages', () => {
    const stale = [83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
    const scanned = [...stale.map(num => page(num, governance)), page(162, statement('CONSOLIDATED STATEMENT OF FINANCIAL POSITION'))];
    const located = locatedEvidencePages(scanned);
    expect(located).toEqual([162]);
    expect(evidencePageSelection(240, stale, located)).toContain(162);
  });
  it('still returns the reviewed window when nothing could be located', () => {
    expect(evidencePageSelection(100, [55], [])).toEqual([...Array.from({ length: 20 }, (_, index) => index + 1), 55]);
  });
});
