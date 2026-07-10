import { NextRequest } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';
import { SHARIA_METHODOLOGIES } from '@/lib/sharia-research/methodologies';
import { sourceConfigurationStatus } from '@/lib/sharia-research/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'sharia-research-methodologies' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  return privateJson({ ok: true, methodologies: SHARIA_METHODOLOGIES, sources: sourceConfigurationStatus() });
}
