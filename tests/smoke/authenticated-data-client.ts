import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

export const syntheticIncomePrefix = 'e2e-pr34-';

type E2ERole = 'user' | 'admin';

export type AuthenticatedDataClient = {
  client: SupabaseClient;
  user: Pick<User, 'id'>;
};

type StoredBrowserSession = {
  accessToken: string;
  userId: string;
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

export async function createAuthenticatedDataClientFromPage(page: Page): Promise<AuthenticatedDataClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error('Authenticated browser data validation is not configured.');

  const stored = await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (!/^sb-[a-z0-9]+-auth-token$/i.test(key)) continue;
      try {
        const value = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
          access_token?: unknown;
          user?: { id?: unknown };
        } | null;
        if (typeof value?.access_token === 'string' && typeof value.user?.id === 'string') {
          return { accessToken: value.access_token, userId: value.user.id } satisfies StoredBrowserSession;
        }
      } catch {
        // Continue looking for the authenticated Supabase session entry.
      }
    }
    return null;
  });
  if (!stored) throw new Error('The browser does not have an authenticated Supabase session.');

  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${stored.accessToken}` },
    },
  });
  const { data: validated, error: validationError } = await client.auth.getUser(stored.accessToken);
  if (validationError || !validated.user || validated.user.id !== stored.userId) {
    throw new Error('The browser Supabase session could not be validated.');
  }
  return { client, user: { id: stored.userId } };
}

export async function cleanupSyntheticIncomeRecordsWithClient(authenticated: AuthenticatedDataClient) {
  const { error } = await authenticated.client
    .from('monthly_income_sources')
    .delete()
    .eq('user_id', authenticated.user.id)
    .like('label', `${syntheticIncomePrefix}%`);
  if (error) throw new Error('Synthetic income cleanup failed for the authenticated browser account.');
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
