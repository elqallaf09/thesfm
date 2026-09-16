import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { NAV_GROUPS } from '@/components/navigationConfig';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');
const sidebar = read('src/components/Sidebar.tsx');
const mobile = read('src/components/MobileMenu.tsx');

describe('account section never auto-expands', () => {
  it('starts every fresh session collapsed on both desktop and mobile', () => {
    expect(sidebar).toContain("const [openGlobalGroupIds, setOpenGlobalGroupIds] = useState<string[]>([]);");
    expect(mobile).toContain("const [openGlobalGroupIds, setOpenGlobalGroupIds] = useState<string[]>([]);");
  });

  it('contains no effect that re-adds a global group id when its route becomes active', () => {
    for (const source of [sidebar, mobile]) {
      expect(source).not.toMatch(/navigationGroupContainsId/);
    }
  });

  it('only toggles the account disclosure from an explicit click handler, and keeps it accessible', () => {
    expect(sidebar).toContain('const expanded = collapsed || openGlobalGroupIds.includes(group.id)');
    expect(sidebar).toContain('aria-expanded={expanded}');
    expect(sidebar).toContain('aria-controls={groupId}');
    expect(mobile).toContain('const expanded = openGlobalGroupIds.includes(group.id)');
    expect(mobile).toContain('aria-expanded={expanded}');
    expect(mobile).toContain('aria-controls={groupId}');
  });

  it('keeps profile and logout reachable through the same single click regardless of prior state', () => {
    expect(sidebar).toContain('setOpenGlobalGroupIds(current => current.includes(group.id)');
    expect(sidebar).toContain('? current.filter(id => id !== group.id)');
    expect(mobile).toContain('onClick={() => setOpenGlobalGroupIds(current => current.includes(group.id)');
    expect(mobile).toContain('? current.filter(id => id !== group.id)');
  });
});

describe('unified market-news subgroup rendering', () => {
  it('renders a labeled, non-interactive divider before each subsection in both nav surfaces', () => {
    expect(sidebar).toContain('sfm-shared-subgroup-label');
    expect(sidebar).toContain('item.sectionLabelKey');
    expect(mobile).toContain('sfm-mobile-subgroup-label');
    expect(mobile).toContain('item.sectionLabelKey');
  });

  it('places exactly the two documented subsections at the documented boundaries', () => {
    const marketNews = NAV_GROUPS.find(group => group.id === 'market-news');
    const labeled = marketNews?.items.filter(item => item.sectionLabelKey) ?? [];
    expect(labeled.map(item => item.id)).toEqual(['tech-news', 'energy-stocks']);
  });

  it('includes all dedicated special and intelligence news destinations', () => {
    const marketNews = NAV_GROUPS.find(group => group.id === 'market-news');
    const destinations = new Map((marketNews?.items ?? []).map(item => [item.id, item.href]));

    expect(destinations.get('federal-reserve-news')).toBe('/federal-reserve-news');
    expect(destinations.get('healthcare-stocks-news')).toBe('/healthcare-stocks-news');
    expect(destinations.get('new-stocks-news')).toBe('/new-stocks-news');
    expect(destinations.get('stocks-under-one')).toBe('/stocks-under-1');
    expect(destinations.get('metals-news')).toBe('/metals-news');
    expect(destinations.get('earnings-news')).toBe('/earnings-news');
    expect(destinations.get('analyst-ratings-news')).toBe('/analyst-ratings-news');
    expect(destinations.get('mergers-acquisitions-news')).toBe('/mergers-acquisitions-news');
    expect(destinations.get('unusual-moves-news')).toBe('/unusual-moves-news');
  });

  it('uses the shared moving ticker with colored percentage changes for special news pages', () => {
    const source = read('src/components/special-news/SpecialMarketNewsPage.tsx');
    expect(source).toContain("StockTickerStrip");
    expect(source).toContain('changePercent: item.changePercent');
    expect(source).toContain('durationSeconds={34}');
    expect(source).toContain("data-direction={direction}");
  });
});
