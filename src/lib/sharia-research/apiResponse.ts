import { NextResponse } from 'next/server';

export function privateJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(init?.headers ?? {}),
    },
  });
}

export function structuredError(code: string, message: string, status: number, details?: unknown) {
  return privateJson({ ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}
