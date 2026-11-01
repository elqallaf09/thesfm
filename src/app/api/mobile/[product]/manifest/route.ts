import { MOBILE_CONTRACT_VERSION, MOBILE_RESOURCES } from '@/lib/mobile/resourceContract';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ product: string }> }) {
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const { product } = await context.params;
  if (!['finance', 'investor', 'business'].includes(product)) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  return mobileResponse({ ok: true, version: MOBILE_CONTRACT_VERSION, resources: MOBILE_RESOURCES.filter(resource => resource.products.some(value => value === product)) });
}
