import { handleMobileBusinessDecisions } from '@/lib/server/mobileDecisions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handleMobileBusinessDecisions;
export const POST = handleMobileBusinessDecisions;
export const DELETE = handleMobileBusinessDecisions;
