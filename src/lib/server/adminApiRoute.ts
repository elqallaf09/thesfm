import 'server-only';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { AdminPermission } from '@/lib/adminPermissions';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { rateLimitRequest, type RateLimitConfig } from '@/lib/server/rateLimiter';

type AdminAuth = Extract<Awaited<ReturnType<typeof requireAdminApiAccess>>, { ok: true }>;

export type AdminApiContext = {
  request: Request;
  requestId: string;
  auth: AdminAuth;
  json: (payload: unknown, init?: ResponseInit) => NextResponse;
};

export type AdminApiRouteOptions = {
  permission?: AdminPermission;
  rateLimit?: RateLimitConfig;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function requestIdFor(request: Request) {
  const provided = request.headers.get('x-request-id')?.trim() ?? '';
  return REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID();
}

function finalizeAdminResponse(response: Response, requestId: string) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Vary', 'Cookie, Authorization');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Request-ID', requestId);
  return response;
}

function createJsonResponder(requestId: string) {
  return (payload: unknown, init?: ResponseInit) => finalizeAdminResponse(
    NextResponse.json(payload, init),
    requestId,
  ) as NextResponse;
}

export function createAdminApiRoute<TArgs extends unknown[] = []>(
  options: AdminApiRouteOptions,
  handler: (context: AdminApiContext, ...args: TArgs) => Promise<Response> | Response,
) {
  return async function adminApiRoute(request: Request, ...args: TArgs) {
    const requestId = requestIdFor(request);
    const json = createJsonResponder(requestId);

    if (options.rateLimit) {
      const limited = rateLimitRequest(request, options.rateLimit);
      if (limited) return finalizeAdminResponse(limited, requestId);
    }

    let auth: Awaited<ReturnType<typeof requireAdminApiAccess>>;
    try {
      auth = await requireAdminApiAccess(request, options.permission);
    } catch {
      console.error('[admin-api] access check failed safely', { requestId, path: new URL(request.url).pathname });
      return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', requestId }, { status: 503 });
    }

    if (!auth.ok) {
      return json({ ok: false, code: auth.code, requestId }, { status: auth.status });
    }

    try {
      const response = await handler({ request, requestId, auth, json }, ...args);
      return finalizeAdminResponse(response, requestId);
    } catch {
      console.error('[admin-api] handler failed safely', { requestId, path: new URL(request.url).pathname });
      return json({ ok: false, code: 'INTERNAL_ERROR', requestId }, { status: 500 });
    }
  };
}
