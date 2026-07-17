// Shared browser client. Keep all server-only Supabase keys out of this module.
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, SUPABASE_PUBLIC_CONFIG_ERROR } from '@/integrations/supabase/environment';

const config = getSupabasePublicConfig();

export const supabaseConfigError = config ? null : SUPABASE_PUBLIC_CONFIG_ERROR;

export const supabase = createClient(
  config?.url || 'https://missing-supabase-env.supabase.co',
  config?.key || 'missing-supabase-public-key',
  {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
