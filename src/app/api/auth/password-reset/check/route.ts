import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { ok: false, code: 'FLOW_REPLACED', replacement: '/api/auth/password-reset/request' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
