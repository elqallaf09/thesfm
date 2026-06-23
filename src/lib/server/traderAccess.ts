import { cookies } from 'next/headers';
import { createServerSupabaseAdmin, getUserFromBearerToken, isAdminEmail } from '@/lib/server/adminAccess';

export type TraderAccessResult = {
  allowed: boolean;
  reason?: 'unauthenticated' | 'not_approved' | 'expired' | 'database_unavailable';
  userId?: string;
  email?: string;
  isAdmin?: boolean;
};

export async function getTraderAccess(): Promise<TraderAccessResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);

  if (!user) return { allowed: false, reason: 'unauthenticated' };
  if (isAdminEmail(user.email)) {
    return { allowed: true, userId: user.id, email: user.email ?? undefined, isAdmin: true };
  }

  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return {
      allowed: false,
      reason: 'database_unavailable',
      userId: user.id,
      email: user.email ?? undefined,
    };
  }

  const { data, error } = await supabase
    .from('trader_access')
    .select('status, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false, reason: 'not_approved', userId: user.id, email: user.email ?? undefined };
  }

  if (data.status !== 'approved') {
    return { allowed: false, reason: 'not_approved', userId: user.id, email: user.email ?? undefined };
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { allowed: false, reason: 'expired', userId: user.id, email: user.email ?? undefined };
  }

  return { allowed: true, userId: user.id, email: user.email ?? undefined, isAdmin: false };
}
