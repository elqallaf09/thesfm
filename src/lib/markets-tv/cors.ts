// Only opaque packaged-app origins may call the public/scoped-device APIs.
// Account approvals are intentionally excluded. No cookie credentials allowed.
const PACKAGED_API_PATHS = new Set(['/api/tv/snapshot', '/api/tv/catalog', '/api/tv/strips', '/api/tv/news', '/api/tv/pair', '/api/tv/device', '/api/intelligence/latest']);
export function tvPackagedOrigin(request: Request) {
  return ['null', 'https://appassets.androidplatform.net'].includes(request.headers.get('origin') || '') && PACKAGED_API_PATHS.has(new URL(request.url).pathname);
}
export function tvCorsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,x-sfm-tv-token',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
