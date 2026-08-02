import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('Tech News unified layout contract', () => {
  const page = read('src/components/tech-news/TechNewsPage.tsx');
  const feed = read('src/components/tech-news/TechNewsUnifiedFeed.tsx');

  it('places search and advanced filters before the only news feed', () => {
    const quickFiltersAt = page.indexOf('<TechNewsQuickFilters');
    const advancedFiltersAt = page.indexOf('<TechNewsAdvancedFilters');
    const feedAt = page.indexOf('<TechNewsUnifiedFeed');

    expect(quickFiltersAt).toBeGreaterThan(-1);
    expect(advancedFiltersAt).toBeGreaterThan(quickFiltersAt);
    expect(feedAt).toBeGreaterThan(advancedFiltersAt);
    expect(page).not.toContain('TechNewsFeaturedSection');
  });

  it('derives lead, secondary, and regular cards from one ordered item list', () => {
    expect(feed).toContain('const [lead, ...remainingItems] = items');
    expect(feed).toContain('remainingItems.slice(0, 2)');
    expect(feed).toContain('remainingItems.slice(2)');
    expect(feed).toContain('data-testid="tech-news-unified-feed"');
  });

  it('paginates the filtered list directly without a featured-story exclusion set', () => {
    expect(page).toContain('filteredItems.slice(0, visibleCount)');
    expect(page).not.toContain('featuredIds');
    expect(page).not.toContain('regularItems');
  });
});
