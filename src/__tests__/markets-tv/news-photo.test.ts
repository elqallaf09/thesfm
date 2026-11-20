import { describe, expect, it } from 'vitest';
import { tvNewsPhotoUrl } from '@/lib/markets-tv/newsPhoto';
import { publisherArticleImage } from '@/lib/server/markets-tv/newsPhoto';
import { receiverNewsPayload } from '@/lib/markets-tv/newsReceiver';

const yahoo = 'https://s.yimg.com/rz/stage/p/yahoo_finance_en-US_h_p_finance_2.png';
const reuters = 'https://static2.finnhub.io/file/finnhub/logo/reuters_logo.jpeg';
const yahooSocialLogo = 'https://s.yimg.com/cv/apiv2/social/images/yahoo_default_logo-1200x1200.png';
const resize = (url: string) => 'https://s.yimg.com/lo/mysterio/api/resizefill_w1200%3Bquality_80/' + encodeURIComponent(url);
const publisher = 'https://publisher.example/markets/story';
const original = 'https://s.yimg.com/ny/api/res/market-news-photo.jpg';

describe('SFM TV article photography', () => {
  it.each([yahoo, reuters, yahooSocialLogo, resize(yahoo), resize(yahooSocialLogo), 'https://cdn.trefis.com/env/prd/logos/SPX.png', 'https://247wallst.com/wp-content/uploads/2025/09/247logo-256x256-1.jpg'])('skips publisher branding and keeps a valid secondary feed thumbnail', logo => {
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

  it('recovers a syndicated photo through the same Yahoo resizer that serves generic logos', () => {
    const photo = resize('https://media.zenfs.com/en/stockstory_922/article-photo.jpg');
    expect(tvNewsPhotoUrl(photo)).toBe(photo);
    const html = `<meta property="og:image" content="${resize(yahooSocialLogo)}"><meta name="twitter:image" content="${photo}">`;
    expect(publisherArticleImage(html, publisher)).toBe(photo);
  });

  it('avoids photographs from related articles in a multi-story publisher graph', () => {
    const other = { '@type': 'NewsArticle', url: '/news/other', image: 'https://images.example/other.jpg' };
    const main = { '@type': 'NewsArticle', mainEntityOfPage: { '@id': publisher + '#page' }, image: original };
    const page = (articles: unknown[]) => `<script type="application/ld+json">${JSON.stringify({ '@graph': articles })}</script>`;
    expect(publisherArticleImage(page([other, main]), publisher + '?from=rss')).toBe(original);
    expect(publisherArticleImage(page([other, { ...main, image: null }]), publisher)).toBeNull();
  });

  it('continues past malformed markup or source logos and keeps only safe article metadata', () => {
    const html = `<script type="application/ld+json">{</script><meta property="og:image" content="${reuters}">`;
    expect(publisherArticleImage(html + `<meta property="og:image" content="${original}">`, publisher)).toBe(original);
    expect(publisherArticleImage(html + '<meta name="twitter:image" content="http://127.0.0.1/image.png">', publisher)).toBeNull();
    expect(publisherArticleImage(`<meta property="og:image" content="${original}">`, 'https://news.google.com/rss/articles/wrapper')).toBeNull();
  });
});
