import { NextRequest } from 'next/server';
import {
  automationJson,
  listInstagramAutomation,
  requireInstagramAutomationAdmin,
} from '@/lib/server/instagramAutomation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireInstagramAutomationAdmin(request);
  if (!auth.ok) return automationJson({ ok: false, code: auth.code }, { status: auth.status });

  const result = await listInstagramAutomation(auth.admin);
  if (!result.ok) return automationJson({ ok: false, code: result.code }, { status: result.status });
  return automationJson({ ok: true, ...result.data });
}
