import { tvNewsPhotoPath } from '@/lib/markets-tv/newsPhoto';
import { safeTvUrl } from '@/lib/markets-tv/safeUrl';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { resolvePublisherArticlePhoto } from '@/lib/server/markets-tv/newsPhoto';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

function missingPhoto() {
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimitRequest(request, { prefix: 'tv-news-photo', max: 120 });
  if (limited) return limited;
  const { id } = await params;
  if (!tvNewsPhotoPath(id)) return missingPhoto();

  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) throw new Error('NEWS_STORE_UNAVAILABLE');
    // Only resolve article links that already belong to a published story.
    const { data, error } = await admin.from('market_news_story_clusters')
      .select('articleUrl:story_payload->>originalUrl').eq('id', id).eq('is_published', true).maybeSingle();
    if (error) throw error;
    const articleUrl = typeof data?.articleUrl === 'string' && safeTvUrl(data.articleUrl);
    if (!articleUrl) return missingPhoto();
    const image = await resolvePublisherArticlePhoto(articleUrl);
    if (!image) return missingPhoto();
    return new Response(null, { status: 302, headers: {
      Location: image, 'Cache-Control': 'public, max-age=3600, s-maxage=21600', 'Referrer-Policy': 'no-referrer',
    } });
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
