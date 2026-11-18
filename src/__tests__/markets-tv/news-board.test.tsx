import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvHeadlines } from '@/components/markets-tv/TvSceneSidebar';
import { TvHeadlineBand } from '@/components/markets-tv/TvHeadlineBand';
import { TvNewsDesk } from '@/components/markets-tv/TvNewsDesk';
import { TvNewsEvidence } from '@/components/markets-tv/TvNewsEvidence';
import type { TvNews } from '@/lib/markets-tv/types';

const stories = (count: number): TvNews[] => Array.from({ length: count }, (_, index) => ({
  id: `news-${index}`, title: `Complete source headline ${index}`, source: `Publisher ${index}`,
  publishedAt: '2026-11-18T12:00:00Z', url: `https://example.com/news/${index}`,
}));

describe('simultaneous TV headlines', () => {
  for (const language of ['ar', 'en', 'fr'] as const) {
    it(`${language} retains the full news date across Kuwait midnight`, () => {
      const story = { ...stories(1)[0], publishedAt: '2026-11-18T20:26:00Z' };
      const previousDay = renderToStaticMarkup(<TvNewsEvidence story={story} language={language} now={Date.parse('2026-11-18T21:05:00Z')}/>);
      expect(previousDay).toContain('aria-label="2026-11-18 · 23:26"');
      expect(previousDay).toContain('dateTime="2026-11-18T20:26:00Z"');
      expect(previousDay).toContain('>2026-11-18</span>');
      expect(previousDay).toContain('>23:26</span>');
      expect(previousDay).toContain(story.source);
      const sameDay = renderToStaticMarkup(<TvNewsEvidence story={story} language={language} now={Date.parse('2026-11-18T20:30:00Z')}/>);
      expect(sameDay).toContain('aria-label="23:26"');
      expect(sameDay).not.toContain('data-dated');
    });
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
