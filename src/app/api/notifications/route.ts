import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ notifications: [] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  try {
    await request.text();
  } catch {
    // Notifications remain persisted in localStorage if server sync is unavailable.
  }

  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function DELETE() {
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
