import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const traderPublicRoot = path.join(process.cwd(), 'src', 'trader-app', 'public');
const traderPublicRootWithSeparator = `${traderPublicRoot}${path.sep}`;
const allowLocalTraderQa = process.env.SFM_LOCAL_TRADER_QA === '1' && process.env.VERCEL !== '1';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const publicTraderAssetExtensions = new Set([
  '.css',
  '.js',
  '.json',
  '.webmanifest',
  '.svg',
  '.png',
  '.ico',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.woff',
  '.woff2',
]);

function safeAssetPath(parts: string[] = []) {
  const requested = parts.length ? parts.join('/') : 'index.html';
  const normalized = requested.endsWith('/') ? `${requested}index.html` : requested;
  const resolved = path.resolve(traderPublicRoot, normalized);
  if (resolved !== traderPublicRoot && !resolved.startsWith(traderPublicRootWithSeparator)) return null;
  return resolved;
}

function rewriteTraderTextAsset(content: string) {
  return content
    .replaceAll('href="/manifest.webmanifest"', 'href="/thesfm-trader-own/app/manifest.webmanifest"')
    .replaceAll('href="/styles.css', 'href="/thesfm-trader-own/app/styles.css')
    .replaceAll('href="/desktop-balance.css', 'href="/thesfm-trader-own/app/desktop-balance.css')
    .replaceAll('href="/cinema.css', 'href="/thesfm-trader-own/app/cinema.css')
    .replaceAll('src="/recommendation.js', 'src="/thesfm-trader-own/app/recommendation.js')
    .replaceAll('src="/app.js', 'src="/thesfm-trader-own/app/app.js')
    .replaceAll('src="/detail.js', 'src="/thesfm-trader-own/app/detail.js')
    .replaceAll('src="/provider-markets-diagnostics.js', 'src="/thesfm-trader-own/app/provider-markets-diagnostics.js')
    .replaceAll('href="/the-sfm-trader-icon-', 'href="/thesfm-trader-own/app/the-sfm-trader-icon-')
    .replaceAll('"/the-sfm-trader-icon-', '"/thesfm-trader-own/app/the-sfm-trader-icon-')
    .replaceAll('href="/assets/', 'href="/thesfm-trader-own/app/assets/')
    .replaceAll('src="/assets/', 'src="/thesfm-trader-own/app/assets/')
    .replaceAll('"/assets/', '"/thesfm-trader-own/app/assets/')
    .replaceAll('url("/assets/', 'url("/thesfm-trader-own/app/assets/')
    .replaceAll("url('/assets/", "url('/thesfm-trader-own/app/assets/")
    .replaceAll('url(/assets/', 'url(/thesfm-trader-own/app/assets/')
    .replaceAll('"/detail.html', '"/thesfm-trader-own/app/detail.html')
    .replaceAll('`/detail.html', '`/thesfm-trader-own/app/detail.html')
    .replaceAll('window.location.href = "/?skipIntro=1#view-markets"', 'window.location.href = "/thesfm-trader-own/app/index.html?skipIntro=1#view-markets"')
    .replaceAll('"start_url": "/?app=ios"', '"start_url": "/thesfm-trader-own/app/index.html?app=ios"')
    .replaceAll('"scope": "/"', '"scope": "/thesfm-trader-own/app/"')
    .replaceAll('navigator.serviceWorker.register("/service-worker.js").catch(() => {});', 'return;')
    .replaceAll('navigator.serviceWorker.register("/service-worker.js").catch(() => {', 'return; navigator.serviceWorker.register("/thesfm-trader-own/app/service-worker.js", { scope: "/thesfm-trader-own/app/" }).catch(() => {');
}

export async function GET(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const assetPath = safeAssetPath(params.path);
  if (!assetPath) return new NextResponse('Not found', { status: 404 });
  const ext = path.extname(assetPath).toLowerCase();
  const isPublicAsset = publicTraderAssetExtensions.has(ext);

  if (!isPublicAsset && !allowLocalTraderQa) {
    const { getTraderAccess } = await import('@/lib/server/traderAccess');
    const access = await getTraderAccess();
    if (!access.allowed) {
      return new NextResponse('Forbidden', {
        status: access.reason === 'unauthenticated' ? 401 : 403,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }
  }

  try {
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';
    const file = await readFile(assetPath);
    const cacheControl = isPublicAsset ? 'public, max-age=60, stale-while-revalidate=300' : 'no-store';

    if (['.html', '.js', '.css', '.webmanifest', '.json'].includes(ext)) {
      const rewritten = rewriteTraderTextAsset(file.toString('utf8'));
      return new NextResponse(rewritten, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch {
    return new NextResponse('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}
