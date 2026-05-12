// This file is protected and cannot be modified.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const createSupabaseClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_DATABASE_URL;
  const key = process.env.NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY;

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const supabase: SupabaseClient | null = createSupabaseClient();
export const getSupabase = () => supabase;
