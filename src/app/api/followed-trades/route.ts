import { NextResponse } from 'next/server';

const emptyFollowedTradeState = {
  followedTradeKeys: [],
  followedEntries: [],
  followedTradeAlerts: [],
  removedFollowedTradeKeys: [],
};

export async function GET() {
  return NextResponse.json(emptyFollowedTradeState, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  try {
    await request.text();
  } catch {
    // Keep the endpoint best-effort; the browser also stores the state locally.
  }

  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
