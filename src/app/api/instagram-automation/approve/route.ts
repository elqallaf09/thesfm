import { NextRequest } from 'next/server';
import {
  approvePost,
  automationJson,
  requireInstagramAutomationAdmin,
} from '@/lib/server/instagramAutomation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireInstagramAutomationAdmin(request);
  if (!auth.ok) return automationJson({ ok: false, code: auth.code }, { status: auth.status });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return automationJson({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const result = await approvePost(auth.admin, auth.user, payload);
  if (!result.ok) return automationJson({ ok: false, code: result.code }, { status: result.status });
  return automationJson({ ok: true, post: result.data });
}
