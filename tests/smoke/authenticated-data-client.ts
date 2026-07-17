import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export const syntheticIncomePrefix = 'e2e-pr34-';

type E2ERole = 'user' | 'admin';

export type AuthenticatedDataClient = {
  client: SupabaseClient;
  user: User;
};

function credentialsFor(role: E2ERole) {
  const prefix = `E2E_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email && !password) return null;
  if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD must be configured together.`);
  return { email, password };
}

export async function createAuthenticatedDataClient(role: E2ERole): Promise<AuthenticatedDataClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const credentials = credentialsFor(role);
  if (!url || !anonKey || !credentials) {
    throw new Error(`Authenticated ${role} data validation is not configured.`);
  }

  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.user || !data.session) {
    throw new Error(`Authenticated ${role} data validation could not establish a session.`);
  }
  return { client, user: data.user };
}

export async function cleanupSyntheticIncomeRecords(role: E2ERole) {
  if (!credentialsFor(role)) return;
  const authenticated = await createAuthenticatedDataClient(role);
  try {
    const { error } = await authenticated.client
      .from('monthly_income_sources')
      .delete()
      .eq('user_id', authenticated.user.id)
      .like('label', `${syntheticIncomePrefix}%`);
    if (error) throw new Error(`Synthetic income cleanup failed for the ${role} validation account.`);
  } finally {
    await authenticated.client.auth.signOut({ scope: 'local' });
  }
}

export async function cleanupAllSyntheticIncomeRecords() {
  await cleanupSyntheticIncomeRecords('user');
  await cleanupSyntheticIncomeRecords('admin');
}
