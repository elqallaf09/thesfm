import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';

export const dynamic = 'force-dynamic';

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function traderApiBaseUrl() {
  return (process.env.THE_SFM_TRADER_API_BASE_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
}

function upstreamUrl(parts: string[], request: NextRequest) {
  const path = parts.map(part => encodeURIComponent(part)).join('/');
  const search = request.nextUrl.search || '';
  return `${traderApiBaseUrl()}/api/${path}${search}`;
}

function proxyHeaders(request: NextRequest) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (!hopByHopHeaders.has(normalized)) headers.set(key, value);
  });
  return headers;
}

async function proxyTraderApi(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
      { status: access.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const params = await context.params;
  const parts = params.path ?? [];
  if (!parts.length) {
    return NextResponse.json({ error: 'missing_trader_api_path' }, { status: 400 });
  }

  try {
    const method = request.method.toUpperCase();
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
    const upstream = await fetch(upstreamUrl(parts, request), {
      method,
      headers: proxyHeaders(request),
      body,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!hopByHopHeaders.has(key.toLowerCase())) responseHeaders.set(key, value);
    });
    responseHeaders.set('Cache-Control', 'no-store');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'trader_api_unavailable',
        message: 'Run the thesfm trader API service or configure THE_SFM_TRADER_API_BASE_URL.',
      },
      { status: 503 },
    );
  }
}

export function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyTraderApi(request, context);
}

export function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyTraderApi(request, context);
}

export function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyTraderApi(request, context);
}

export function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyTraderApi(request, context);
}

export function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyTraderApi(request, context);
}
