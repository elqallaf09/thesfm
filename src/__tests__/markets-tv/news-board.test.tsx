import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvHeadlines } from '@/components/markets-tv/TvSceneSidebar';
import { TvHeadlineBand } from '@/components/markets-tv/TvHeadlineBand';
import { TvNewsDesk } from '@/components/markets-tv/TvNewsDesk';
import type { TvNews } from '@/lib/markets-tv/types';

const stories = (count: number): TvNews[] => Array.from({ length: count }, (_, index) => ({
  id: `news-${index}`, title: `Complete source headline ${index}`, source: `Publisher ${index}`,
  publishedAt: '2026-11-18T12:00:00Z', url: `https://example.com/news/${index}`,
}));

describe('simultaneous TV headlines', () => {
  for (const language of ['ar', 'en', 'fr'] as const) {
    it(`${language} renders every received item, source and date without headline pages`, () => {
      for (const [variant, count] of [['band', 8], ['panel', 12], ['desk', 24]] as const) {
        const news = stories(count), props = { news, language, onStory: () => undefined };
        const markup = renderToStaticMarkup(variant === 'band' ? <TvHeadlineBand {...props} paused/>
          : variant === 'panel' ? <TvHeadlines {...props} now={Date.now()}/>
          : <TvNewsDesk {...props} now={Date.now()} playing/>);
        for (const story of news) {
          expect(markup).toContain(story.title);
          expect(markup).toContain(story.source);
          expect(markup).toContain(`dateTime="${story.publishedAt}"`);
        }
        expect((markup.match(/class="[^"]*tv-news-board-card/g) || [])).toHaveLength(count);
        expect(markup).not.toContain('tv-broadcast-pager');
        expect(markup).not.toContain('tv-headline-playback');
      }
    });
  }
});
