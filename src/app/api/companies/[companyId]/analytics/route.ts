import { NextResponse } from 'next/server';
import { getCompanyAnalytics } from '@/lib/server/companyAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { companyId } = await context.params;
  const analytics = await getCompanyAnalytics(companyId);
  return NextResponse.json({ ok: true, ...analytics });
}
