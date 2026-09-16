import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { ReadinessConfirmationKey } from './readiness';

const ALLOWED = new Set<ReadinessConfirmationKey>(['no_debts', 'no_investments', 'no_business_projects']);

export function normalizeReadinessConfirmationKey(value: unknown): ReadinessConfirmationKey | null {
  const key = String(value ?? '') as ReadinessConfirmationKey;
  return ALLOWED.has(key) ? key : null;
}

export async function loadReadinessConfirmations(userId: string): Promise<ReadinessConfirmationKey[]> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');
  const { data, error } = await admin
    .from('economic_intelligence_confirmations')
    .select('confirmation_key')
    .eq('user_id', userId)
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row: { confirmation_key: unknown }) => normalizeReadinessConfirmationKey(row.confirmation_key)).filter(Boolean) as ReadinessConfirmationKey[];
}

export async function setReadinessConfirmation(userId: string, key: ReadinessConfirmationKey) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');
  const now = new Date().toISOString();
  const { error } = await admin.from('economic_intelligence_confirmations').upsert({
    user_id: userId,
    confirmation_key: key,
    confirmed_at: now,
    updated_at: now,
  }, { onConflict: 'user_id,confirmation_key' });
  if (error) throw error;
}

export async function clearReadinessConfirmation(userId: string, key: ReadinessConfirmationKey) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');
  const { error } = await admin.from('economic_intelligence_confirmations').delete().eq('user_id', userId).eq('confirmation_key', key);
  if (error) throw error;
}
