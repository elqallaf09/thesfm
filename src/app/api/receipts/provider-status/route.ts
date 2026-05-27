import { NextResponse } from 'next/server';
import { getReceiptProviderStatus } from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getReceiptProviderStatus(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
