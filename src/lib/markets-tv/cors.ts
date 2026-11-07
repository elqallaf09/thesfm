import { TV_NEWS_FEEDS } from './newsReceiver';

// Only opaque packaged-app origins may call the public/scoped-device APIs.
// Account approvals are intentionally excluded. No cookie credentials allowed.
const PACKAGED_API_PATHS = new Set(['/api/tv/snapshot', '/api/tv/history', '/api/tv/catalog', '/api/tv/instruments', '/api/tv/strips', '/api/tv/news', '/api/tv/pair', '/api/tv/device', '/api/tv/portfolio', '/api/intelligence/latest']);
const NEWS_PATHS = new Set(Object.values(TV_NEWS_FEEDS).map(path => path.split('?')[0]));
export function tvPackagedOrigin(request: Request) {
  const path = new URL(request.url).pathname;
  const read = request.method === 'GET' || request.method === 'OPTIONS' && request.headers.get('access-control-request-method') === 'GET';
  return ['null', 'https://appassets.androidplatform.net'].includes(request.headers.get('origin') || '')
    && (PACKAGED_API_PATHS.has(path) || read && NEWS_PATHS.has(path));
}
export function tvCorsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,x-sfm-tv-token',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
