import { describe, expect, it } from 'vitest';
import { tvNewsPhotoUrl } from '@/lib/markets-tv/newsPhoto';
import { publisherArticleImage } from '@/lib/server/markets-tv/newsPhoto';
import { receiverNewsPayload } from '@/lib/markets-tv/newsReceiver';

const yahoo = 'https://s.yimg.com/rz/stage/p/yahoo_finance_en-US_h_p_finance_2.png';
const reuters = 'https://static2.finnhub.io/file/finnhub/logo/reuters_logo.jpeg';
const publisher = 'https://publisher.example/markets/story';
const original = 'https://s.yimg.com/ny/api/res/market-news-photo.jpg';

describe('SFM TV article photography', () => {
  it.each([yahoo, reuters])('skips publisher branding and keeps a valid secondary feed thumbnail', logo => {
    const item = { id: 'one', title: 'News', source: 'Publisher', publishedAt: '2026-11-20T10:00:00Z', url: publisher, imageUrl: logo, thumbnail: original };
    expect(tvNewsPhotoUrl(logo)).toBeNull();
    for (const [scope, payload] of [
      ['growthNews', { category: 'growth', items: [item] }],
      ['unusualNews', { topic: 'unusual-moves-news', items: [item] }],
    ] as const) expect(receiverNewsPayload(payload, scope).stories[0]).toEqual({
      id: item.id, title: item.title, source: item.source, publishedAt: item.publishedAt, url: publisher, imageUrl: original,
    });
  });

  it('uses the article image in structured data, including a relative ImageObject in a graph', () => {
    const schema = { '@graph': [
      { '@type': 'Organization', image: 'https://publisher.example/logo.png' },
      { '@type': ['Article', 'NewsArticle'], image: [{ contentUrl: yahoo }, { url: '/photography/story.jpg' }] },
    ] };
    const html = `<meta property="og:image" content="${yahoo}"><script type="application/ld+json">${JSON.stringify(schema)}</script>`;
    expect(publisherArticleImage(html, publisher)).toBe('https://publisher.example/photography/story.jpg');
  });

  it('continues past malformed markup or source logos and keeps only safe article metadata', () => {
    const html = `<script type="application/ld+json">{</script><meta property="og:image" content="${reuters}">`;
    expect(publisherArticleImage(html + `<meta property="og:image" content="${original}">`, publisher)).toBe(original);
    expect(publisherArticleImage(html + '<meta name="twitter:image" content="http://127.0.0.1/image.png">', publisher)).toBeNull();
  });
});
