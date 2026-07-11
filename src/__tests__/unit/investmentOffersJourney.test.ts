import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const page = readFileSync(join(process.cwd(), 'src/app/investment-offers/page.tsx'), 'utf8');

describe('Investor Offers journey organization', () => {
  it('uses the shared URL-backed accessible tab foundation for five real views', () => {
    expect(page).toContain("const INVESTOR_JOURNEY_TABS = ['overview', 'readiness', 'financials', 'documents', 'pitch-deck'] as const");
    expect(page).toContain('useUrlTabState<InvestorJourneyTab>');
    expect(page).toContain('<PageTabs');
    expect(page.match(/<PageTabPanel/g)).toHaveLength(5);
  });

  it('keeps the existing real project, pitch, funding, and document sources', () => {
    for (const table of [
      'projects',
      'project_pitch_decks',
      'project_funding_readiness',
      'project_strategic_documents',
      'project_documents',
    ]) {
      expect(page).toContain(`loadRows('${table}', user.id)`);
    }
  });

  it('does not fabricate risk, sharing, or investor-activity tabs', () => {
    const tabDefinition = page.match(/const INVESTOR_JOURNEY_TABS = \[([\s\S]*?)\] as const/)?.[1] ?? '';
    expect(tabDefinition).not.toMatch(/risk|sharing|activity|interest/i);
    expect(page).toContain('investment_offers_investor_activity_unavailable');
  });

  it('uses closed semantic details while retaining disclosure state outside lazy panels', () => {
    expect(page).toContain('<details className="investment-disclosure"');
    expect(page).toContain('const [openDetails, setOpenDetails]');
    expect(page).toContain('onToggle={event => onOpenChange(event.currentTarget.open)}');
  });
});
