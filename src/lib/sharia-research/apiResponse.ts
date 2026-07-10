import { NextResponse } from 'next/server';

export function privateJson(data: unknown, init?: ResponseInit) {
  const body = data && typeof data === 'object' && !Array.isArray(data)
    ? {
        ...data,
        ...('success' in data ? {} : 'ok' in data && typeof data.ok === 'boolean' ? { success: data.ok } : {}),
      }
    : data;
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(init?.headers ?? {}),
    },
  });
}

export function structuredError(code: string, message: string, status: number, details?: unknown) {
  return privateJson({ ok: false, success: false, error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}
