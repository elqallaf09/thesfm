import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

const previewUrl = process.env.SUPABASE_PREVIEW_URL?.trim() ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
const productionRef = process.env.SUPABASE_PRODUCTION_REF?.trim() ?? '';
const previewRef = process.env.SUPABASE_PREVIEW_REF?.trim() ?? '';

const credentials = [
  { email: process.env.E2E_USER_EMAIL?.trim() ?? '', password: process.env.E2E_USER_PASSWORD?.trim() ?? '' },
  { email: process.env.E2E_ADMIN_EMAIL?.trim() ?? '', password: process.env.E2E_ADMIN_PASSWORD?.trim() ?? '' },
] as const;

async function signedInClient(email: string, password: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(previewUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw new Error('Preview RLS fixture sign-in failed.');
  return { client, userId: data.user.id };
}

function isSafeIsolatedPreview() {
  if (!previewUrl || !serviceKey || !previewRef || !productionRef) return false;
  if (!/^[a-z0-9]{20}$/.test(previewRef) || !/^[a-z0-9]{20}$/.test(productionRef)) return false;
  if (previewRef === productionRef) return false;
  return previewUrl === `https://${previewRef}.supabase.co`;
}

test.describe('Economic Intelligence live RLS isolation', () => {
  test.skip(!isSafeIsolatedPreview(), 'Runs only against the exact isolated Supabase Preview project.');

  test('two authenticated users cannot cross read, write or update decision data', async () => {
    expect(credentials[0].email).not.toBe(credentials[1].email);
    const first = await signedInClient(credentials[0].email, credentials[0].password);
    const second = await signedInClient(credentials[1].email, credentials[1].password);
    expect(first.userId).not.toBe(second.userId);

    const marker = `rls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let firstDecisionId = '';
    let secondDecisionId = '';

    try {
      const firstInsert = await first.client.from('user_decisions').insert({
        user_id: first.userId,
        decision_title: marker,
        decision_type: 'other',
        amount: 1,
        currency: 'KWD',
        inputs: { preview_rls_probe: marker },
        analysis: {},
        status: 'draft',
      }).select('id').single();
      expect(firstInsert.error).toBeNull();
      firstDecisionId = String(firstInsert.data?.id ?? '');
      expect(firstDecisionId).not.toBe('');

      const secondInsert = await second.client.from('user_decisions').insert({
        user_id: second.userId,
        decision_title: `${marker}-second`,
        decision_type: 'other',
        amount: 1,
        currency: 'KWD',
        inputs: { preview_rls_probe: marker },
        analysis: {},
        status: 'draft',
      }).select('id').single();
      expect(secondInsert.error).toBeNull();
      secondDecisionId = String(secondInsert.data?.id ?? '');
      expect(secondDecisionId).not.toBe('');

      const crossRead = await first.client.from('user_decisions').select('id,user_id').eq('id', secondDecisionId);
      expect(crossRead.error).toBeNull();
      expect(crossRead.data).toEqual([]);

      const crossUpdate = await first.client.from('user_decisions').update({ status: 'completed' }).eq('id', secondDecisionId).select('id');
      expect(crossUpdate.error).toBeNull();
      expect(crossUpdate.data).toEqual([]);

      const forgedInsert = await first.client.from('user_decisions').insert({
        user_id: second.userId,
        decision_title: `${marker}-forged`,
        decision_type: 'other',
        amount: 1,
        currency: 'KWD',
        inputs: { preview_rls_probe: marker },
        analysis: {},
        status: 'draft',
      });
      expect(forgedInsert.error).not.toBeNull();

      const ownRead = await first.client.from('user_decisions').select('id,user_id').eq('id', firstDecisionId).single();
      expect(ownRead.error).toBeNull();
      expect(ownRead.data?.user_id).toBe(first.userId);
    } finally {
      if (firstDecisionId) await first.client.from('user_decisions').delete().eq('id', firstDecisionId);
      if (secondDecisionId) await second.client.from('user_decisions').delete().eq('id', secondDecisionId);
      await first.client.auth.signOut({ scope: 'local' });
      await second.client.auth.signOut({ scope: 'local' });
    }
  });
});
