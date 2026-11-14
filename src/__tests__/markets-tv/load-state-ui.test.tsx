import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvQuoteTable } from '@/components/markets-tv/TvQuoteTable';
import { TvHeadlineBand } from '@/components/markets-tv/TvHeadlineBand';
import { TvHeadlines } from '@/components/markets-tv/TvSceneSidebar';
import { tvText } from '@/lib/markets-tv/i18n';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvNews } from '@/lib/markets-tv/types';

const noop = () => undefined;
it('distinguishes a failed quote request, pending prices and a successful empty search in all languages', () => {
  for (const language of ['ar', 'en', 'fr'] as const) {
    const props = { items: [], quotes: [], language, now: Date.now(), loading: false, select: noop };
    const failed = renderToStaticMarkup(<TvQuoteTable {...props} emptyReason="error"/>);
    expect(failed).toContain(tvText(language, 'error'));
    expect(failed).not.toContain(hallText(language, 'noResults'));
    expect(renderToStaticMarkup(<TvQuoteTable {...props} emptyReason="prices"/>)).toContain(tvSceneText(language, 'noScenePrices'));
    expect(renderToStaticMarkup(<TvQuoteTable {...props}/>)).toContain(hallText(language, 'noResults'));
    expect(renderToStaticMarkup(<TvQuoteTable {...props} loading emptyReason="error"/>)).toContain(tvText(language, 'loading'));
  }
});

it('does not call pending or failed news an empty feed and preserves a previously received headline during retry', () => {
  const story: TvNews = { id: 'source-story', title: 'Previously received headline', source: 'Original publisher', url: 'https://example.com/news', publishedAt: '2026-11-14T10:00:00Z' };
  for (const variant of ['band', 'panel'] as const) {
    const render = (news: TvNews[], newsLoading: boolean, newsError: string | null) => {
      const props = { news, newsLoading, newsError, language: 'en' as const, onStory: noop, onRetry: noop };
      return renderToStaticMarkup(variant === 'band' ? <TvHeadlineBand {...props} paused/> : <TvHeadlines {...props} now={Date.now()}/>);
    };
    expect(render([], true, null)).toContain(tvText('en', 'loading'));
    const failed = render([], false, 'FETCH_FAILED');
    expect(failed).toContain(tvText('en', 'error'));
    expect(failed).toContain(tvText('en', 'retry'));
    expect(failed).not.toContain(tvText('en', 'noNews'));
    expect(render([], false, null)).toContain(tvText('en', 'noNews'));
    const retained = render([story], true, 'FETCH_FAILED');
    expect(retained).toContain(story.title);
    expect(retained).toContain(story.source);
    expect(retained).toContain(story.publishedAt);
  }
});
