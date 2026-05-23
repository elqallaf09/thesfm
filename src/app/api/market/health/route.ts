import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    marketService: 'mock',
    status: 'working',
  });
}
