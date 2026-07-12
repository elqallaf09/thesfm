import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function json(body: object, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

export async function POST() {
  return json(
    { success: false, code: 'FLOW_REPLACED', replacement: '/api/auth/login' },
    { status: 410 },
  );
}
