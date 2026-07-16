import 'server-only';

export type SupabasePrivilegedEnvironment = {
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  DATABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_SERVICE_ROLE_KEY?: string;
};

function clean(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function resolveSupabasePrivilegedConfig(environment: SupabasePrivilegedEnvironment) {
  const url = clean(environment.SUPABASE_URL)
    ?? clean(environment.NEXT_PUBLIC_SUPABASE_URL)
    ?? clean(environment.DATABASE_URL);
  const secretKey = clean(environment.SUPABASE_SECRET_KEY)
    ?? clean(environment.SUPABASE_SERVICE_ROLE_KEY)
    ?? clean(environment.DATABASE_SERVICE_ROLE_KEY);

  return url && secretKey ? { url, secretKey } : null;
}

export function getSupabasePrivilegedConfig() {
  return resolveSupabasePrivilegedConfig({
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_SERVICE_ROLE_KEY: process.env.DATABASE_SERVICE_ROLE_KEY,
  });
}

export const SUPABASE_PRIVILEGED_CONFIG_ERROR =
  'Missing server Supabase configuration: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, and either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY';
