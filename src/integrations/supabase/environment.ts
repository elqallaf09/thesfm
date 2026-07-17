export type SupabasePublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

function clean(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function resolveSupabasePublicConfig(environment: SupabasePublicEnvironment) {
  const url = clean(environment.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    ?? clean(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return url && key ? { url, key } : null;
}

export function getSupabasePublicConfig() {
  return resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export const SUPABASE_PUBLIC_CONFIG_ERROR =
  'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY';
