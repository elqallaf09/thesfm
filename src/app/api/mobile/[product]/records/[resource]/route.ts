import { handleMobileRecords } from '@/lib/server/mobileRecords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ product: string; resource: string }> };
async function handle(request: Request, context: Context) {
  const { product, resource } = await context.params;
  return handleMobileRecords(request, product, resource);
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
